import type { AtlassianCredentials } from '../../credentials.js';
import type { ConfluencePage, ConfluencePageListResponse, ConfluencePageSummary } from './types.js';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ConfluenceAuthError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(
      `Confluence authentication failed (HTTP ${status}). Check ATLASSIAN_USER and ATLASSIAN_API_TOKEN.`,
    );
    this.name = 'ConfluenceAuthError';
    this.status = status;
  }
}

export class ConfluenceRateLimitError extends Error {
  readonly attempts: number;

  constructor(attempts: number) {
    super(`Confluence rate limit (429) persisted after ${attempts} retries. Try again later.`);
    this.name = 'ConfluenceRateLimitError';
    this.attempts = attempts;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ListPagesOptions {
  spaceKey: string;
  /** Results per page. Defaults to 250 (Confluence v2 maximum). */
  limit?: number;
}

export interface GetPageOptions {
  id: string;
}

export interface ConfluenceClient {
  /** Fetches all page summaries for a space, following cursor pagination. */
  listPages(options: ListPagesOptions): Promise<ConfluencePageSummary[]>;
  /** Fetches a single page with its storage XHTML body. */
  getPage(options: GetPageOptions): Promise<ConfluencePage>;
  /**
   * Fetches multiple pages concurrently, respecting the client's concurrency
   * cap. Preserves input order in the returned array.
   */
  getPages(ids: string[]): Promise<ConfluencePage[]>;
}

type DelayFn = (ms: number) => Promise<void>;

export interface ConfluenceClientOptions {
  /** Max simultaneous page body requests. Defaults to 5. */
  concurrency?: number;
  /** Injectable delay function -- pass `() => Promise.resolve()` in tests. */
  delay?: DelayFn;
}

// ---------------------------------------------------------------------------
// Retry config (matches Jira client)
// ---------------------------------------------------------------------------

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];
const MAX_RETRIES = RETRY_DELAYS_MS.length; // 3

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a Confluence REST API v2 client.
 *
 * @param credentials  Atlassian credentials (user + API token).
 * @param options      Optional concurrency cap and delay function.
 */
export function createConfluenceClient(
  credentials: AtlassianCredentials,
  options: ConfluenceClientOptions = {},
): ConfluenceClient {
  const { concurrency = 5, delay = (ms) => new Promise((r) => setTimeout(r, ms)) } = options;

  const authHeader = `Basic ${Buffer.from(`${credentials.user}:${credentials.apiToken}`).toString('base64')}`;

  const headers = {
    Authorization: authHeader,
    Accept: 'application/json',
  };

  // Fetch any URL, retrying on 429 with exponential back-off.
  async function fetchWithRetry<T>(url: string): Promise<T> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(url, { headers });

      if (response.status === 401 || response.status === 403) {
        throw new ConfluenceAuthError(response.status);
      }

      if (response.status === 429) {
        if (attempt >= MAX_RETRIES) {
          throw new ConfluenceRateLimitError(MAX_RETRIES);
        }
        const waitMs = RETRY_DELAYS_MS[attempt] ?? 4_000;
        await delay(waitMs);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Confluence API error: HTTP ${response.status} ${response.statusText}`);
      }

      try {
        return (await response.json()) as T;
      } catch {
        throw new Error(
          `Confluence API returned non-JSON response (HTTP ${response.status}). ` +
            `Check that ATLASSIAN_BASE_URL points to an Atlassian Cloud instance.`,
        );
      }
    }

    // Unreachable: the loop either returns or throws inside, but satisfies TS.
    throw new ConfluenceRateLimitError(MAX_RETRIES);
  }

  const client: ConfluenceClient = {
    async listPages({ spaceKey, limit = 250 }) {
      const allPages: ConfluencePageSummary[] = [];
      let nextUrl: string | null =
        `${credentials.baseUrl}/wiki/api/v2/spaces/${spaceKey}/pages?limit=${limit}`;

      while (nextUrl) {
        const data: ConfluencePageListResponse =
          await fetchWithRetry<ConfluencePageListResponse>(nextUrl);
        allPages.push(...data.results);

        const next: string | undefined = data._links.next;
        nextUrl = next ? resolveUrl(credentials.baseUrl, next) : null;
      }

      return allPages;
    },

    async getPage({ id }) {
      const url = `${credentials.baseUrl}/wiki/api/v2/pages/${id}?body-format=storage`;
      return fetchWithRetry<ConfluencePage>(url);
    },

    async getPages(ids) {
      return runConcurrent(ids, concurrency, (id) => client.getPage({ id }));
    },
  };

  return client;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves `_links.next` (which may be a relative path or a full URL) into
 * an absolute URL using `baseUrl`.
 */
function resolveUrl(baseUrl: string, next: string): string {
  return next.startsWith('http') ? next : `${baseUrl}${next}`;
}

/**
 * Runs `fn` over every item in `items` with at most `limit` concurrent
 * invocations. Preserves input order in the returned array.
 */
async function runConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIdx = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = nextIdx++;
      if (i >= items.length) break;
      const item = items[i];
      if (item === undefined) break; // satisfies noUncheckedIndexedAccess
      results[i] = await fn(item);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

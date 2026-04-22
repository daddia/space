import type { AtlassianCredentials } from '../../credentials.js';
import type { JiraIssue, JiraSearchResponse } from './types.js';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class JiraAuthError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Jira authentication failed (HTTP ${status}). Check ATLASSIAN_USER and ATLASSIAN_API_TOKEN.`);
    this.name = 'JiraAuthError';
    this.status = status;
  }
}

export class JiraRateLimitError extends Error {
  readonly attempts: number;

  constructor(attempts: number) {
    super(`Jira rate limit (429) persisted after ${attempts} retries. Try again later.`);
    this.name = 'JiraRateLimitError';
    this.attempts = attempts;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchOptions {
  jql: string;
  /** Field selector passed to the Jira search API. Defaults to `*all`. */
  fields?: string;
  /** Issues per page. Defaults to 100. */
  pageSize?: number;
}

export interface JiraClient {
  searchIssues(options: SearchOptions): Promise<JiraIssue[]>;
}

type DelayFn = (ms: number) => Promise<void>;

// ---------------------------------------------------------------------------
// Retry config
// ---------------------------------------------------------------------------

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];
const MAX_RETRIES = RETRY_DELAYS_MS.length; // 3

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a Jira REST API v3 client.
 *
 * @param credentials  Atlassian credentials (user + API token).
 * @param delay        Injectable delay function -- pass `() => Promise.resolve()`
 *                     in tests to skip real waiting.
 */
export function createJiraClient(
  credentials: AtlassianCredentials,
  delay: DelayFn = (ms) => new Promise((r) => setTimeout(r, ms)),
): JiraClient {
  const authHeader = `Basic ${Buffer.from(`${credentials.user}:${credentials.apiToken}`).toString('base64')}`;

  const headers = {
    Authorization: authHeader,
    Accept: 'application/json',
  };

  // Fetch a single search page, retrying on 429.
  async function fetchPage(url: string): Promise<JiraSearchResponse> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(url, { headers });

      if (response.status === 401 || response.status === 403) {
        throw new JiraAuthError(response.status);
      }

      if (response.status === 429) {
        if (attempt >= MAX_RETRIES) {
          throw new JiraRateLimitError(MAX_RETRIES);
        }
        const waitMs = RETRY_DELAYS_MS[attempt] ?? 4_000;
        await delay(waitMs);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Jira API error: HTTP ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<JiraSearchResponse>;
    }

    // Unreachable: the loop either returns or throws inside, but satisfies TS.
    throw new JiraRateLimitError(MAX_RETRIES);
  }

  return {
    async searchIssues({ jql, fields = '*all', pageSize = 100 }) {
      const allIssues: JiraIssue[] = [];
      let startAt = 0;
      let total = Infinity;

      while (startAt < total) {
        const url = new URL(`${credentials.baseUrl}/rest/api/3/search`);
        url.searchParams.set('jql', jql);
        url.searchParams.set('fields', fields);
        url.searchParams.set('maxResults', String(pageSize));
        url.searchParams.set('startAt', String(startAt));

        const page = await fetchPage(url.toString());

        allIssues.push(...page.issues);
        total = page.total;

        // Advance by actual issues received; guard against empty page to
        // prevent an infinite loop if the API misbehaves.
        const received = page.issues.length;
        if (received === 0) break;
        startAt += received;
      }

      return allIssues;
    },
  };
}

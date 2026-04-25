import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createConfluenceClient, ConfluenceAuthError, ConfluenceRateLimitError } from './client.js';
import type { ConfluencePage, ConfluencePageListResponse, ConfluencePageSummary } from './types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_URL = 'https://test.atlassian.net';
const LIST_PAGES_URL = `${BASE_URL}/wiki/api/v2/spaces/:spaceKey/pages`;
const GET_PAGE_URL = `${BASE_URL}/wiki/api/v2/pages/:id`;

const credentials = {
  baseUrl: BASE_URL,
  user: 'user@example.com',
  apiToken: 'test-token',
};

const noDelay = () => Promise.resolve();

function makePageSummary(id: string, parentId: string | null = null): ConfluencePageSummary {
  return { id, title: `Page ${id}`, parentId };
}

function makeFullPage(id: string, parentId: string | null = null): ConfluencePage {
  return {
    id,
    title: `Page ${id}`,
    parentId,
    body: { storage: { value: `<p>Content of ${id}</p>`, representation: 'storage' } },
    version: { number: 1 },
  };
}

function makeListResponse(
  summaries: ConfluencePageSummary[],
  nextCursor?: string,
): ConfluencePageListResponse {
  return {
    results: summaries,
    _links: nextCursor
      ? { next: `/wiki/api/v2/spaces/TEST/pages?cursor=${nextCursor}&limit=250` }
      : {},
  };
}

// ---------------------------------------------------------------------------
// MSW server
// ---------------------------------------------------------------------------

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// listPages -- cursor pagination
// ---------------------------------------------------------------------------

describe('listPages -- pagination', () => {
  const page1 = [makePageSummary('1'), makePageSummary('2'), makePageSummary('3')];
  const page2 = [makePageSummary('4'), makePageSummary('5')];

  beforeEach(() => {
    server.use(
      http.get(LIST_PAGES_URL, ({ request }) => {
        const url = new URL(request.url);
        const cursor = url.searchParams.get('cursor');

        if (!cursor) {
          return HttpResponse.json(makeListResponse(page1, 'cursor-abc'));
        }
        return HttpResponse.json(makeListResponse(page2));
      }),
    );
  });

  it('returns all summaries across both pages', async () => {
    const client = createConfluenceClient(credentials, { delay: noDelay });
    const pages = await client.listPages({ spaceKey: 'TEST' });
    expect(pages).toHaveLength(5);
    expect(pages.map((p) => p.id)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('stops when _links.next is absent', async () => {
    server.use(
      http.get(LIST_PAGES_URL, () => HttpResponse.json(makeListResponse([makePageSummary('1')]))),
    );
    const client = createConfluenceClient(credentials, { delay: noDelay });
    const pages = await client.listPages({ spaceKey: 'TEST' });
    expect(pages).toHaveLength(1);
  });

  it('sends the configured limit in the initial request', async () => {
    let capturedLimit: string | null = null;
    server.use(
      http.get(LIST_PAGES_URL, ({ request }) => {
        capturedLimit = new URL(request.url).searchParams.get('limit');
        return HttpResponse.json(makeListResponse([]));
      }),
    );
    const client = createConfluenceClient(credentials, { delay: noDelay });
    await client.listPages({ spaceKey: 'TEST', limit: 50 });
    expect(capturedLimit).toBe('50');
  });

  it('sends a Basic Auth header from the credentials', async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get(LIST_PAGES_URL, ({ request }) => {
        capturedAuth = request.headers.get('Authorization');
        return HttpResponse.json(makeListResponse([]));
      }),
    );
    const expected = `Basic ${Buffer.from(`${credentials.user}:${credentials.apiToken}`).toString('base64')}`;
    const client = createConfluenceClient(credentials, { delay: noDelay });
    await client.listPages({ spaceKey: 'TEST' });
    expect(capturedAuth).toBe(expected);
  });

  it('returns an empty array when the space has no pages', async () => {
    server.use(http.get(LIST_PAGES_URL, () => HttpResponse.json(makeListResponse([]))));
    const client = createConfluenceClient(credentials, { delay: noDelay });
    expect(await client.listPages({ spaceKey: 'TEST' })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getPage -- single page fetch
// ---------------------------------------------------------------------------

describe('getPage', () => {
  it('returns the page including body.storage.value', async () => {
    server.use(
      http.get(GET_PAGE_URL, ({ params }) => {
        return HttpResponse.json(makeFullPage(String(params['id'])));
      }),
    );
    const client = createConfluenceClient(credentials, { delay: noDelay });
    const page = await client.getPage({ id: '42' });
    expect(page.id).toBe('42');
    expect(page.body.storage.value).toBe('<p>Content of 42</p>');
    expect(page.body.storage.representation).toBe('storage');
  });

  it('sends body-format=storage in the request', async () => {
    let capturedFormat: string | null = null;
    server.use(
      http.get(GET_PAGE_URL, ({ request }) => {
        capturedFormat = new URL(request.url).searchParams.get('body-format');
        return HttpResponse.json(makeFullPage('1'));
      }),
    );
    const client = createConfluenceClient(credentials, { delay: noDelay });
    await client.getPage({ id: '1' });
    expect(capturedFormat).toBe('storage');
  });
});

// ---------------------------------------------------------------------------
// getPages -- concurrent batch fetch
// ---------------------------------------------------------------------------

describe('getPages -- concurrency', () => {
  it('returns all pages in input order', async () => {
    server.use(
      http.get(GET_PAGE_URL, ({ params }) => {
        return HttpResponse.json(makeFullPage(String(params['id'])));
      }),
    );
    const client = createConfluenceClient(credentials, { delay: noDelay });
    const pages = await client.getPages(['10', '20', '30', '40', '50']);
    expect(pages.map((p) => p.id)).toEqual(['10', '20', '30', '40', '50']);
  });

  it('returns an empty array for an empty input', async () => {
    const client = createConfluenceClient(credentials, { delay: noDelay });
    expect(await client.getPages([])).toEqual([]);
  });

  it('respects the concurrency cap -- at most N requests in-flight at once', async () => {
    let currentInflight = 0;
    let peakInflight = 0;

    server.use(
      http.get(GET_PAGE_URL, async ({ params }) => {
        currentInflight++;
        peakInflight = Math.max(peakInflight, currentInflight);
        // Small real delay to allow concurrent requests to actually overlap.
        await new Promise<void>((r) => setTimeout(r, 5));
        currentInflight--;
        return HttpResponse.json(makeFullPage(String(params['id'])));
      }),
    );

    const client = createConfluenceClient(credentials, { concurrency: 2 });
    await client.getPages(['1', '2', '3', '4', '5', '6']);

    expect(peakInflight).toBeLessThanOrEqual(2);
    expect(peakInflight).toBeGreaterThanOrEqual(1);
  });

  it('uses the default concurrency of 5 when not specified', async () => {
    let peakInflight = 0;
    let currentInflight = 0;

    server.use(
      http.get(GET_PAGE_URL, async ({ params }) => {
        currentInflight++;
        peakInflight = Math.max(peakInflight, currentInflight);
        await new Promise<void>((r) => setTimeout(r, 5));
        currentInflight--;
        return HttpResponse.json(makeFullPage(String(params['id'])));
      }),
    );

    // 10 pages, default concurrency 5 -- peak should be ≤ 5
    const client = createConfluenceClient(credentials);
    await client.getPages(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(peakInflight).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// 429 retry -- matches Jira client back-off
// ---------------------------------------------------------------------------

describe('429 retry', () => {
  it('retries on 429 and succeeds on the third attempt', async () => {
    let callCount = 0;
    const delayValues: number[] = [];

    server.use(
      http.get(GET_PAGE_URL, () => {
        callCount++;
        if (callCount <= 2) return new HttpResponse(null, { status: 429 });
        return HttpResponse.json(makeFullPage('1'));
      }),
    );

    const trackingDelay = (ms: number) => {
      delayValues.push(ms);
      return Promise.resolve();
    };

    const client = createConfluenceClient(credentials, { delay: trackingDelay });
    const page = await client.getPage({ id: '1' });

    expect(page.id).toBe('1');
    expect(callCount).toBe(3);
    expect(delayValues).toEqual([1_000, 2_000]);
  });

  it('uses exponential back-off delays: 1s, 2s, 4s', async () => {
    let callCount = 0;
    const delayValues: number[] = [];

    server.use(
      http.get(GET_PAGE_URL, () => {
        callCount++;
        if (callCount <= 3) return new HttpResponse(null, { status: 429 });
        return HttpResponse.json(makeFullPage('1'));
      }),
    );

    const trackingDelay = (ms: number) => {
      delayValues.push(ms);
      return Promise.resolve();
    };

    const client = createConfluenceClient(credentials, { delay: trackingDelay });
    await client.getPage({ id: '1' });
    expect(delayValues).toEqual([1_000, 2_000, 4_000]);
  });

  it('throws ConfluenceRateLimitError after 3 retries all return 429', async () => {
    server.use(http.get(GET_PAGE_URL, () => new HttpResponse(null, { status: 429 })));
    const client = createConfluenceClient(credentials, { delay: noDelay });
    await expect(client.getPage({ id: '1' })).rejects.toThrow(ConfluenceRateLimitError);
  });

  it('also retries on 429 from listPages', async () => {
    let callCount = 0;
    server.use(
      http.get(LIST_PAGES_URL, () => {
        callCount++;
        if (callCount === 1) return new HttpResponse(null, { status: 429 });
        return HttpResponse.json(makeListResponse([makePageSummary('1')]));
      }),
    );
    const client = createConfluenceClient(credentials, { delay: noDelay });
    const pages = await client.listPages({ spaceKey: 'TEST' });
    expect(pages).toHaveLength(1);
    expect(callCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Auth errors -- no retry
// ---------------------------------------------------------------------------

describe('auth errors', () => {
  it('throws ConfluenceAuthError on 401', async () => {
    server.use(http.get(GET_PAGE_URL, () => new HttpResponse(null, { status: 401 })));
    const client = createConfluenceClient(credentials, { delay: noDelay });
    await expect(client.getPage({ id: '1' })).rejects.toThrow(ConfluenceAuthError);
  });

  it('throws ConfluenceAuthError on 403', async () => {
    server.use(http.get(GET_PAGE_URL, () => new HttpResponse(null, { status: 403 })));
    const client = createConfluenceClient(credentials, { delay: noDelay });
    await expect(client.getPage({ id: '1' })).rejects.toThrow(ConfluenceAuthError);
  });

  it('ConfluenceAuthError records the HTTP status', async () => {
    server.use(http.get(GET_PAGE_URL, () => new HttpResponse(null, { status: 403 })));
    const client = createConfluenceClient(credentials, { delay: noDelay });
    try {
      await client.getPage({ id: '1' });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfluenceAuthError);
      expect((err as ConfluenceAuthError).status).toBe(403);
    }
  });

  it('does not retry on 401 -- only one HTTP request made', async () => {
    let callCount = 0;
    server.use(
      http.get(GET_PAGE_URL, () => {
        callCount++;
        return new HttpResponse(null, { status: 401 });
      }),
    );
    const client = createConfluenceClient(credentials, { delay: noDelay });
    await client.getPage({ id: '1' }).catch(() => {});
    expect(callCount).toBe(1);
  });
});

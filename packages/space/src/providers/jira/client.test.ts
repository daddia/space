import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createJiraClient, JiraAuthError, JiraRateLimitError } from './client.js';
import type { JiraIssue, JiraSearchResponse } from './types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_URL = 'https://test.atlassian.net';
const SEARCH_URL = `${BASE_URL}/rest/api/3/search`;

const credentials = {
  baseUrl: BASE_URL,
  user: 'user@example.com',
  apiToken: 'test-token',
};

const noDelay = () => Promise.resolve();

function makeIssue(key: string): JiraIssue {
  return {
    id: key.replace('-', ''),
    key,
    self: `${BASE_URL}/rest/api/3/issue/${key}`,
    fields: { summary: `Summary of ${key}`, issuetype: { name: 'Story' } },
  };
}

function makePage(
  issues: JiraIssue[],
  startAt: number,
  total: number,
  maxResults = 50,
): JiraSearchResponse {
  return { startAt, maxResults, total, issues };
}

// ---------------------------------------------------------------------------
// MSW server
// ---------------------------------------------------------------------------

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Helper: build a Basic Auth header for the test credentials
// ---------------------------------------------------------------------------

const expectedAuth = `Basic ${Buffer.from(`${credentials.user}:${credentials.apiToken}`).toString('base64')}`;

// ---------------------------------------------------------------------------
// Pagination -- 3 pages of 50 issues each (150 total)
// ---------------------------------------------------------------------------

describe('searchIssues -- pagination', () => {
  const page1Issues = Array.from({ length: 50 }, (_, i) => makeIssue(`TEST-${i + 1}`));
  const page2Issues = Array.from({ length: 50 }, (_, i) => makeIssue(`TEST-${i + 51}`));
  const page3Issues = Array.from({ length: 50 }, (_, i) => makeIssue(`TEST-${i + 101}`));

  // Register before each test because afterEach at the outer level calls
  // resetHandlers(), which removes all runtime handlers.
  beforeEach(() => {
    server.use(
      http.get(SEARCH_URL, ({ request }) => {
        const url = new URL(request.url);
        const startAt = parseInt(url.searchParams.get('startAt') ?? '0', 10);

        if (startAt === 0) return HttpResponse.json(makePage(page1Issues, 0, 150));
        if (startAt === 50) return HttpResponse.json(makePage(page2Issues, 50, 150));
        return HttpResponse.json(makePage(page3Issues, 100, 150));
      }),
    );
  });

  it('returns all 150 issues across 3 pages', async () => {
    const client = createJiraClient(credentials, noDelay);
    const issues = await client.searchIssues({
      jql: 'project = TEST ORDER BY key ASC',
      pageSize: 50,
    });
    expect(issues).toHaveLength(150);
  });

  it('returns issues in page order (page 1 first, page 3 last)', async () => {
    const client = createJiraClient(credentials, noDelay);
    const issues = await client.searchIssues({
      jql: 'project = TEST ORDER BY key ASC',
      pageSize: 50,
    });
    expect(issues[0]?.key).toBe('TEST-1');
    expect(issues[149]?.key).toBe('TEST-150');
  });

  it('sends the configured JQL in the request', async () => {
    let capturedJql: string | null = null;

    server.use(
      http.get(SEARCH_URL, ({ request }) => {
        const url = new URL(request.url);
        capturedJql = url.searchParams.get('jql');
        return HttpResponse.json(makePage([makeIssue('TEST-1')], 0, 1));
      }),
    );

    const client = createJiraClient(credentials, noDelay);
    await client.searchIssues({ jql: 'project = STORE ORDER BY key ASC' });

    expect(capturedJql).toBe('project = STORE ORDER BY key ASC');
  });

  it('sends a Basic Auth header constructed from the credentials', async () => {
    let capturedAuth: string | null = null;

    server.use(
      http.get(SEARCH_URL, ({ request }) => {
        capturedAuth = request.headers.get('Authorization');
        return HttpResponse.json(makePage([makeIssue('TEST-1')], 0, 1));
      }),
    );

    const client = createJiraClient(credentials, noDelay);
    await client.searchIssues({ jql: 'project = TEST' });

    expect(capturedAuth).toBe(expectedAuth);
  });
});

// ---------------------------------------------------------------------------
// 429 retry -- succeeds on the third attempt
// ---------------------------------------------------------------------------

describe('searchIssues -- 429 retry', () => {
  it('retries on 429 and succeeds on the third attempt', async () => {
    let callCount = 0;
    const delayValues: number[] = [];

    server.use(
      http.get(SEARCH_URL, () => {
        callCount++;
        if (callCount <= 2) {
          return new HttpResponse(null, { status: 429 });
        }
        return HttpResponse.json(makePage([makeIssue('TEST-1')], 0, 1));
      }),
    );

    const trackingDelay = (ms: number) => {
      delayValues.push(ms);
      return Promise.resolve();
    };

    const client = createJiraClient(credentials, trackingDelay);
    const issues = await client.searchIssues({ jql: 'project = TEST' });

    expect(issues).toHaveLength(1);
    expect(callCount).toBe(3);
    expect(delayValues).toEqual([1_000, 2_000]);
  });

  it('uses exponential back-off delays: 1s, 2s, 4s', async () => {
    let callCount = 0;
    const delayValues: number[] = [];

    server.use(
      http.get(SEARCH_URL, () => {
        callCount++;
        // Succeed on the 4th attempt (after 3 retries with delays 1s, 2s, 4s)
        if (callCount <= 3) {
          return new HttpResponse(null, { status: 429 });
        }
        return HttpResponse.json(makePage([makeIssue('TEST-1')], 0, 1));
      }),
    );

    const trackingDelay = (ms: number) => {
      delayValues.push(ms);
      return Promise.resolve();
    };

    const client = createJiraClient(credentials, trackingDelay);
    await client.searchIssues({ jql: 'project = TEST' });

    expect(delayValues).toEqual([1_000, 2_000, 4_000]);
  });

  it('throws JiraRateLimitError after 3 retries all return 429', async () => {
    server.use(http.get(SEARCH_URL, () => new HttpResponse(null, { status: 429 })));

    const client = createJiraClient(credentials, noDelay);
    await expect(client.searchIssues({ jql: 'project = TEST' })).rejects.toThrow(
      JiraRateLimitError,
    );
  });

  it('JiraRateLimitError records the number of retries attempted', async () => {
    server.use(http.get(SEARCH_URL, () => new HttpResponse(null, { status: 429 })));

    const client = createJiraClient(credentials, noDelay);
    try {
      await client.searchIssues({ jql: 'project = TEST' });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(JiraRateLimitError);
      expect((err as JiraRateLimitError).attempts).toBe(3);
    }
  });
});

// ---------------------------------------------------------------------------
// Auth errors -- no retry
// ---------------------------------------------------------------------------

describe('searchIssues -- auth errors', () => {
  it('throws JiraAuthError on 401', async () => {
    server.use(http.get(SEARCH_URL, () => new HttpResponse(null, { status: 401 })));

    const client = createJiraClient(credentials, noDelay);
    await expect(client.searchIssues({ jql: 'project = TEST' })).rejects.toThrow(JiraAuthError);
  });

  it('throws JiraAuthError on 403', async () => {
    server.use(http.get(SEARCH_URL, () => new HttpResponse(null, { status: 403 })));

    const client = createJiraClient(credentials, noDelay);
    await expect(client.searchIssues({ jql: 'project = TEST' })).rejects.toThrow(JiraAuthError);
  });

  it('JiraAuthError records the HTTP status', async () => {
    server.use(http.get(SEARCH_URL, () => new HttpResponse(null, { status: 401 })));

    const client = createJiraClient(credentials, noDelay);
    try {
      await client.searchIssues({ jql: 'project = TEST' });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(JiraAuthError);
      expect((err as JiraAuthError).status).toBe(401);
    }
  });

  it('does not retry on 401 -- only one HTTP request is made', async () => {
    let callCount = 0;

    server.use(
      http.get(SEARCH_URL, () => {
        callCount++;
        return new HttpResponse(null, { status: 401 });
      }),
    );

    const client = createJiraClient(credentials, noDelay);
    await client.searchIssues({ jql: 'project = TEST' }).catch(() => {});

    expect(callCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('searchIssues -- edge cases', () => {
  it('returns an empty array when total is 0', async () => {
    server.use(http.get(SEARCH_URL, () => HttpResponse.json(makePage([], 0, 0))));

    const client = createJiraClient(credentials, noDelay);
    const issues = await client.searchIssues({ jql: 'project = TEST' });
    expect(issues).toEqual([]);
  });

  it('returns issues from a single partial page (fewer than pageSize)', async () => {
    const threeIssues = [makeIssue('TEST-1'), makeIssue('TEST-2'), makeIssue('TEST-3')];

    server.use(http.get(SEARCH_URL, () => HttpResponse.json(makePage(threeIssues, 0, 3, 100))));

    const client = createJiraClient(credentials, noDelay);
    const issues = await client.searchIssues({ jql: 'project = TEST', pageSize: 100 });
    expect(issues).toHaveLength(3);
  });
});

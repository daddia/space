import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { sortByKey, extractLinks, syncJira } from './sync.js';
import type { JiraIssue, JiraIssueLink } from './types.js';
import type { JiraClient } from './client.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeIssue(key: string, typeName: string, links: unknown[] = []): JiraIssue {
  return {
    id: key.replace('-', ''),
    key,
    self: `https://example.atlassian.net/rest/api/3/issue/${key}`,
    fields: {
      summary: `Summary ${key}`,
      issuetype: { id: '1', name: typeName },
      issuelinks: links,
    },
  };
}

function makeLink(id: string): JiraIssueLink {
  return {
    id,
    self: `https://example.atlassian.net/rest/api/3/issueLink/${id}`,
    type: { id: '1', name: 'Relates', inward: 'relates to', outward: 'relates to', self: '' },
  };
}

const credentials = {
  baseUrl: 'https://example.atlassian.net',
  user: 'user@example.com',
  apiToken: 'token',
};

const sourceConfig = {
  provider: 'jira' as const,
  project: 'STORE',
};

// ---------------------------------------------------------------------------
// sortByKey
// ---------------------------------------------------------------------------

describe('sortByKey', () => {
  it('sorts issues by the numeric part of the key ascending', () => {
    const issues = [
      makeIssue('STORE-10', 'Story'),
      makeIssue('STORE-2', 'Story'),
      makeIssue('STORE-1', 'Story'),
      makeIssue('STORE-9', 'Story'),
    ];
    const sorted = sortByKey(issues);
    expect(sorted.map((i) => i.key)).toEqual(['STORE-1', 'STORE-2', 'STORE-9', 'STORE-10']);
  });

  it('handles a single issue', () => {
    const issues = [makeIssue('STORE-1', 'Story')];
    expect(sortByKey(issues)).toHaveLength(1);
  });

  it('returns an empty array when given an empty array', () => {
    expect(sortByKey([])).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const issues = [makeIssue('STORE-2', 'Story'), makeIssue('STORE-1', 'Story')];
    const original = [...issues];
    sortByKey(issues);
    expect(issues).toEqual(original);
  });

  it('sorts across a hundred issues correctly (natural order, not lexicographic)', () => {
    const shuffled = Array.from({ length: 100 }, (_, i) =>
      makeIssue(`STORE-${i + 1}`, 'Story'),
    ).reverse();
    const sorted = sortByKey(shuffled);
    expect(sorted[0]?.key).toBe('STORE-1');
    expect(sorted[99]?.key).toBe('STORE-100');
  });
});

// ---------------------------------------------------------------------------
// extractLinks
// ---------------------------------------------------------------------------

describe('extractLinks', () => {
  it('extracts links from all issues into a flat array', () => {
    const issues = [
      makeIssue('STORE-1', 'Story', [makeLink('L1')]),
      makeIssue('STORE-2', 'Story', [makeLink('L2'), makeLink('L3')]),
    ];
    const links = extractLinks(issues);
    expect(links).toHaveLength(3);
    expect(links.map((l) => l.id)).toEqual(['L1', 'L2', 'L3']);
  });

  it('deduplicates links that appear in multiple issues', () => {
    const sharedLink = makeLink('L1');
    const issues = [
      makeIssue('STORE-1', 'Story', [sharedLink]),
      makeIssue('STORE-2', 'Story', [sharedLink, makeLink('L2')]),
    ];
    const links = extractLinks(issues);
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.id)).toEqual(['L1', 'L2']);
  });

  it('returns an empty array when no issues have links', () => {
    const issues = [makeIssue('STORE-1', 'Story'), makeIssue('STORE-2', 'Bug')];
    expect(extractLinks(issues)).toEqual([]);
  });

  it('skips issues where issuelinks is absent or not an array', () => {
    const issue: JiraIssue = {
      id: '1',
      key: 'STORE-1',
      self: '',
      fields: { summary: 'no links field' },
    };
    expect(extractLinks([issue])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// syncJira -- integration with real filesystem
// ---------------------------------------------------------------------------

describe('syncJira', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(path.join(tmpdir(), 'space-sync-jira-'));
    // Provide the minimal .space/config so loadConfig would work if called
    await mkdir(path.join(workspaceRoot, '.space'), { recursive: true });
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  function makeClient(issues: JiraIssue[]): JiraClient {
    return { searchIssues: async () => issues };
  }

  async function readJson<T>(file: string): Promise<T> {
    const content = await readFile(
      path.join(workspaceRoot, '.space', 'sources', 'jira', file),
      'utf-8',
    );
    return JSON.parse(content) as T;
  }

  it('writes issues.json sorted by key ascending', async () => {
    const issues = [
      makeIssue('STORE-10', 'Story'),
      makeIssue('STORE-2', 'Bug'),
      makeIssue('STORE-1', 'Epic'),
    ];
    await syncJira({ sourceConfig, credentials, workspaceRoot, client: makeClient(issues) });

    const written = await readJson<JiraIssue[]>('issues.json');
    expect(written.map((i) => i.key)).toEqual(['STORE-1', 'STORE-2', 'STORE-10']);
  });

  it('writes epics.json with only Epic issues', async () => {
    const issues = [
      makeIssue('STORE-1', 'Epic'),
      makeIssue('STORE-2', 'Story'),
      makeIssue('STORE-3', 'Epic'),
      makeIssue('STORE-4', 'Bug'),
    ];
    await syncJira({ sourceConfig, credentials, workspaceRoot, client: makeClient(issues) });

    const epics = await readJson<JiraIssue[]>('epics.json');
    expect(epics).toHaveLength(2);
    expect(epics.map((e) => e.key)).toEqual(['STORE-1', 'STORE-3']);
  });

  it('writes links.json with deduped links', async () => {
    const link = makeLink('L1');
    const issues = [
      makeIssue('STORE-1', 'Story', [link, makeLink('L2')]),
      makeIssue('STORE-2', 'Story', [link]),
    ];
    await syncJira({ sourceConfig, credentials, workspaceRoot, client: makeClient(issues) });

    const links = await readJson<JiraIssueLink[]>('links.json');
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.id)).toEqual(['L1', 'L2']);
  });

  it('writes meta.json with correct counts', async () => {
    const issues = [
      makeIssue('STORE-1', 'Epic'),
      makeIssue('STORE-2', 'Story'),
      makeIssue('STORE-3', 'Story'),
      makeIssue('STORE-4', 'Bug'),
      makeIssue('STORE-5', 'Sub-task'),
    ];
    await syncJira({ sourceConfig, credentials, workspaceRoot, client: makeClient(issues) });

    const meta = await readJson<{
      counts: Record<string, number>;
      project: string;
      jql: string;
      sync_at: string;
    }>('meta.json');
    expect(meta.counts['total']).toBe(5);
    expect(meta.counts['epics']).toBe(1);
    expect(meta.counts['stories']).toBe(2);
    expect(meta.counts['bugs']).toBe(1);
    expect(meta.project).toBe('STORE');
    expect(meta.jql).toBe('project = STORE ORDER BY key ASC');
    expect(meta.sync_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('writes all four output files', async () => {
    await syncJira({
      sourceConfig,
      credentials,
      workspaceRoot,
      client: makeClient([makeIssue('STORE-1', 'Story')]),
    });

    const dir = path.join(workspaceRoot, '.space', 'sources', 'jira');
    expect(existsSync(path.join(dir, 'issues.json'))).toBe(true);
    expect(existsSync(path.join(dir, 'epics.json'))).toBe(true);
    expect(existsSync(path.join(dir, 'links.json'))).toBe(true);
    expect(existsSync(path.join(dir, 'meta.json'))).toBe(true);
  });

  it('leaves no .tmp sibling after a successful sync', async () => {
    await syncJira({
      sourceConfig,
      credentials,
      workspaceRoot,
      client: makeClient([makeIssue('STORE-1', 'Story')]),
    });

    const tmp = path.join(workspaceRoot, '.space', 'sources', 'jira.tmp');
    expect(existsSync(tmp)).toBe(false);
  });

  it('leaves existing mirror intact when the client throws', async () => {
    // Seed existing mirror
    const existingDir = path.join(workspaceRoot, '.space', 'sources', 'jira');
    await mkdir(existingDir, { recursive: true });
    await writeFile(path.join(existingDir, 'issues.json'), '"original"');

    const failingClient: JiraClient = {
      searchIssues: async () => {
        throw new Error('network error');
      },
    };

    await expect(
      syncJira({ sourceConfig, credentials, workspaceRoot, client: failingClient }),
    ).rejects.toThrow('network error');

    // The original content must be untouched
    const content = await readFile(path.join(existingDir, 'issues.json'), 'utf-8');
    expect(content).toBe('"original"');
  });
});

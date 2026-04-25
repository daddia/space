import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AtlassianCredentials } from '../../credentials.js';
import { atomicWrite } from '../../fs.js';
import { createJiraClient, type JiraClient } from './client.js';
import type { JiraIssue, JiraIssueLink, JiraSyncMeta } from './types.js';
import type { JiraSourceConfig } from '../../config.js';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface SyncJiraOptions {
  sourceConfig: JiraSourceConfig;
  credentials: AtlassianCredentials;
  workspaceRoot: string;
  /** Injectable Jira client -- created from credentials when omitted. */
  client?: JiraClient;
}

/**
 * Fetches all issues for the configured Jira project and writes four files
 * atomically into `.space/sources/jira/`:
 *   - issues.json  -- all issues, sorted by key ascending
 *   - epics.json   -- subset where issuetype.name === 'Epic'
 *   - links.json   -- deduped issue links from all issues
 *   - meta.json    -- sync timestamp, project, JQL, and counts
 */
export async function syncJira(options: SyncJiraOptions): Promise<void> {
  const { sourceConfig, credentials, workspaceRoot } = options;
  const client = options.client ?? createJiraClient(credentials);

  const jql = `project = ${sourceConfig.project} ORDER BY key ASC`;
  const destDir = path.join(workspaceRoot, '.space', 'sources', 'jira');

  const raw = await client.searchIssues({ jql });
  const sorted = sortByKey(raw);
  const epics = sorted.filter((i) => getIssueTypeName(i) === 'Epic');
  const links = extractLinks(sorted);
  const meta = buildMeta({ issues: sorted, project: sourceConfig.project, jql });

  await atomicWrite(destDir, async (tmp) => {
    await writeFile(path.join(tmp, 'issues.json'), JSON.stringify(sorted, null, 2));
    await writeFile(path.join(tmp, 'epics.json'), JSON.stringify(epics, null, 2));
    await writeFile(path.join(tmp, 'links.json'), JSON.stringify(links, null, 2));
    await writeFile(path.join(tmp, 'meta.json'), JSON.stringify(meta, null, 2));
  });
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Sorts issues by key in natural ascending order (PROJ-1, PROJ-2, ..., PROJ-10).
 * Falls back to lexicographic sort for keys that don't match the standard format.
 */
export function sortByKey(issues: JiraIssue[]): JiraIssue[] {
  return [...issues].sort((a, b) => {
    const ka = parseIssueKey(a.key);
    const kb = parseIssueKey(b.key);
    if (!ka || !kb) return a.key.localeCompare(b.key);
    if (ka.prefix !== kb.prefix) return ka.prefix.localeCompare(kb.prefix);
    return ka.num - kb.num;
  });
}

/**
 * Extracts and deduplicates all issuelinks from a list of issues.
 * Deduplication is by link `id`.
 */
export function extractLinks(issues: JiraIssue[]): JiraIssueLink[] {
  const seen = new Set<string>();
  const links: JiraIssueLink[] = [];

  for (const issue of issues) {
    const raw = issue.fields['issuelinks'];
    if (!Array.isArray(raw)) continue;

    for (const item of raw) {
      if (!isIssueLinkShape(item)) continue;
      if (!seen.has(item.id)) {
        seen.add(item.id);
        links.push(item as JiraIssueLink);
      }
    }
  }

  return links;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildMeta(options: { issues: JiraIssue[]; project: string; jql: string }): JiraSyncMeta {
  const { issues, project, jql } = options;
  let epics = 0;
  let stories = 0;
  let bugs = 0;

  for (const issue of issues) {
    const name = getIssueTypeName(issue);
    if (name === 'Epic') epics++;
    else if (name === 'Story') stories++;
    else if (name === 'Bug') bugs++;
  }

  return {
    sync_at: new Date().toISOString(),
    project,
    jql,
    counts: { total: issues.length, epics, stories, bugs },
  };
}

function parseIssueKey(key: string): { prefix: string; num: number } | null {
  const m = /^([A-Z][A-Z0-9]*)-(\d+)$/.exec(key);
  if (!m) return null;
  const prefix = m[1];
  const numStr = m[2];
  if (!prefix || !numStr) return null;
  return { prefix, num: parseInt(numStr, 10) };
}

function getIssueTypeName(issue: JiraIssue): string | undefined {
  const it = issue.fields['issuetype'];
  if (it !== null && typeof it === 'object' && 'name' in it) {
    const name = (it as { name: unknown }).name;
    return typeof name === 'string' ? name : undefined;
  }
  return undefined;
}

function isIssueLinkShape(value: unknown): value is { id: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as { id: unknown }).id === 'string'
  );
}

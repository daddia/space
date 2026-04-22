import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JiraSourceConfig {
  provider: 'jira';
  base_url?: string;
  project: string;
}

export interface ConfluenceSourceConfig {
  provider: 'confluence';
  space: string;
  url?: string;
}

export interface WorkspaceConfig {
  project: {
    name: string;
    key: string;
  };
  sources?: {
    issues?: JiraSourceConfig;
    docs?: ConfluenceSourceConfig;
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class WorkspaceNotFoundError extends Error {
  constructor() {
    super('Run from inside a space workspace (.space/config not found)');
    this.name = 'WorkspaceNotFoundError';
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

// ---------------------------------------------------------------------------
// Workspace root detection
// ---------------------------------------------------------------------------

/**
 * Walks up the directory tree from `startDir` looking for `.space/config`.
 * Throws WorkspaceNotFoundError if the filesystem root is reached without
 * finding one. Callers (CLI commands) are responsible for catching and
 * printing the error before calling process.exit(1).
 */
export function findWorkspaceRoot(startDir: string = process.cwd()): string {
  let dir = path.resolve(startDir);

  for (;;) {
    if (existsSync(path.join(dir, '.space', 'config'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new WorkspaceNotFoundError();
    }
    dir = parent;
  }
}

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

/**
 * Reads and validates `.space/config` from the given workspace root.
 * Extra keys in the config file are allowed (forward-compatible).
 */
export function loadConfig(workspaceRoot: string): WorkspaceConfig {
  const configPath = path.join(workspaceRoot, '.space', 'config');

  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf-8');
  } catch {
    throw new ConfigError(`Cannot read ${configPath}`);
  }

  const data = parse(raw) as unknown;
  return validateConfig(data);
}

// ---------------------------------------------------------------------------
// Validation (internal)
// ---------------------------------------------------------------------------

function validateConfig(data: unknown): WorkspaceConfig {
  if (!isObject(data)) {
    throw new ConfigError('.space/config must be a YAML mapping');
  }

  const project = data['project'];
  if (!isObject(project)) {
    throw new ConfigError('.space/config: "project" is required');
  }
  if (typeof project['name'] !== 'string' || project['name'].trim() === '') {
    throw new ConfigError('.space/config: project.name must be a non-empty string');
  }
  if (typeof project['key'] !== 'string' || project['key'].trim() === '') {
    throw new ConfigError('.space/config: project.key must be a non-empty string');
  }

  const sources = data['sources'];
  if (sources !== undefined) {
    if (!isObject(sources)) {
      throw new ConfigError('.space/config: "sources" must be a YAML mapping');
    }

    const issues = sources['issues'];
    if (issues !== undefined) {
      if (!isObject(issues)) {
        throw new ConfigError('.space/config: sources.issues must be a YAML mapping');
      }
      if (issues['provider'] !== 'jira') {
        throw new ConfigError('.space/config: sources.issues.provider must be "jira"');
      }
      if (typeof issues['project'] !== 'string' || issues['project'].trim() === '') {
        throw new ConfigError(
          '.space/config: sources.issues.project must be a non-empty string',
        );
      }
    }

    const docs = sources['docs'];
    if (docs !== undefined) {
      if (!isObject(docs)) {
        throw new ConfigError('.space/config: sources.docs must be a YAML mapping');
      }
      if (docs['provider'] !== 'confluence') {
        throw new ConfigError('.space/config: sources.docs.provider must be "confluence"');
      }
      if (typeof docs['space'] !== 'string' || docs['space'].trim() === '') {
        throw new ConfigError(
          '.space/config: sources.docs.space must be a non-empty string',
        );
      }
    }
  }

  // All required fields validated above; extra keys pass through silently
  // (forward-compatible). The double cast is intentional: YAML parse returns
  // unknown and TS cannot infer structural compatibility at compile time.
  return data as unknown as WorkspaceConfig;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

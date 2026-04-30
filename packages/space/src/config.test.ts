import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { findWorkspaceRoot, loadConfig, WorkspaceNotFoundError, ConfigError } from './config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeWorkspace(base: string, configContent: string): Promise<string> {
  await mkdir(path.join(base, '.space'), { recursive: true });
  await writeFile(path.join(base, '.space', 'config'), configContent);
  return base;
}

const MINIMAL_CONFIG = `
project:
  name: Test Project
  key: TEST
`.trim();

const FULL_CONFIG = `
project:
  name: Storefront
  key: STORE

sources:
  issues:
    provider: jira
    project: STORE
    base_url: https://example.atlassian.net

  docs:
    provider: confluence
    space: STOREFRONT
    url: https://example.atlassian.net/wiki/spaces/STOREFRONT
`.trim();

// ---------------------------------------------------------------------------
// findWorkspaceRoot
// ---------------------------------------------------------------------------

describe('findWorkspaceRoot', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'space-config-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns the directory containing .space/config', async () => {
    await makeWorkspace(tempDir, MINIMAL_CONFIG);
    expect(findWorkspaceRoot(tempDir)).toBe(tempDir);
  });

  it('walks up from a subdirectory to find .space/config', async () => {
    await makeWorkspace(tempDir, MINIMAL_CONFIG);
    const subDir = path.join(tempDir, 'domain', 'cart');
    await mkdir(subDir, { recursive: true });
    expect(findWorkspaceRoot(subDir)).toBe(tempDir);
  });

  it('throws WorkspaceNotFoundError when no .space/config exists', () => {
    // Use a temp dir that has no .space/config in its ancestry up to tmpdir
    expect(() => findWorkspaceRoot(tempDir)).toThrow(WorkspaceNotFoundError);
  });

  it('throws with the canonical message', () => {
    expect(() => findWorkspaceRoot(tempDir)).toThrow(
      'Run from inside a space workspace (.space/config not found)',
    );
  });
});

// ---------------------------------------------------------------------------
// loadConfig -- valid configs
// ---------------------------------------------------------------------------

describe('loadConfig -- valid configs', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'space-config-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('parses a minimal config with project name and key', async () => {
    await makeWorkspace(tempDir, MINIMAL_CONFIG);
    const config = loadConfig(tempDir);
    expect(config.project.name).toBe('Test Project');
    expect(config.project.key).toBe('TEST');
    expect(config.sources).toBeUndefined();
  });

  it('parses a full config with Jira and Confluence sources', async () => {
    await makeWorkspace(tempDir, FULL_CONFIG);
    const config = loadConfig(tempDir);
    expect(config.project.name).toBe('Storefront');
    expect(config.sources?.issues?.provider).toBe('jira');
    expect(config.sources?.issues?.project).toBe('STORE');
    expect(config.sources?.docs?.provider).toBe('confluence');
    expect(config.sources?.docs?.space).toBe('STOREFRONT');
  });

  it('allows extra top-level keys (forward-compatible)', async () => {
    await makeWorkspace(
      tempDir,
      `
project:
  name: Test
  key: TEST
workspace:
  path: .
  work: work/{TASK_ID}/
crew:
  providers:
    anthropic:
      api_key_env: ANTHROPIC_API_KEY
`.trim(),
    );
    const config = loadConfig(tempDir);
    expect(config.project.name).toBe('Test');
  });

  it('allows Jira source without optional base_url', async () => {
    await makeWorkspace(
      tempDir,
      `
project:
  name: Test
  key: TEST
sources:
  issues:
    provider: jira
    project: TEST
`.trim(),
    );
    const config = loadConfig(tempDir);
    expect(config.sources?.issues?.base_url).toBeUndefined();
    expect(config.sources?.issues?.project).toBe('TEST');
  });
});

// ---------------------------------------------------------------------------
// loadConfig -- validation errors
// ---------------------------------------------------------------------------

describe('loadConfig -- validation errors', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'space-config-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('throws ConfigError when config is not a YAML mapping', async () => {
    await makeWorkspace(tempDir, '- just a list');
    expect(() => loadConfig(tempDir)).toThrow(ConfigError);
  });

  it('throws ConfigError when project block is missing', async () => {
    await makeWorkspace(tempDir, 'name: orphan');
    expect(() => loadConfig(tempDir)).toThrow(ConfigError);
    expect(() => loadConfig(tempDir)).toThrow('"project" is required');
  });

  it('throws ConfigError when project.name is missing', async () => {
    await makeWorkspace(tempDir, 'project:\n  key: TEST');
    expect(() => loadConfig(tempDir)).toThrow('project.name');
  });

  it('throws ConfigError when project.key is missing', async () => {
    await makeWorkspace(tempDir, 'project:\n  name: Test');
    expect(() => loadConfig(tempDir)).toThrow('project.key');
  });

  it('throws ConfigError when sources.issues.provider is not "jira"', async () => {
    await makeWorkspace(
      tempDir,
      `
project:
  name: T
  key: T
sources:
  issues:
    provider: github
    project: T
`.trim(),
    );
    expect(() => loadConfig(tempDir)).toThrow('provider must be "jira"');
  });

  it('throws ConfigError when sources.issues.project is missing', async () => {
    await makeWorkspace(
      tempDir,
      `
project:
  name: T
  key: T
sources:
  issues:
    provider: jira
`.trim(),
    );
    expect(() => loadConfig(tempDir)).toThrow('sources.issues.project');
  });

  it('throws ConfigError when sources.docs.provider is not "confluence"', async () => {
    await makeWorkspace(
      tempDir,
      `
project:
  name: T
  key: T
sources:
  docs:
    provider: notion
    space: T
`.trim(),
    );
    expect(() => loadConfig(tempDir)).toThrow('provider must be "confluence"');
  });

  it('throws ConfigError when sources.docs.space is missing', async () => {
    await makeWorkspace(
      tempDir,
      `
project:
  name: T
  key: T
sources:
  docs:
    provider: confluence
`.trim(),
    );
    expect(() => loadConfig(tempDir)).toThrow('sources.docs.space');
  });

  it('throws ConfigError when the file does not exist', async () => {
    await mkdir(path.join(tempDir, '.space'), { recursive: true });
    // no config file written
    expect(() => loadConfig(tempDir)).toThrow(ConfigError);
  });

  it('throws ConfigError when workspace.layout is an unrecognised value', async () => {
    await makeWorkspace(
      tempDir,
      `
project:
  name: T
  key: T
workspace:
  layout: monorepo
`.trim(),
    );
    expect(() => loadConfig(tempDir)).toThrow(ConfigError);
    expect(() => loadConfig(tempDir)).toThrow('workspace.layout must be "sibling" or "embedded"');
  });

  it('throws ConfigError when the workspace block is not a mapping', async () => {
    await makeWorkspace(
      tempDir,
      `
project:
  name: T
  key: T
workspace: embedded
`.trim(),
    );
    expect(() => loadConfig(tempDir)).toThrow(ConfigError);
    expect(() => loadConfig(tempDir)).toThrow('"workspace" must be a YAML mapping');
  });
});

// ---------------------------------------------------------------------------
// loadConfig -- workspace.layout field
// ---------------------------------------------------------------------------

describe('loadConfig -- workspace.layout', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'space-config-layout-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('accepts workspace.layout: embedded', async () => {
    await makeWorkspace(tempDir, `project:\n  name: T\n  key: T\nworkspace:\n  layout: embedded`);
    const config = loadConfig(tempDir);
    expect(config.workspace?.layout).toBe('embedded');
  });

  it('accepts workspace.layout: sibling', async () => {
    await makeWorkspace(tempDir, `project:\n  name: T\n  key: T\nworkspace:\n  layout: sibling`);
    const config = loadConfig(tempDir);
    expect(config.workspace?.layout).toBe('sibling');
  });

  it('accepts a config without workspace.layout (undefined is valid)', async () => {
    await makeWorkspace(tempDir, `project:\n  name: T\n  key: T`);
    const config = loadConfig(tempDir);
    expect(config.workspace).toBeUndefined();
  });

  it('accepts workspace block without layout key', async () => {
    await makeWorkspace(
      tempDir,
      `project:\n  name: T\n  key: T\nworkspace:\n  path: .\n  work: work/{TASK_ID}/`,
    );
    const config = loadConfig(tempDir);
    expect(config.workspace?.layout).toBeUndefined();
  });
});

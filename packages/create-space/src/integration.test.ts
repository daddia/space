import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSpace } from './create-space.js';
import type { SpaceConfig } from './config.js';

function makeConfig(targetDir: string, overrides: Partial<SpaceConfig> = {}): SpaceConfig {
  return {
    projectName: 'acme',
    projectKey: 'ACME',
    project: 'acme',
    targetDir,
    sourceProvider: 'github',
    llmProvider: 'anthropic',
    packageManager: 'npm',
    skipInstall: true,
    disableGit: true,
    ...overrides,
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function captureLogs(): string[] {
  const logs: string[] = [];
  vi.mocked(console.log).mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(' '));
  });
  return logs;
}

describe('createSpace integration: three workspace states', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'cs-int-'));
    targetDir = join(tempBase, 'acme-space');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempBase, { recursive: true, force: true });
  });

  it('greenfield: creates all template files and prints Initialized empty status line', async () => {
    const logs = captureLogs();

    await createSpace(makeConfig(targetDir), { yes: true });

    // Representative set of files from the workspace template
    const expectedFiles = [
      '.space/config',
      'package.json',
      'AGENTS.md',
      'README.md',
      'product/backlog.md',
      'product/roadmap.md',
      'product/prd.md',
      'architecture/solution.md',
      'architecture/decisions/register.md',
      'docs/conventions/definition-of-done.md',
      'docs/conventions/definition-of-ready.md',
    ];

    for (const file of expectedFiles) {
      expect(await fileExists(join(targetDir, file)), `expected ${file} to exist`).toBe(true);
    }

    expect(logs.join('\n')).toContain('Initialized empty Space workspace in');
  });

  it('partial: preserves existing file, adds .space/config, prints Reinitialized status line', async () => {
    await mkdir(targetDir, { recursive: true });
    const originalReadme = '# My existing README\n\nContent added before init.\n';
    await writeFile(join(targetDir, 'README.md'), originalReadme);

    const logs = captureLogs();

    await createSpace(makeConfig(targetDir), { yes: true });

    // Existing file must be unchanged
    const readmeContent = await readFile(join(targetDir, 'README.md'), 'utf-8');
    expect(readmeContent).toBe(originalReadme);

    // New template file must have been written
    expect(await fileExists(join(targetDir, '.space', 'config'))).toBe(true);

    expect(logs.join('\n')).toContain('Reinitialized existing Space workspace in');
  });

  it('complete: preserves authored Markdown and retains existing config values on reinit', async () => {
    // Greenfield run produces the initial workspace
    await createSpace(makeConfig(targetDir), { yes: true });

    // Simulate authored content added after initial scaffold
    const customDod = '# Definition of Done (customised)\n\n- All tests pass\n- Reviewed\n';
    await writeFile(join(targetDir, 'docs/conventions/definition-of-done.md'), customDod);

    // Record the config value written by the greenfield run
    const configBefore = await readFile(join(targetDir, '.space/config'), 'utf-8');
    expect(configBefore).toContain('acme'); // project.name set by greenfield run

    const logs = captureLogs();

    await createSpace(makeConfig(targetDir), { yes: true });

    // Authored Markdown must not be overwritten
    const dodAfter = await readFile(join(targetDir, 'docs/conventions/definition-of-done.md'), 'utf-8');
    expect(dodAfter).toBe(customDod);

    // Config must preserve the original project.name value
    const configAfter = await readFile(join(targetDir, '.space/config'), 'utf-8');
    expect(configAfter).toContain('acme');

    expect(logs.join('\n')).toContain('Reinitialized existing Space workspace in');
  });
});

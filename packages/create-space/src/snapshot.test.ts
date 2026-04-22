import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, readdir, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSpace } from './create-space.js';
import type { SpaceConfig } from './config.js';

function makeConfig(targetDir: string): SpaceConfig {
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
  };
}

async function collectTree(dir: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths: string[] = [];

  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = join(dir, entry.name);
    const stat = await lstat(fullPath);

    if (stat.isSymbolicLink()) {
      paths.push(`${rel} -> symlink`);
    } else if (entry.isDirectory()) {
      paths.push(...(await collectTree(fullPath, rel)));
    } else {
      paths.push(rel);
    }
  }

  return paths.sort();
}

describe('template output snapshots', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'cs-snap-'));
    targetDir = join(tempBase, 'acme-space');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempBase, { recursive: true, force: true });
  });

  it('matches the expected file tree', async () => {
    await createSpace(makeConfig(targetDir), { yes: true });
    const tree = await collectTree(targetDir);
    expect(tree).toMatchSnapshot();
  });

  it('matches the expected AGENTS.md content', async () => {
    await createSpace(makeConfig(targetDir), { yes: true });
    const content = await readFile(join(targetDir, 'AGENTS.md'), 'utf-8');
    expect(content).toMatchSnapshot();
  });

  it('matches the expected .space/config content', async () => {
    await createSpace(makeConfig(targetDir), { yes: true });
    const content = await readFile(join(targetDir, '.space/config'), 'utf-8');
    expect(content).toMatchSnapshot();
  });
});

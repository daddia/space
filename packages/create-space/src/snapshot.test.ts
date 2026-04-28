import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, readdir, lstat, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSpace } from './create-space.js';
import type { SpaceConfig } from './config.js';
import { trySkillsSync } from './helpers/skills-sync.js';

vi.mock('./helpers/skills-sync.js', () => ({
  trySkillsSync: vi.fn().mockReturnValue(true),
}));

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

describe('reinit path', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'cs-reinit-'));
    targetDir = join(tempBase, 'acme-space');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempBase, { recursive: true, force: true });
  });

  it('does not overwrite authored content on complete workspace reinit', async () => {
    await createSpace(makeConfig(targetDir), { yes: true });

    const customContent = '# Custom DoD\n\nCustom content added after initial scaffold.\n';
    await writeFile(join(targetDir, 'docs/conventions/definition-of-done.md'), customContent);

    await createSpace(makeConfig(targetDir), { yes: true });

    const content = await readFile(
      join(targetDir, 'docs/conventions/definition-of-done.md'),
      'utf-8',
    );
    expect(content).toBe(customContent);
  });

  it('prints Reinitialized status line on complete workspace reinit', async () => {
    await createSpace(makeConfig(targetDir), { yes: true });

    const logs: string[] = [];
    vi.mocked(console.log).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });

    await createSpace(makeConfig(targetDir), { yes: true });

    expect(logs.join('\n')).toContain('Reinitialized existing Space workspace (sibling) in');
  });

  it('prints Initialized status line on greenfield run', async () => {
    const logs: string[] = [];
    vi.mocked(console.log).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });

    await createSpace(makeConfig(targetDir), { yes: true });

    expect(logs.join('\n')).toContain('Initialized empty Space workspace (sibling) in');
  });

  it('ensures @daddia/space in devDependencies on partial workspace reinit (does not add @daddia/skills)', async () => {
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, 'README.md'), '# Partial workspace\n');
    await writeFile(
      join(targetDir, 'package.json'),
      JSON.stringify({ private: true }, null, 2) + '\n',
    );

    await createSpace(makeConfig(targetDir), { yes: true });

    const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf-8')) as {
      devDependencies?: Record<string, string>;
    };
    expect(pkg.devDependencies).toHaveProperty('@daddia/space');
    expect(pkg.devDependencies).not.toHaveProperty('@daddia/skills');
  });

  it('matches the reinit file tree snapshot', async () => {
    await createSpace(makeConfig(targetDir), { yes: true });
    await writeFile(join(targetDir, 'docs/conventions/definition-of-done.md'), '# Custom DoD\n');
    await createSpace(makeConfig(targetDir), { yes: true });
    const tree = await collectTree(targetDir);
    expect(tree).toMatchSnapshot();
  });
});

describe('template output snapshots (with profile)', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'cs-snap-profile-'));
    targetDir = join(tempBase, 'acme-space');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(trySkillsSync).mockReturnValue(true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempBase, { recursive: true, force: true });
  });

  it('file tree includes .space/profile.yaml when profile is set', async () => {
    const config: SpaceConfig = { ...makeConfig(targetDir), profile: 'minimal' };
    await createSpace(config, { yes: true });
    const tree = await collectTree(targetDir);
    expect(tree).toMatchSnapshot();
    expect(tree).toContain('.space/profile.yaml');
  });

  it('matches the expected .space/profile.yaml content', async () => {
    const config: SpaceConfig = { ...makeConfig(targetDir), profile: 'minimal' };
    await createSpace(config, { yes: true });
    const content = await readFile(join(targetDir, '.space/profile.yaml'), 'utf-8');
    expect(content).toMatchSnapshot();
  });

  it('file tree does not include .space/profile.yaml when profile is omitted', async () => {
    await createSpace(makeConfig(targetDir), { yes: true });
    const tree = await collectTree(targetDir);
    expect(tree).toMatchSnapshot();
    expect(tree).not.toContain('.space/profile.yaml');
  });
});

describe('profile flag wiring', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'cs-profile-'));
    targetDir = join(tempBase, 'acme-space');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(trySkillsSync).mockClear();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempBase, { recursive: true, force: true });
  });

  it('calls trySkillsSync with the profile name when profile is set', async () => {
    const config: SpaceConfig = { ...makeConfig(targetDir), profile: 'minimal' };
    await createSpace(config, { yes: true });
    expect(vi.mocked(trySkillsSync)).toHaveBeenCalledWith(
      expect.stringContaining('acme-space'),
      'minimal',
    );
  });

  it('calls trySkillsSync without a profile argument when profile is undefined', async () => {
    await createSpace(makeConfig(targetDir), { yes: true });
    const calls = vi.mocked(trySkillsSync).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[calls.length - 1]![1]).toBeUndefined();
  });
});

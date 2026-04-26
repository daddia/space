import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runInit, detectPackageManager } from './init.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('runInit', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'space-init-'));
    targetDir = join(tempBase, 'my-workspace');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempBase, { recursive: true, force: true });
  });

  describe('greenfield workspace', () => {
    it('creates .space/config from the template', async () => {
      await runInit({ targetDir, skipInstall: true });

      const content = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
      expect(content).toContain('project:');
    });

    it('creates package.json with @daddia/space and @daddia/skills devDependencies', async () => {
      await runInit({ targetDir, skipInstall: true });

      const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf-8')) as {
        devDependencies?: Record<string, string>;
      };
      expect(pkg.devDependencies).toHaveProperty('@daddia/space');
      expect(pkg.devDependencies).toHaveProperty('@daddia/skills');
    });

    it('creates agent symlinks', async () => {
      await runInit({ targetDir, skipInstall: true });

      const cursorSkills = await lstat(join(targetDir, '.cursor', 'skills'));
      const claudeSkills = await lstat(join(targetDir, '.claude', 'skills'));
      expect(cursorSkills.isSymbolicLink()).toBe(true);
      expect(claudeSkills.isSymbolicLink()).toBe(true);
    });

    it('prints Initialized empty status line', async () => {
      const logs: string[] = [];
      vi.mocked(console.log).mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      });

      await runInit({ targetDir, skipInstall: true });

      expect(logs.join('\n')).toContain('Initialized empty Space workspace in');
    });
  });

  describe('complete workspace reinit', () => {
    beforeEach(async () => {
      await runInit({ targetDir, skipInstall: true });
    });

    it('does not overwrite authored content', async () => {
      const customContent = '# Custom authored content\n';
      await mkdir(join(targetDir, 'docs'), { recursive: true });
      await writeFile(join(targetDir, 'docs', 'notes.md'), customContent);

      await runInit({ targetDir, skipInstall: true });

      const content = await readFile(join(targetDir, 'docs', 'notes.md'), 'utf-8');
      expect(content).toBe(customContent);
    });

    it('does not change .space/config when no new template keys are present', async () => {
      const before = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
      await runInit({ targetDir, skipInstall: true });
      const after = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
      expect(after).toBe(before);
    });

    it('preserves comments in .space/config when no new keys are merged', async () => {
      const configWithComments =
        'project:\n  name: my-project\n  key: MY-PROJECT\n# Important comment\nworkspace:\n  path: .\n  work: work/{TASK_ID}/\n  runs: runs/\n';
      await writeFile(join(targetDir, '.space', 'config'), configWithComments);

      // Template has project + workspace keys, so no append happens.
      await runInit({ targetDir, skipInstall: true });

      const after = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
      expect(after).toBe(configWithComments);
      expect(after).toContain('# Important comment');
    });

    it('preserves comments in .space/config when a new key is merged', async () => {
      // Existing config is missing the template's `workspace` key but has
      // an inline comment that must survive when the workspace block is
      // appended by the merge.
      const configWithCommentAndMissingKey =
        'project:\n  name: my-project\n  key: MY-PROJECT\n# Do-not-touch comment\n';
      await writeFile(join(targetDir, '.space', 'config'), configWithCommentAndMissingKey);

      await runInit({ targetDir, skipInstall: true });

      const after = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
      // Comment must survive verbatim
      expect(after).toContain('# Do-not-touch comment');
      // Existing keys must remain unchanged
      expect(after).toContain('name: my-project');
      // The missing template key must have been appended
      expect(after).toContain('workspace:');
      // The original prefix must appear at the start of the file
      expect(after.startsWith(configWithCommentAndMissingKey)).toBe(true);
    });

    it('prints Reinitialized existing status line', async () => {
      const logs: string[] = [];
      vi.mocked(console.log).mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      });

      await runInit({ targetDir, skipInstall: true });

      expect(logs.join('\n')).toContain('Reinitialized existing Space workspace in');
    });

    it('recreates agent symlinks idempotently', async () => {
      await runInit({ targetDir, skipInstall: true });

      const cursorSkills = await lstat(join(targetDir, '.cursor', 'skills'));
      expect(cursorSkills.isSymbolicLink()).toBe(true);
    });
  });

  describe('partial workspace reinit', () => {
    beforeEach(async () => {
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'README.md'), '# My workspace\n');
    });

    it('creates .space/config', async () => {
      await runInit({ targetDir, skipInstall: true });

      const content = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
      expect(content).toContain('project:');
    });

    it('ensures @daddia/space and @daddia/skills in devDependencies', async () => {
      await writeFile(
        join(targetDir, 'package.json'),
        JSON.stringify({ private: true }, null, 2) + '\n',
      );

      await runInit({ targetDir, skipInstall: true });

      const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf-8')) as {
        devDependencies?: Record<string, string>;
      };
      expect(pkg.devDependencies).toHaveProperty('@daddia/space');
      expect(pkg.devDependencies).toHaveProperty('@daddia/skills');
    });

    it('prints Reinitialized existing status line', async () => {
      const logs: string[] = [];
      vi.mocked(console.log).mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      });

      await runInit({ targetDir, skipInstall: true });

      expect(logs.join('\n')).toContain('Reinitialized existing Space workspace in');
    });
  });

  describe('independence from @daddia/create-space', () => {
    it('no source file in packages/space imports from @daddia/create-space', async () => {
      const srcDir = join(__dirname, '..');
      const entries = await readdir(srcDir, true);

      for (const entry of entries) {
        if (!entry.endsWith('.ts') || entry.endsWith('.test.ts')) continue;
        const content = await readFile(join(srcDir, entry), 'utf-8');
        expect(content, `${entry} must not import @daddia/create-space`).not.toContain(
          '@daddia/create-space',
        );
      }
    });
  });
});

describe('space init integration: three workspace states', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'space-init-int-'));
    targetDir = join(tempBase, 'my-workspace');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempBase, { recursive: true, force: true });
  });

  it('greenfield: creates .space/config, injects deps, creates symlinks, prints Initialized empty', async () => {
    const logs: string[] = [];
    vi.mocked(console.log).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });

    await runInit({ targetDir, skipInstall: true });

    const config = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
    expect(config).toContain('project:');

    const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf-8')) as {
      devDependencies?: Record<string, string>;
    };
    expect(pkg.devDependencies).toHaveProperty('@daddia/space');
    expect(pkg.devDependencies).toHaveProperty('@daddia/skills');

    const cursorStat = await lstat(join(targetDir, '.cursor', 'skills'));
    expect(cursorStat.isSymbolicLink()).toBe(true);

    expect(logs.join('\n')).toContain('Initialized empty Space workspace in');
  });

  it('partial: preserves existing file, adds .space/config, injects deps, prints Reinitialized existing', async () => {
    await mkdir(targetDir, { recursive: true });
    const originalContent = '# Existing README\n\nPre-existing content.\n';
    await writeFile(join(targetDir, 'README.md'), originalContent);

    const logs: string[] = [];
    vi.mocked(console.log).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });

    await runInit({ targetDir, skipInstall: true });

    const readme = await readFile(join(targetDir, 'README.md'), 'utf-8');
    expect(readme).toBe(originalContent);

    const config = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
    expect(config).toContain('project:');

    const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf-8')) as {
      devDependencies?: Record<string, string>;
    };
    expect(pkg.devDependencies).toHaveProperty('@daddia/space');
    expect(pkg.devDependencies).toHaveProperty('@daddia/skills');

    expect(logs.join('\n')).toContain('Reinitialized existing Space workspace in');
  });

  it('complete: preserves authored content, retains config values, prints Reinitialized existing', async () => {
    await runInit({ targetDir, skipInstall: true });

    const configBefore = await readFile(join(targetDir, '.space', 'config'), 'utf-8');

    await mkdir(join(targetDir, 'docs'), { recursive: true });
    const authoredContent = '# Custom notes\n\nAdded after init.\n';
    await writeFile(join(targetDir, 'docs', 'notes.md'), authoredContent);

    const logs: string[] = [];
    vi.mocked(console.log).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });

    await runInit({ targetDir, skipInstall: true });

    const notes = await readFile(join(targetDir, 'docs', 'notes.md'), 'utf-8');
    expect(notes).toBe(authoredContent);

    const configAfter = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
    expect(configAfter).toBe(configBefore);

    expect(logs.join('\n')).toContain('Reinitialized existing Space workspace in');
  });
});

async function readdir(dir: string, recursive: boolean): Promise<string[]> {
  const { readdir: fsReaddir } = await import('node:fs/promises');
  const entries = await fsReaddir(dir, { recursive, withFileTypes: false });
  return entries as unknown as string[];
}

describe('detectPackageManager', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'pm-detect-'));
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('returns npm when no lockfile is present', async () => {
    expect(await detectPackageManager(tempBase)).toBe('npm');
  });

  it('returns pnpm when pnpm-lock.yaml is present', async () => {
    await writeFile(join(tempBase, 'pnpm-lock.yaml'), '');
    expect(await detectPackageManager(tempBase)).toBe('pnpm');
  });

  it('returns yarn when yarn.lock is present', async () => {
    await writeFile(join(tempBase, 'yarn.lock'), '');
    expect(await detectPackageManager(tempBase)).toBe('yarn');
  });

  it('returns bun when bun.lockb is present', async () => {
    await writeFile(join(tempBase, 'bun.lockb'), '');
    expect(await detectPackageManager(tempBase)).toBe('bun');
  });

  it('returns npm when package-lock.json is present', async () => {
    await writeFile(join(tempBase, 'package-lock.json'), '{}');
    expect(await detectPackageManager(tempBase)).toBe('npm');
  });

  it('prefers pnpm over npm when both lockfiles are present', async () => {
    await writeFile(join(tempBase, 'pnpm-lock.yaml'), '');
    await writeFile(join(tempBase, 'package-lock.json'), '{}');
    expect(await detectPackageManager(tempBase)).toBe('pnpm');
  });

  it('prefers yarn over npm when both lockfiles are present', async () => {
    await writeFile(join(tempBase, 'yarn.lock'), '');
    await writeFile(join(tempBase, 'package-lock.json'), '{}');
    expect(await detectPackageManager(tempBase)).toBe('yarn');
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runInit } from './init.js';

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

    it('creates package.json with @tpw/space and @tpw/skills devDependencies', async () => {
      await runInit({ targetDir, skipInstall: true });

      const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf-8')) as {
        devDependencies?: Record<string, string>;
      };
      expect(pkg.devDependencies).toHaveProperty('@tpw/space');
      expect(pkg.devDependencies).toHaveProperty('@tpw/skills');
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

    it('ensures @tpw/space and @tpw/skills in devDependencies', async () => {
      await writeFile(
        join(targetDir, 'package.json'),
        JSON.stringify({ private: true }, null, 2) + '\n',
      );

      await runInit({ targetDir, skipInstall: true });

      const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf-8')) as {
        devDependencies?: Record<string, string>;
      };
      expect(pkg.devDependencies).toHaveProperty('@tpw/space');
      expect(pkg.devDependencies).toHaveProperty('@tpw/skills');
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

  describe('independence from @tpw/create-space', () => {
    it('no source file in packages/space imports from @tpw/create-space', async () => {
      const srcDir = join(__dirname, '..');
      const entries = await readdir(srcDir, true);

      for (const entry of entries) {
        if (!entry.endsWith('.ts') || entry.endsWith('.test.ts')) continue;
        const content = await readFile(join(srcDir, entry), 'utf-8');
        expect(content, `${entry} must not import @tpw/create-space`).not.toContain(
          '@tpw/create-space',
        );
      }
    });
  });
});

async function readdir(dir: string, recursive: boolean): Promise<string[]> {
  const { readdir: fsReaddir } = await import('node:fs/promises');
  const entries = await fsReaddir(dir, { recursive, withFileTypes: false });
  return entries as unknown as string[];
}

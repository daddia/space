import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { isFolderEmpty } from './is-folder-empty.js';

describe('isFolderEmpty', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cs-empty-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns true for a truly empty directory', async () => {
    expect(await isFolderEmpty(tempDir, 'test')).toBe(true);
  });

  it('returns true when directory contains only .DS_Store', async () => {
    await writeFile(join(tempDir, '.DS_Store'), '');
    expect(await isFolderEmpty(tempDir, 'test')).toBe(true);
  });

  it('returns true when directory contains only .git', async () => {
    await mkdir(join(tempDir, '.git'));
    expect(await isFolderEmpty(tempDir, 'test')).toBe(true);
  });

  it('returns true when directory contains only .gitignore', async () => {
    await writeFile(join(tempDir, '.gitignore'), 'node_modules/\n');
    expect(await isFolderEmpty(tempDir, 'test')).toBe(true);
  });

  it('returns true when directory contains only Thumbs.db', async () => {
    await writeFile(join(tempDir, 'Thumbs.db'), '');
    expect(await isFolderEmpty(tempDir, 'test')).toBe(true);
  });

  it('returns true when directory contains only .idea', async () => {
    await mkdir(join(tempDir, '.idea'));
    expect(await isFolderEmpty(tempDir, 'test')).toBe(true);
  });

  it('returns true when directory contains only .vscode', async () => {
    await mkdir(join(tempDir, '.vscode'));
    expect(await isFolderEmpty(tempDir, 'test')).toBe(true);
  });

  it('returns true when directory contains only LICENSE', async () => {
    await writeFile(join(tempDir, 'LICENSE'), 'MIT');
    expect(await isFolderEmpty(tempDir, 'test')).toBe(true);
  });

  it('returns true when directory contains only npm-debug.log', async () => {
    await writeFile(join(tempDir, 'npm-debug.log'), '');
    expect(await isFolderEmpty(tempDir, 'test')).toBe(true);
  });

  it('returns true when directory contains a .iml file', async () => {
    await writeFile(join(tempDir, 'project.iml'), '<module />');
    expect(await isFolderEmpty(tempDir, 'test')).toBe(true);
  });

  it('returns true when directory contains multiple ignorable files', async () => {
    await writeFile(join(tempDir, '.DS_Store'), '');
    await writeFile(join(tempDir, '.gitignore'), '');
    await mkdir(join(tempDir, '.git'));
    await writeFile(join(tempDir, 'LICENSE'), 'MIT');
    expect(await isFolderEmpty(tempDir, 'test')).toBe(true);
  });

  it('returns false when directory contains a real file', async () => {
    await writeFile(join(tempDir, 'README.md'), '# Hello');
    expect(await isFolderEmpty(tempDir, 'test')).toBe(false);
  });

  it('returns false when directory contains a non-ignorable directory', async () => {
    await mkdir(join(tempDir, 'src'));
    expect(await isFolderEmpty(tempDir, 'test')).toBe(false);
  });

  it('returns false when directory has a mix of ignorable and real files', async () => {
    await writeFile(join(tempDir, '.DS_Store'), '');
    await writeFile(join(tempDir, 'index.ts'), 'export {}');
    expect(await isFolderEmpty(tempDir, 'test')).toBe(false);
  });

  it('prints conflict list when not empty', async () => {
    await writeFile(join(tempDir, 'package.json'), '{}');
    await mkdir(join(tempDir, 'src'));
    await isFolderEmpty(tempDir, 'my-project');

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('my-project'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('package.json'));
  });
});

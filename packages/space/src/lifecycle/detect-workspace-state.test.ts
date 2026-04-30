import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectWorkspaceState, readExistingLayout } from './detect-workspace-state.js';

describe('detectWorkspaceState', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'dws-'));
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('returns greenfield for a path that does not exist', async () => {
    expect(await detectWorkspaceState(join(tempBase, 'nonexistent'))).toBe('greenfield');
  });

  it('returns greenfield for an empty directory', async () => {
    const dir = join(tempBase, 'empty');
    await mkdir(dir);
    expect(await detectWorkspaceState(dir)).toBe('greenfield');
  });

  it('returns partial for a directory with files but no .space/config', async () => {
    const dir = join(tempBase, 'partial');
    await mkdir(dir);
    await writeFile(join(dir, 'README.md'), '# hello');
    expect(await detectWorkspaceState(dir)).toBe('partial');
  });

  it('returns complete for a directory containing a readable .space/config', async () => {
    const dir = join(tempBase, 'complete');
    await mkdir(join(dir, '.space'), { recursive: true });
    await writeFile(join(dir, '.space', 'config'), 'project:\n  name: test\n');
    expect(await detectWorkspaceState(dir)).toBe('complete');
  });
});

describe('readExistingLayout', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'rel-'));
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('returns undefined when .space/config does not exist', async () => {
    expect(await readExistingLayout(tempBase)).toBeUndefined();
  });

  it('returns undefined when .space/config has no workspace.layout key', async () => {
    await mkdir(join(tempBase, '.space'), { recursive: true });
    await writeFile(join(tempBase, '.space', 'config'), 'project:\n  name: test\n');
    expect(await readExistingLayout(tempBase)).toBeUndefined();
  });

  it('returns "embedded" when workspace.layout is embedded', async () => {
    await mkdir(join(tempBase, '.space'), { recursive: true });
    await writeFile(
      join(tempBase, '.space', 'config'),
      'project:\n  name: test\nworkspace:\n  layout: embedded\n',
    );
    expect(await readExistingLayout(tempBase)).toBe('embedded');
  });

  it('returns "sibling" when workspace.layout is sibling', async () => {
    await mkdir(join(tempBase, '.space'), { recursive: true });
    await writeFile(
      join(tempBase, '.space', 'config'),
      'project:\n  name: test\nworkspace:\n  layout: sibling\n',
    );
    expect(await readExistingLayout(tempBase)).toBe('sibling');
  });

  it('returns undefined for an unknown layout value', async () => {
    await mkdir(join(tempBase, '.space'), { recursive: true });
    await writeFile(
      join(tempBase, '.space', 'config'),
      'project:\n  name: test\nworkspace:\n  layout: unknown\n',
    );
    expect(await readExistingLayout(tempBase)).toBeUndefined();
  });

  it('returns undefined when .space/config contains malformed YAML', async () => {
    await mkdir(join(tempBase, '.space'), { recursive: true });
    await writeFile(join(tempBase, '.space', 'config'), ': bad: yaml: {\n');
    expect(await readExistingLayout(tempBase)).toBeUndefined();
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectWorkspaceState } from './workspace-state.js';

describe('detectWorkspaceState', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'ws-state-test-'));
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('returns greenfield when the path does not exist', async () => {
    const target = join(tempBase, 'nonexistent');
    const result = await detectWorkspaceState(target);
    expect(result).toBe('greenfield');
  });

  it('returns greenfield when the directory exists but is empty', async () => {
    const target = join(tempBase, 'empty');
    await mkdir(target);
    const result = await detectWorkspaceState(target);
    expect(result).toBe('greenfield');
  });

  it('returns partial when the directory has files but no .space/config', async () => {
    const target = join(tempBase, 'partial');
    await mkdir(target);
    await writeFile(join(target, 'README.md'), '# readme');
    const result = await detectWorkspaceState(target);
    expect(result).toBe('partial');
  });

  it('returns partial when the directory has a .space dir but no config file', async () => {
    const target = join(tempBase, 'partial-space-dir');
    await mkdir(join(target, '.space'), { recursive: true });
    const result = await detectWorkspaceState(target);
    expect(result).toBe('partial');
  });

  it('returns complete when the directory has a .space/config file', async () => {
    const target = join(tempBase, 'complete');
    await mkdir(join(target, '.space'), { recursive: true });
    await writeFile(join(target, '.space', 'config'), 'key: value\n');
    const result = await detectWorkspaceState(target);
    expect(result).toBe('complete');
  });

  it('returns complete even when other files are also present', async () => {
    const target = join(tempBase, 'complete-with-extras');
    await mkdir(join(target, '.space'), { recursive: true });
    await mkdir(join(target, 'docs'), { recursive: true });
    await writeFile(join(target, '.space', 'config'), 'key: value\n');
    await writeFile(join(target, 'docs', 'note.md'), '# note');
    const result = await detectWorkspaceState(target);
    expect(result).toBe('complete');
  });
});

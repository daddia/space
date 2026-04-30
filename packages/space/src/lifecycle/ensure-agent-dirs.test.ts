import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, lstat, readlink, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ensureAgentDirs, forceSymlink } from './ensure-agent-dirs.js';

describe('ensureAgentDirs', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'ead-'));
    targetDir = join(tempBase, 'workspace');
    await mkdir(targetDir);
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('creates .cursor/skills as a symlink', async () => {
    await ensureAgentDirs(targetDir);
    const stat = await lstat(join(targetDir, '.cursor', 'skills'));
    expect(stat.isSymbolicLink()).toBe(true);
  });

  it('creates .claude/skills as a symlink', async () => {
    await ensureAgentDirs(targetDir);
    const stat = await lstat(join(targetDir, '.claude', 'skills'));
    expect(stat.isSymbolicLink()).toBe(true);
  });

  it('targets ../.agents/skills for .cursor/skills', async () => {
    await ensureAgentDirs(targetDir);
    const target = await readlink(join(targetDir, '.cursor', 'skills'));
    expect(target).toBe('../.agents/skills');
  });

  it('targets ../.agents/skills for .claude/skills', async () => {
    await ensureAgentDirs(targetDir);
    const target = await readlink(join(targetDir, '.claude', 'skills'));
    expect(target).toBe('../.agents/skills');
  });

  it('is idempotent — recreates symlinks on reinit', async () => {
    await ensureAgentDirs(targetDir);
    await ensureAgentDirs(targetDir);

    const cursorTarget = await readlink(join(targetDir, '.cursor', 'skills'));
    const claudeTarget = await readlink(join(targetDir, '.claude', 'skills'));
    expect(cursorTarget).toBe('../.agents/skills');
    expect(claudeTarget).toBe('../.agents/skills');
  });

  it('creates parent agent directories when missing', async () => {
    await ensureAgentDirs(targetDir);
    const cursorStat = await lstat(join(targetDir, '.cursor'));
    expect(cursorStat.isDirectory()).toBe(true);
  });
});

describe('forceSymlink', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'fs-'));
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('creates a symlink when the path is new', async () => {
    const linkPath = join(tempBase, 'link');
    await forceSymlink('../target', linkPath);
    const stat = await lstat(linkPath);
    expect(stat.isSymbolicLink()).toBe(true);
  });

  it('replaces an existing symlink with a new target', async () => {
    const linkPath = join(tempBase, 'link');
    await symlink('../old-target', linkPath);
    await forceSymlink('../new-target', linkPath);
    const target = await readlink(linkPath);
    expect(target).toBe('../new-target');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import spawn from 'cross-spawn';
import { tryGitInit } from './git.js';

vi.mock('cross-spawn', () => ({
  default: { sync: vi.fn() },
}));

function okResult() {
  return {
    status: 0 as number | null,
    pid: 0,
    output: [] as (string | null)[],
    stdout: '',
    stderr: '',
    signal: null,
  };
}

function failResult() {
  return { ...okResult(), status: 1 };
}

describe('tryGitInit', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cs-git-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(spawn.sync).mockReset();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns false and warns when git is not installed', () => {
    vi.mocked(spawn.sync).mockReturnValue(failResult());

    const result = tryGitInit(tempDir);

    expect(result).toBe(false);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('git not installed'));
    expect(spawn.sync).toHaveBeenCalledWith('git', ['--version'], expect.anything());
  });

  it('returns false silently when already inside a git repository', () => {
    vi.mocked(spawn.sync)
      .mockReturnValueOnce(okResult()) // git --version
      .mockReturnValueOnce(okResult()); // git rev-parse --is-inside-work-tree

    const result = tryGitInit(tempDir);

    expect(result).toBe(false);
    expect(spawn.sync).toHaveBeenCalledWith(
      'git',
      ['rev-parse', '--is-inside-work-tree'],
      expect.objectContaining({ cwd: tempDir }),
    );
  });

  it('returns false and warns when git init fails', () => {
    vi.mocked(spawn.sync)
      .mockReturnValueOnce(okResult()) // git --version
      .mockReturnValueOnce(failResult()) // git rev-parse (not in repo)
      .mockReturnValueOnce(failResult()); // git init fails

    const result = tryGitInit(tempDir);

    expect(result).toBe(false);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Skipped'));
  });

  it('runs checkout -b main when no default branch is configured', () => {
    vi.mocked(spawn.sync)
      .mockReturnValueOnce(okResult()) // git --version
      .mockReturnValueOnce(failResult()) // git rev-parse (not in repo)
      .mockReturnValueOnce(okResult()) // git init
      .mockReturnValueOnce(failResult()) // git config init.defaultBranch (not set)
      .mockReturnValueOnce(okResult()) // git checkout -b main
      .mockReturnValueOnce(okResult()) // git add -A
      .mockReturnValueOnce(okResult()); // git commit

    const result = tryGitInit(tempDir);

    expect(result).toBe(true);
    expect(spawn.sync).toHaveBeenCalledWith(
      'git',
      ['checkout', '-b', 'main'],
      expect.objectContaining({ cwd: tempDir }),
    );
  });

  it('skips checkout -b main when default branch is already configured', () => {
    vi.mocked(spawn.sync)
      .mockReturnValueOnce(okResult()) // git --version
      .mockReturnValueOnce(failResult()) // git rev-parse (not in repo)
      .mockReturnValueOnce(okResult()) // git init
      .mockReturnValueOnce(okResult()) // git config init.defaultBranch (set)
      .mockReturnValueOnce(okResult()) // git add -A
      .mockReturnValueOnce(okResult()); // git commit

    const result = tryGitInit(tempDir);

    expect(result).toBe(true);

    const calls = vi.mocked(spawn.sync).mock.calls;
    const checkoutCall = calls.find((c) => c[0] === 'git' && (c[1] as string[])[0] === 'checkout');
    expect(checkoutCall).toBeUndefined();
  });

  it('stages all files and creates an initial commit', () => {
    vi.mocked(spawn.sync)
      .mockReturnValueOnce(okResult()) // git --version
      .mockReturnValueOnce(failResult()) // git rev-parse (not in repo)
      .mockReturnValueOnce(okResult()) // git init
      .mockReturnValueOnce(okResult()) // git config init.defaultBranch
      .mockReturnValueOnce(okResult()) // git add -A
      .mockReturnValueOnce(okResult()); // git commit

    const result = tryGitInit(tempDir);

    expect(result).toBe(true);
    expect(spawn.sync).toHaveBeenCalledWith(
      'git',
      ['add', '-A'],
      expect.objectContaining({ cwd: tempDir }),
    );
    expect(spawn.sync).toHaveBeenCalledWith(
      'git',
      ['commit', '-m', 'Initial commit from create-space'],
      expect.objectContaining({ cwd: tempDir }),
    );
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Initialized'));
  });

  it('cleans up .git directory on unexpected error after init', async () => {
    const gitDir = join(tempDir, '.git');
    await mkdir(gitDir);

    vi.mocked(spawn.sync)
      .mockReturnValueOnce(okResult()) // git --version
      .mockReturnValueOnce(failResult()) // git rev-parse (not in repo)
      .mockReturnValueOnce(okResult()) // git init
      .mockImplementationOnce(() => {
        throw new Error('unexpected failure');
      });

    const result = tryGitInit(tempDir);

    expect(result).toBe(false);
    expect(existsSync(gitDir)).toBe(false);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Skipped'));
  });
});

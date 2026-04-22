import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import spawn from 'cross-spawn';
import { tryInstall } from './install.js';

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

describe('tryInstall', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls package manager install with hardened env vars', () => {
    vi.mocked(spawn.sync).mockReturnValue(okResult());

    tryInstall('/tmp/test', 'npm', true);

    expect(spawn.sync).toHaveBeenCalledWith(
      'npm',
      ['install'],
      expect.objectContaining({
        cwd: '/tmp/test',
        env: expect.objectContaining({
          NODE_ENV: 'development',
          ADBLOCK: '1',
          DISABLE_OPENCOLLECTIVE: '1',
        }),
      }),
    );
  });

  it('passes --offline to yarn when offline', () => {
    vi.mocked(spawn.sync).mockReturnValue(okResult());

    tryInstall('/tmp/test', 'yarn', false);

    expect(spawn.sync).toHaveBeenCalledWith('yarn', ['install', '--offline'], expect.anything());
  });

  it('does not pass --offline to npm when offline', () => {
    vi.mocked(spawn.sync).mockReturnValue(okResult());

    tryInstall('/tmp/test', 'npm', false);

    expect(spawn.sync).toHaveBeenCalledWith('npm', ['install'], expect.anything());
  });

  it('does not pass --offline to pnpm when offline', () => {
    vi.mocked(spawn.sync).mockReturnValue(okResult());

    tryInstall('/tmp/test', 'pnpm', false);

    expect(spawn.sync).toHaveBeenCalledWith('pnpm', ['install'], expect.anything());
  });

  it('logs offline warning when not online', () => {
    vi.mocked(spawn.sync).mockReturnValue(okResult());

    tryInstall('/tmp/test', 'npm', false);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('offline'));
  });

  it('logs success on zero exit code', () => {
    vi.mocked(spawn.sync).mockReturnValue(okResult());

    tryInstall('/tmp/test', 'npm', true);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Installed'));
  });

  it('logs not-found message on ENOENT', () => {
    const enoent = new Error('spawn npm ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    vi.mocked(spawn.sync).mockReturnValue({
      ...okResult(),
      status: null,
      error: enoent,
    });

    tryInstall('/tmp/test', 'npm', true);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  it('logs failure message on non-zero exit code', () => {
    vi.mocked(spawn.sync).mockReturnValue({ ...okResult(), status: 1 });

    tryInstall('/tmp/test', 'pnpm', true);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('install failed'));
  });
});

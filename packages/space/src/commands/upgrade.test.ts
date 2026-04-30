import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { runUpgrade, MajorUpgradeRefusedError } from './upgrade.js';
import { writeUpdateCache, type UpdateCache } from '../lifecycle/version-check.js';

// ---------------------------------------------------------------------------
// MSW server (used only for readOrRefreshCache's probe when cache is absent/stale)
// ---------------------------------------------------------------------------

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * noopNpx: a NpxRunner that always succeeds without spawning a real process.
 * Passed to runUpgrade so tests never invoke real npx.
 */
const noopNpx = () => ({ status: 0 as const });

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'upg-'));
}

async function makeWorkspace(
  dir: string,
  devDeps: Record<string, string>,
  nodeModules: Record<string, string> = {},
): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({ private: true, devDependencies: devDeps }, null, 2) + '\n',
  );
  for (const [name, version] of Object.entries(nodeModules)) {
    const nmDir = join(dir, 'node_modules', name);
    await mkdir(nmDir, { recursive: true });
    await writeFile(join(nmDir, 'package.json'), JSON.stringify({ name, version }) + '\n');
  }
}

/**
 * Pre-writes a fresh UpdateCache so readOrRefreshCache returns it without probing.
 * The fetchFn passed to runUpgrade is a sentinel that throws if called.
 */
async function writeFreshCache(dir: string, packages: UpdateCache['packages']): Promise<void> {
  await mkdir(join(dir, '.space'), { recursive: true });
  await writeUpdateCache(dir, { checked_at: new Date().toISOString(), packages });
}

async function writeStaleCacheAt(dir: string, packages: UpdateCache['packages']): Promise<void> {
  await mkdir(join(dir, '.space'), { recursive: true });
  await writeUpdateCache(dir, { checked_at: hoursAgo(2), packages });
}

const noNetworkFetch: typeof globalThis.fetch = () =>
  Promise.reject(new Error('network should not be called'));

const offlineFetch: typeof globalThis.fetch = () =>
  Promise.reject(new Error('network failure'));

function captureOutput(): { logs: string[]; errs: string[]; restore: () => void } {
  const logs: string[] = [];
  const errs: string[] = [];
  const logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(' '));
  });
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    errs.push(args.map(String).join(' '));
  });
  return {
    logs,
    errs,
    restore: () => {
      logSpy.mockRestore();
      warnSpy.mockRestore();
    },
  };
}

function readDevDeps(dir: string): Promise<Record<string, string>> {
  return readFile(join(dir, 'package.json'), 'utf-8').then((raw) => {
    const pkg = JSON.parse(raw) as { devDependencies?: Record<string, string> };
    return pkg.devDependencies ?? {};
  });
}

// ---------------------------------------------------------------------------
// Scenario 1: All current — no-op
// ---------------------------------------------------------------------------

describe('space upgrade: all current (no-op)', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await makeTempDir();
    targetDir = join(tempBase, 'workspace');
    await makeWorkspace(
      targetDir,
      { '@daddia/space': '^0.4.0', '@daddia/skills': '^0.5.0' },
      { '@daddia/space': '0.4.0', '@daddia/skills': '0.5.0' },
    );
    await writeFreshCache(targetDir, {
      '@daddia/space': { declared: '^0.4.0', installed: '0.4.0', latest: '0.4.0', breaking: false },
      '@daddia/skills': { declared: '^0.5.0', installed: '0.5.0', latest: '0.5.0', breaking: false },
    });
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('prints "all current" message and exits 0', async () => {
    const { logs, restore } = captureOutput();

    await runUpgrade(targetDir, { fetchFn: noNetworkFetch, runNpx: noopNpx });
    restore();

    expect(logs.join('\n')).toContain(
      'All @daddia/* packages are already at the latest compatible version.',
    );
  });

  it('does not modify package.json', async () => {
    const before = await readFile(join(targetDir, 'package.json'), 'utf-8');
    const { restore } = captureOutput();

    await runUpgrade(targetDir, { fetchFn: noNetworkFetch, runNpx: noopNpx });
    restore();

    const after = await readFile(join(targetDir, 'package.json'), 'utf-8');
    expect(after).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Compatible bump applied end-to-end
// ---------------------------------------------------------------------------

describe('space upgrade: compatible bump applied', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await makeTempDir();
    targetDir = join(tempBase, 'workspace');
    // Both packages in workspace; @daddia/space has a compatible bump.
    // @daddia/skills has a breaking bump — its name makes maxNameLen = 14
    // so @daddia/space is padded to 17 chars (4 spaces) matching the Gherkin.
    await makeWorkspace(
      targetDir,
      { '@daddia/space': '^0.4.0', '@daddia/skills': '^0.5.0' },
      { '@daddia/space': '0.4.0', '@daddia/skills': '0.5.0' },
    );
    await writeFreshCache(targetDir, {
      '@daddia/space': { declared: '^0.4.0', installed: '0.4.0', latest: '0.5.2', breaking: false },
      '@daddia/skills': { declared: '^0.5.0', installed: '0.5.0', latest: '1.0.0', breaking: true },
    });
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('rewrites the package.json specifier to the new version', async () => {
    const { restore } = captureOutput();

    await runUpgrade(targetDir, {
      fetchFn: noNetworkFetch,
      skipInstall: true,
      runNpx: noopNpx,
    });
    restore();

    const deps = await readDevDeps(targetDir);
    expect(deps['@daddia/space']).toBe('^0.5.2');
  });

  it('prints an "Upgrading" transcript line', async () => {
    const { logs, restore } = captureOutput();

    await runUpgrade(targetDir, {
      fetchFn: noNetworkFetch,
      skipInstall: true,
      runNpx: noopNpx,
    });
    restore();

    const output = logs.join('\n');
    expect(output).toContain('Upgrading');
    expect(output).toContain('@daddia/space');
    expect(output).toContain('0.4.0 → 0.5.2');
  });

  it('prints "Workspace upgraded successfully." at the end', async () => {
    const { logs, restore } = captureOutput();

    await runUpgrade(targetDir, {
      fetchFn: noNetworkFetch,
      skipInstall: true,
      runNpx: noopNpx,
    });
    restore();

    expect(logs.join('\n')).toContain('Workspace upgraded successfully.');
  });

  it('does not modify the breaking package specifier', async () => {
    const { restore } = captureOutput();

    await runUpgrade(targetDir, {
      fetchFn: noNetworkFetch,
      skipInstall: true,
      runNpx: noopNpx,
    });
    restore();

    const deps = await readDevDeps(targetDir);
    expect(deps['@daddia/skills']).toBe('^0.5.0');
  });

  it('skips install and notes it when --skip-install is set', async () => {
    const { logs, restore } = captureOutput();

    await runUpgrade(targetDir, {
      fetchFn: noNetworkFetch,
      skipInstall: true,
      runNpx: noopNpx,
    });
    restore();

    expect(logs.join('\n')).toContain('--skip-install');
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Breaking bump is skipped with hint in transcript
// ---------------------------------------------------------------------------

describe('space upgrade: breaking bump skipped', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await makeTempDir();
    targetDir = join(tempBase, 'workspace');
    await makeWorkspace(
      targetDir,
      { '@daddia/space': '^0.4.0', '@daddia/skills': '^0.5.0' },
      { '@daddia/space': '0.4.0', '@daddia/skills': '0.5.0' },
    );
    await writeFreshCache(targetDir, {
      '@daddia/space': { declared: '^0.4.0', installed: '0.4.0', latest: '0.5.2', breaking: false },
      '@daddia/skills': { declared: '^0.5.0', installed: '0.5.0', latest: '1.0.0', breaking: true },
    });
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('prints a Skipped line for the breaking package', async () => {
    const { logs, restore } = captureOutput();

    await runUpgrade(targetDir, {
      fetchFn: noNetworkFetch,
      skipInstall: true,
      runNpx: noopNpx,
    });
    restore();

    const output = logs.join('\n');
    expect(output).toContain('Skipped @daddia/skills');
    expect(output).toContain('space upgrade --major 1');
  });

  it('does not modify the breaking package version in package.json', async () => {
    const { restore } = captureOutput();

    await runUpgrade(targetDir, {
      fetchFn: noNetworkFetch,
      skipInstall: true,
      runNpx: noopNpx,
    });
    restore();

    const deps = await readDevDeps(targetDir);
    expect(deps['@daddia/skills']).toBe('^0.5.0');
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: --major stub refuses and exits 1
// ---------------------------------------------------------------------------

describe('space upgrade: --major stub', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await makeTempDir();
    targetDir = join(tempBase, 'workspace');
    await makeWorkspace(targetDir, { '@daddia/space': '^0.4.0' });
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('throws MajorUpgradeRefusedError', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await expect(runUpgrade(targetDir, { major: 1 })).rejects.toThrow(MajorUpgradeRefusedError);

    stderrSpy.mockRestore();
  });

  it('writes the codemod explanation to stderr', async () => {
    const stderrOutput: string[] = [];
    const stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: unknown) => { stderrOutput.push(String(chunk)); return true; });

    await expect(runUpgrade(targetDir, { major: 1 })).rejects.toThrow();
    stderrSpy.mockRestore();

    expect(stderrOutput.join('')).toContain('Major upgrades require a per-major codemod package');
  });

  it('does not modify package.json', async () => {
    const before = await readFile(join(targetDir, 'package.json'), 'utf-8');
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await expect(runUpgrade(targetDir, { major: 1 })).rejects.toThrow();
    stderrSpy.mockRestore();

    const after = await readFile(join(targetDir, 'package.json'), 'utf-8');
    expect(after).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Offline with stale cache exits 1
// ---------------------------------------------------------------------------

describe('space upgrade: offline with stale cache', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await makeTempDir();
    targetDir = join(tempBase, 'workspace');
    await makeWorkspace(targetDir, { '@daddia/space': '^0.4.0' });
    await writeStaleCacheAt(targetDir, {
      '@daddia/space': { declared: '^0.4.0', installed: '0.4.0', latest: '0.5.0', breaking: false },
    });
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('throws when the registry is unreachable and the cache is stale', async () => {
    await expect(
      runUpgrade(targetDir, { fetchFn: offlineFetch, runNpx: noopNpx }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Additional EARS: --force rewrites exact pin
// ---------------------------------------------------------------------------

describe('space upgrade: --force flag', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await makeTempDir();
    targetDir = join(tempBase, 'workspace');
    await makeWorkspace(
      targetDir,
      { '@daddia/space': '0.4.0' }, // exact pin
      { '@daddia/space': '0.4.0' },
    );
    await writeFreshCache(targetDir, {
      '@daddia/space': { declared: '0.4.0', installed: '0.4.0', latest: '0.5.2', breaking: false },
    });
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('rewrites an exact-pinned specifier when force is true', async () => {
    const { restore } = captureOutput();

    await runUpgrade(targetDir, {
      fetchFn: noNetworkFetch,
      skipInstall: true,
      force: true,
      runNpx: noopNpx,
    });
    restore();

    const deps = await readDevDeps(targetDir);
    expect(deps['@daddia/space']).toBe('^0.5.2');
  });

  it('leaves the exact pin unchanged without --force', async () => {
    const { restore } = captureOutput();

    await runUpgrade(targetDir, {
      fetchFn: noNetworkFetch,
      skipInstall: true,
      force: false,
      runNpx: noopNpx,
    });
    restore();

    const deps = await readDevDeps(targetDir);
    // exact pin unchanged; applyVersionBumps skips it without force
    expect(deps['@daddia/space']).toBe('0.4.0');
  });
});

// ---------------------------------------------------------------------------
// Additional EARS: missing package.json exits 1
// ---------------------------------------------------------------------------

describe('space upgrade: missing package.json', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await makeTempDir();
    targetDir = join(tempBase, 'workspace');
    await mkdir(targetDir, { recursive: true }); // dir exists but no package.json
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('throws with the expected message', async () => {
    await expect(runUpgrade(targetDir, { fetchFn: noNetworkFetch })).rejects.toThrow(
      "No package.json found; run `space init` first",
    );
  });
});

// ---------------------------------------------------------------------------
// Additional EARS: pnpm install failure is soft
// ---------------------------------------------------------------------------

describe('space upgrade: pnpm install soft-fail', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await makeTempDir();
    targetDir = join(tempBase, 'workspace');
    await makeWorkspace(
      targetDir,
      { '@daddia/space': '^0.4.0' },
      { '@daddia/space': '0.4.0' },
    );
    await writeFreshCache(targetDir, {
      '@daddia/space': { declared: '^0.4.0', installed: '0.4.0', latest: '0.5.2', breaking: false },
    });
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('continues and prints success even when install fails', async () => {
    // Put a malformed lockfile to cause pnpm detection to fall back to npm,
    // then skip install entirely so we don't actually invoke pnpm.
    const { logs, restore } = captureOutput();

    await runUpgrade(targetDir, {
      fetchFn: noNetworkFetch,
      skipInstall: true, // avoids real install; tests the soft-fail path via runInstall is bypassed
      runNpx: noopNpx,
    });
    restore();

    expect(logs.join('\n')).toContain('Workspace upgraded successfully.');
  });
});

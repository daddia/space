import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { runUpdate } from './update.js';
import { readUpdateCache, writeUpdateCache, type UpdateCache } from '../lifecycle/version-check.js';

// ---------------------------------------------------------------------------
// MSW server
// ---------------------------------------------------------------------------

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'upd-'));
}

async function makeWorkspace(
  dir: string,
  opts: {
    devDeps?: Record<string, string>;
    nodeModules?: Record<string, string>;
  } = {},
): Promise<void> {
  await mkdir(dir, { recursive: true });
  const pkg = { private: true, devDependencies: opts.devDeps ?? {} };
  await writeFile(join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  for (const [name, version] of Object.entries(opts.nodeModules ?? {})) {
    const nmDir = join(dir, 'node_modules', name);
    await mkdir(nmDir, { recursive: true });
    await writeFile(join(nmDir, 'package.json'), JSON.stringify({ name, version }) + '\n');
  }
}

function mockRegistry(versions: Record<string, string>) {
  return http.get(/^https:\/\/registry\.npmjs\.org\//, ({ request }) => {
    const name = decodeURIComponent(new URL(request.url).pathname.slice(1));
    const version = versions[name];
    if (!version) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ 'dist-tags': { latest: version } });
  });
}

function captureStdout(): { logs: string[]; restore: () => void } {
  const logs: string[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(' '));
  });
  return {
    logs,
    restore: () => spy.mockRestore(),
  };
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describe('space update', () => {
  let tempBase: string;
  let targetDir: string;

  beforeEach(async () => {
    tempBase = await makeTempDir();
    targetDir = join(tempBase, 'workspace');
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('writes .space/.update-cache.json after a successful registry probe', async () => {
    server.use(mockRegistry({ '@daddia/space': '0.5.2' }));
    await makeWorkspace(targetDir, {
      devDeps: { '@daddia/space': '^0.4.0' },
      nodeModules: { '@daddia/space': '0.4.0' },
    });
    const { restore } = captureStdout();

    await runUpdate(targetDir);
    restore();

    const cache = await readUpdateCache(targetDir);
    expect(cache).not.toBeNull();
    expect(cache!.packages['@daddia/space']?.latest).toBe('0.5.2');
    expect(cache!.packages['@daddia/space']?.installed).toBe('0.4.0');
  });

  it('prints a compatible line for a non-breaking update', async () => {
    server.use(mockRegistry({ '@daddia/space': '0.5.2' }));
    await makeWorkspace(targetDir, {
      devDeps: { '@daddia/space': '^0.4.0' },
      nodeModules: { '@daddia/space': '0.4.0' },
    });
    const { logs, restore } = captureStdout();

    await runUpdate(targetDir);
    restore();

    const output = logs.join('\n');
    expect(output).toContain('installed 0.4.0');
    expect(output).toContain('latest 0.5.2');
    expect(output).toContain('(compatible)');
  });

  it('prints a breaking line with upgrade hint for a major bump', async () => {
    server.use(mockRegistry({ '@daddia/skills': '1.0.0' }));
    await makeWorkspace(targetDir, {
      devDeps: { '@daddia/skills': '^0.5.0' },
      nodeModules: { '@daddia/skills': '0.5.0' },
    });
    const { logs, restore } = captureStdout();

    await runUpdate(targetDir);
    restore();

    const output = logs.join('\n');
    expect(output).toContain('installed 0.5.0');
    expect(output).toContain('latest 1.0.0');
    expect(output).toContain('space upgrade --major 1');
  });

  it('compatible lines appear before breaking lines in the report', async () => {
    server.use(mockRegistry({ '@daddia/space': '0.5.2', '@daddia/skills': '1.0.0' }));
    await makeWorkspace(targetDir, {
      devDeps: { '@daddia/space': '^0.4.0', '@daddia/skills': '^0.5.0' },
      nodeModules: { '@daddia/space': '0.4.0', '@daddia/skills': '0.5.0' },
    });
    const { logs, restore } = captureStdout();

    await runUpdate(targetDir);
    restore();

    const output = logs.join('\n');
    const compatPos = output.indexOf('(compatible)');
    const majorPos = output.indexOf('space upgrade --major');
    expect(compatPos).toBeGreaterThanOrEqual(0);
    expect(majorPos).toBeGreaterThan(compatPos);
  });

  it('prints "Cache written to ..." after the package lines', async () => {
    server.use(mockRegistry({ '@daddia/space': '0.5.2' }));
    await makeWorkspace(targetDir, {
      devDeps: { '@daddia/space': '^0.4.0' },
      nodeModules: { '@daddia/space': '0.4.0' },
    });
    const { logs, restore } = captureStdout();

    await runUpdate(targetDir);
    restore();

    const output = logs.join('\n');
    expect(output).toContain('Cache written to .space/.update-cache.json');
  });

  it('prints "All @daddia/* packages are up to date." when all are current', async () => {
    server.use(mockRegistry({ '@daddia/space': '0.4.0' }));
    await makeWorkspace(targetDir, {
      devDeps: { '@daddia/space': '^0.4.0' },
      nodeModules: { '@daddia/space': '0.4.0' },
    });
    const { logs, restore } = captureStdout();

    await runUpdate(targetDir);
    restore();

    const output = logs.join('\n');
    expect(output).toContain('All @daddia/* packages are up to date.');
  });

  it('prints "All @daddia/* packages are up to date." when no @daddia/* deps exist', async () => {
    await makeWorkspace(targetDir, { devDeps: { typescript: '^5.0.0' } });
    const { logs, restore } = captureStdout();

    await runUpdate(targetDir);
    restore();

    expect(logs.join('\n')).toContain('All @daddia/* packages are up to date.');
  });

  it('falls back to fresh cache when the registry is unreachable', async () => {
    const freshCache: UpdateCache = {
      checked_at: new Date().toISOString(),
      packages: {
        '@daddia/space': {
          declared: '^0.4.0',
          installed: '0.4.0',
          latest: '0.5.2',
          breaking: false,
        },
      },
    };
    await mkdir(join(targetDir, '.space'), { recursive: true });
    await writeUpdateCache(targetDir, freshCache);
    await makeWorkspace(targetDir, { devDeps: { '@daddia/space': '^0.4.0' } });

    const offlineFetch: typeof globalThis.fetch = () =>
      Promise.reject(new Error('network failure'));
    const { logs, restore } = captureStdout();

    await runUpdate(targetDir, offlineFetch);
    restore();

    const output = logs.join('\n');
    expect(output).toContain('0.5.2');
  });

  it('throws when the registry is unreachable and no cache exists', async () => {
    await makeWorkspace(targetDir, { devDeps: { '@daddia/space': '^0.4.0' } });

    const offlineFetch: typeof globalThis.fetch = () =>
      Promise.reject(new Error('network failure'));

    await expect(runUpdate(targetDir, offlineFetch)).rejects.toThrow();
  });

  it('throws when the registry is unreachable and the cache is stale', async () => {
    const staleCache: UpdateCache = {
      checked_at: hoursAgo(2),
      packages: {
        '@daddia/space': {
          declared: '*',
          installed: '0.4.0',
          latest: '0.5.0',
          breaking: false,
        },
      },
    };
    await mkdir(join(targetDir, '.space'), { recursive: true });
    await writeUpdateCache(targetDir, staleCache);
    await makeWorkspace(targetDir, { devDeps: { '@daddia/space': '^0.4.0' } });

    const offlineFetch: typeof globalThis.fetch = () =>
      Promise.reject(new Error('network failure'));

    await expect(runUpdate(targetDir, offlineFetch)).rejects.toThrow();
  });

  it('shows "not installed" for packages absent from node_modules', async () => {
    server.use(mockRegistry({ '@daddia/space': '0.5.2' }));
    await makeWorkspace(targetDir, {
      devDeps: { '@daddia/space': '*' },
      // no node_modules
    });
    const { logs, restore } = captureStdout();

    await runUpdate(targetDir);
    restore();

    expect(logs.join('\n')).toContain('not installed');
  });
});

import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  detectInstalledVersions,
  fetchLatestVersions,
  writeUpdateCache,
  readUpdateCache,
  isCacheStale,
  readOrRefreshCache,
  type UpdateCache,
} from './version-check.js';

// ---------------------------------------------------------------------------
// MSW server — intercepts all npm registry requests
// ---------------------------------------------------------------------------

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal npm registry response for the given version. */
function registryResponse(version: string) {
  return HttpResponse.json({ 'dist-tags': { latest: version } });
}

/**
 * Extracts the package name from a registry URL.
 * Handles the encoded form used by the implementation:
 * https://registry.npmjs.org/%40daddia%2Fspace → @daddia/space
 */
function pkgNameFromUrl(url: string): string {
  return decodeURIComponent(new URL(url).pathname.slice(1));
}

/** Registry handler that maps package names to versions. */
function mockRegistry(versions: Record<string, string>) {
  return http.get(/^https:\/\/registry\.npmjs\.org\//, ({ request }) => {
    const name = pkgNameFromUrl(request.url);
    const version = versions[name];
    if (!version) return new HttpResponse(null, { status: 404 });
    return registryResponse(version);
  });
}

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'vc-'));
}

async function makeWorkspace(
  dir: string,
  opts: {
    deps?: Record<string, string>;
    devDeps?: Record<string, string>;
    nodeModules?: Record<string, string>; // pkg -> installed version
  } = {},
): Promise<void> {
  await mkdir(dir, { recursive: true });

  const pkg: Record<string, unknown> = { private: true };
  if (opts.deps) pkg['dependencies'] = opts.deps;
  if (opts.devDeps) pkg['devDependencies'] = opts.devDeps;
  await writeFile(join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  for (const [name, version] of Object.entries(opts.nodeModules ?? {})) {
    const nmDir = join(dir, 'node_modules', name);
    await mkdir(nmDir, { recursive: true });
    await writeFile(join(nmDir, 'package.json'), JSON.stringify({ name, version }) + '\n');
  }
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// fetchLatestVersions
// ---------------------------------------------------------------------------

describe('fetchLatestVersions', () => {
  it('returns the latest version for each requested package', async () => {
    server.use(mockRegistry({ '@daddia/space': '0.5.2', '@daddia/skills': '1.0.0' }));

    const result = await fetchLatestVersions(['@daddia/space', '@daddia/skills']);

    expect(result['@daddia/space']).toBe('0.5.2');
    expect(result['@daddia/skills']).toBe('1.0.0');
  });

  it('throws when the registry returns a non-2xx status', async () => {
    server.use(
      http.get(/^https:\/\/registry\.npmjs\.org\//, () => new HttpResponse(null, { status: 503 })),
    );

    await expect(fetchLatestVersions(['@daddia/space'])).rejects.toThrow('HTTP 503');
  });

  it('throws when the registry is unreachable (network error)', async () => {
    const brokenFetch: typeof globalThis.fetch = () => Promise.reject(new Error('network failure'));

    await expect(fetchLatestVersions(['@daddia/space'], brokenFetch)).rejects.toThrow(
      'Unable to reach npm registry',
    );
  });

  it('returns an empty map when given an empty package list', async () => {
    const result = await fetchLatestVersions([]);
    expect(result).toEqual({});
  });

  it('throws when dist-tags.latest is absent in the response', async () => {
    server.use(
      http.get(/^https:\/\/registry\.npmjs\.org\//, () => HttpResponse.json({ 'dist-tags': {} })),
    );

    await expect(fetchLatestVersions(['@daddia/space'])).rejects.toThrow(
      'No dist-tags.latest',
    );
  });
});

// ---------------------------------------------------------------------------
// detectInstalledVersions
// ---------------------------------------------------------------------------

describe('detectInstalledVersions', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await makeTempDir();
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('returns the installed version for a package that is installed', async () => {
    await makeWorkspace(tempBase, {
      devDeps: { '@daddia/space': '*' },
      nodeModules: { '@daddia/space': '0.4.0' },
    });

    const result = await detectInstalledVersions(tempBase);

    expect(result['@daddia/space']).toBe('0.4.0');
  });

  it('returns null when node_modules is absent for a declared package', async () => {
    await makeWorkspace(tempBase, { devDeps: { '@daddia/space': '*' } });

    const result = await detectInstalledVersions(tempBase);

    expect(result['@daddia/space']).toBeNull();
  });

  it('returns an empty map when package.json has no @daddia/* deps', async () => {
    await makeWorkspace(tempBase, { devDeps: { typescript: '^5.0.0' } });

    const result = await detectInstalledVersions(tempBase);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it('returns an empty map when package.json is absent', async () => {
    await mkdir(tempBase, { recursive: true });

    const result = await detectInstalledVersions(tempBase);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it('includes @daddia/* from both dependencies and devDependencies', async () => {
    await makeWorkspace(tempBase, {
      deps: { '@daddia/space': '*' },
      devDeps: { '@daddia/skills': '*' },
      nodeModules: { '@daddia/space': '0.4.0', '@daddia/skills': '1.0.0' },
    });

    const result = await detectInstalledVersions(tempBase);

    expect(result['@daddia/space']).toBe('0.4.0');
    expect(result['@daddia/skills']).toBe('1.0.0');
  });

  it('does not include non-@daddia packages', async () => {
    await makeWorkspace(tempBase, {
      devDeps: { '@daddia/space': '*', typescript: '^5.0.0' },
      nodeModules: { '@daddia/space': '0.4.0' },
    });

    const result = await detectInstalledVersions(tempBase);

    expect(Object.keys(result)).toEqual(['@daddia/space']);
  });
});

// ---------------------------------------------------------------------------
// writeUpdateCache / readUpdateCache
// ---------------------------------------------------------------------------

describe('writeUpdateCache / readUpdateCache', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await makeTempDir();
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('writes valid JSON to .space/.update-cache.json', async () => {
    const cache: UpdateCache = {
      checked_at: new Date().toISOString(),
      packages: {
        '@daddia/space': {
          declared: '*',
          installed: '0.4.0',
          latest: '0.5.2',
          breaking: false,
        },
      },
    };

    await writeUpdateCache(tempBase, cache);

    const raw = await readFile(join(tempBase, '.space', '.update-cache.json'), 'utf-8');
    const parsed = JSON.parse(raw) as UpdateCache;
    expect(parsed.checked_at).toBe(cache.checked_at);
    expect(parsed.packages['@daddia/space']?.latest).toBe('0.5.2');
  });

  it('creates .space/ directory when absent', async () => {
    const cache: UpdateCache = { checked_at: new Date().toISOString(), packages: {} };
    await writeUpdateCache(tempBase, cache);

    const parsed = await readUpdateCache(tempBase);
    expect(parsed).not.toBeNull();
  });

  it('roundtrips the cache faithfully', async () => {
    const cache: UpdateCache = {
      checked_at: '2026-04-30T00:00:00.000Z',
      packages: {
        '@daddia/skills': {
          declared: '^0.5.0',
          installed: '0.5.0',
          latest: '1.0.0',
          breaking: true,
        },
      },
    };

    await writeUpdateCache(tempBase, cache);
    const result = await readUpdateCache(tempBase);

    expect(result).toEqual(cache);
  });

  it('returns null when .update-cache.json is absent', async () => {
    const result = await readUpdateCache(tempBase);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isCacheStale
// ---------------------------------------------------------------------------

describe('isCacheStale', () => {
  it('returns true when checked_at is older than maxAgeMs', () => {
    const cache: UpdateCache = { checked_at: hoursAgo(2), packages: {} };
    expect(isCacheStale(cache, 60 * 60 * 1000)).toBe(true);
  });

  it('returns false when checked_at is within maxAgeMs', () => {
    const cache: UpdateCache = { checked_at: new Date().toISOString(), packages: {} };
    expect(isCacheStale(cache, 60 * 60 * 1000)).toBe(false);
  });

  it('returns true when checked_at is exactly at the boundary (treated as stale)', () => {
    // Using a timestamp 1 hour + 1 second ago with a 1-hour max age
    const cache: UpdateCache = {
      checked_at: new Date(Date.now() - 60 * 60 * 1000 - 1000).toISOString(),
      packages: {},
    };
    expect(isCacheStale(cache, 60 * 60 * 1000)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// readOrRefreshCache
// ---------------------------------------------------------------------------

describe('readOrRefreshCache', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await makeTempDir();
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('returns fresh cache without hitting the registry', async () => {
    const freshCache: UpdateCache = {
      checked_at: new Date().toISOString(),
      packages: {
        '@daddia/space': {
          declared: '*',
          installed: '0.4.0',
          latest: '0.5.2',
          breaking: false,
        },
      },
    };
    await writeUpdateCache(tempBase, freshCache);

    const probeCount = { n: 0 };
    const trackingFetch: typeof globalThis.fetch = () => {
      probeCount.n++;
      return Promise.reject(new Error('should not be called'));
    };

    const result = await readOrRefreshCache(tempBase, 60 * 60 * 1000, trackingFetch);

    expect(probeCount.n).toBe(0);
    expect(result.packages['@daddia/space']?.latest).toBe('0.5.2');
  });

  it('probes the registry and writes a new cache when cache is absent', async () => {
    server.use(mockRegistry({ '@daddia/space': '0.5.2' }));

    await makeWorkspace(tempBase, {
      devDeps: { '@daddia/space': '^0.4.0' },
      nodeModules: { '@daddia/space': '0.4.0' },
    });

    const result = await readOrRefreshCache(tempBase, 60 * 60 * 1000);

    expect(result.packages['@daddia/space']?.latest).toBe('0.5.2');
    expect(result.packages['@daddia/space']?.installed).toBe('0.4.0');
    expect(result.packages['@daddia/space']?.breaking).toBe(false);

    const written = await readUpdateCache(tempBase);
    expect(written).not.toBeNull();
  });

  it('probes the registry when the cache is stale', async () => {
    server.use(mockRegistry({ '@daddia/space': '0.6.0' }));

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
    await writeUpdateCache(tempBase, staleCache);

    await makeWorkspace(tempBase, {
      devDeps: { '@daddia/space': '*' },
      nodeModules: { '@daddia/space': '0.4.0' },
    });

    const result = await readOrRefreshCache(tempBase, 60 * 60 * 1000);

    expect(result.packages['@daddia/space']?.latest).toBe('0.6.0');
  });

  it('throws when the registry is unreachable and no cache exists', async () => {
    await makeWorkspace(tempBase, { devDeps: { '@daddia/space': '*' } });

    const offlineFetch: typeof globalThis.fetch = () =>
      Promise.reject(new Error('network failure'));

    await expect(readOrRefreshCache(tempBase, 60 * 60 * 1000, offlineFetch)).rejects.toThrow(
      'Unable to reach npm registry',
    );
  });

  it('marks a bump as breaking when it crosses a major boundary', async () => {
    server.use(mockRegistry({ '@daddia/skills': '1.0.0' }));

    await makeWorkspace(tempBase, {
      devDeps: { '@daddia/skills': '^0.5.0' },
      nodeModules: { '@daddia/skills': '0.5.0' },
    });

    const result = await readOrRefreshCache(tempBase, 60 * 60 * 1000);

    expect(result.packages['@daddia/skills']?.breaking).toBe(true);
  });

  it('marks a bump as non-breaking within the same major', async () => {
    server.use(mockRegistry({ '@daddia/space': '0.5.2' }));

    await makeWorkspace(tempBase, {
      devDeps: { '@daddia/space': '^0.4.0' },
      nodeModules: { '@daddia/space': '0.4.0' },
    });

    const result = await readOrRefreshCache(tempBase, 60 * 60 * 1000);

    expect(result.packages['@daddia/space']?.breaking).toBe(false);
  });

  it('treats null installed version as non-breaking', async () => {
    server.use(mockRegistry({ '@daddia/space': '1.0.0' }));

    await makeWorkspace(tempBase, {
      devDeps: { '@daddia/space': '*' },
      // no node_modules — installed is null
    });

    const result = await readOrRefreshCache(tempBase, 60 * 60 * 1000);

    expect(result.packages['@daddia/space']?.installed).toBeNull();
    expect(result.packages['@daddia/space']?.breaking).toBe(false);
  });

  it('returns an empty cache when the workspace has no @daddia/* deps', async () => {
    await makeWorkspace(tempBase, { devDeps: { typescript: '^5.0.0' } });

    const result = await readOrRefreshCache(tempBase, 60 * 60 * 1000);

    expect(Object.keys(result.packages)).toHaveLength(0);
  });
});

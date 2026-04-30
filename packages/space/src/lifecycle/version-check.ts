import fs from 'node:fs/promises';
import path from 'node:path';

const NPM_REGISTRY = 'https://registry.npmjs.org';
const CACHE_RELATIVE_PATH = '.space/.update-cache.json';

export interface PackageVersionInfo {
  /** Version specifier declared in package.json (e.g. "^0.5.0" or "*") */
  declared: string;
  /** Resolved installed version from node_modules/<pkg>/package.json */
  installed: string | null;
  /** Latest published version from the npm registry */
  latest: string;
  /** True when the latest major differs from the installed major */
  breaking: boolean;
}

export interface UpdateCache {
  /** ISO 8601 timestamp of when the cache was last written */
  checked_at: string;
  packages: Record<string, PackageVersionInfo>;
}

interface WorkspaceDep {
  name: string;
  declared: string;
  installed: string | null;
}

/**
 * Reads all @daddia/* entries from the workspace package.json and attempts to
 * resolve the installed version from node_modules. Used as the shared data
 * source for both the public detectInstalledVersions and readOrRefreshCache.
 */
async function resolveWorkspaceDaddaDeps(cwd: string): Promise<WorkspaceDep[]> {
  const pkgPath = path.join(cwd, 'package.json');

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return [];
  }

  const allDeps: Record<string, string> = {
    ...((pkg['dependencies'] as Record<string, string> | undefined) ?? {}),
    ...((pkg['devDependencies'] as Record<string, string> | undefined) ?? {}),
  };

  const daddiaPkgs = Object.entries(allDeps).filter(([name]) => name.startsWith('@daddia/'));
  const results: WorkspaceDep[] = [];

  for (const [name, declared] of daddiaPkgs) {
    let installed: string | null = null;
    try {
      const installedPkgJson = path.join(cwd, 'node_modules', name, 'package.json');
      const raw = await fs.readFile(installedPkgJson, 'utf-8');
      const installedPkg = JSON.parse(raw) as Record<string, unknown>;
      const version = installedPkg['version'];
      installed = typeof version === 'string' ? version : null;
    } catch {
      // package not installed or node_modules absent
    }
    results.push({ name, declared, installed });
  }

  return results;
}

/**
 * Returns the installed version (or null) for each @daddia/* dependency
 * declared in the workspace package.json. Returns null for a package when
 * node_modules is absent or the package has not been installed.
 */
export async function detectInstalledVersions(
  cwd: string,
): Promise<Record<string, string | null>> {
  const deps = await resolveWorkspaceDaddaDeps(cwd);
  return Object.fromEntries(deps.map((d) => [d.name, d.installed]));
}

/**
 * Fetches the latest published version for each package from the npm registry.
 * Requests run concurrently. The fetchFn parameter is injected so tests can
 * provide a mock without spawning real network requests.
 *
 * Throws on network failure or a non-2xx response for any package.
 */
export async function fetchLatestVersions(
  pkgNames: string[],
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  await Promise.all(
    pkgNames.map(async (name) => {
      // encodeURIComponent preserves the @scope/name encoding that the npm
      // registry expects (%40scope%2Fname) and avoids creating two path segments.
      const url = `${NPM_REGISTRY}/${encodeURIComponent(name)}`;
      let response: Response;
      try {
        response = await fetchFn(url, {
          headers: { Accept: 'application/vnd.npm.install-v1+json' },
        });
      } catch (err) {
        throw new Error(
          `Unable to reach npm registry for ${name}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      if (!response.ok) {
        throw new Error(`npm registry returned HTTP ${response.status} for ${name}`);
      }
      const data = (await response.json()) as { 'dist-tags'?: { latest?: string } };
      const latest = data['dist-tags']?.['latest'];
      if (!latest) {
        throw new Error(`No dist-tags.latest in npm registry response for ${name}`);
      }
      result[name] = latest;
    }),
  );

  return result;
}

/** Writes the cache to <cwd>/.space/.update-cache.json. */
export async function writeUpdateCache(cwd: string, cache: UpdateCache): Promise<void> {
  const cachePath = path.join(cwd, CACHE_RELATIVE_PATH);
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2) + '\n');
}

/**
 * Reads .space/.update-cache.json. Returns null when the file is absent or
 * contains malformed JSON.
 */
export async function readUpdateCache(cwd: string): Promise<UpdateCache | null> {
  const cachePath = path.join(cwd, CACHE_RELATIVE_PATH);
  try {
    const content = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(content) as UpdateCache;
  } catch {
    return null;
  }
}

/**
 * Returns true when the cache's checked_at timestamp is older than maxAgeMs
 * milliseconds ago.
 */
export function isCacheStale(cache: UpdateCache, maxAgeMs: number): boolean {
  const checkedAt = new Date(cache.checked_at).getTime();
  return Date.now() - checkedAt > maxAgeMs;
}

/**
 * Whether the installed-to-latest version change crosses a major boundary.
 * Defaults to false when installed is null (node_modules absent) so that
 * all packages with unknown installed versions appear as compatible candidates.
 */
function isBreaking(installed: string | null, latest: string): boolean {
  if (installed === null) return false;
  const installedMajor = parseInt(installed.split('.')[0] ?? '0', 10);
  const latestMajor = parseInt(latest.split('.')[0] ?? '0', 10);
  return latestMajor > installedMajor;
}

/**
 * Returns the UpdateCache from disk when present and fresh. When absent or
 * stale, probes the npm registry, writes a new cache, and returns it.
 *
 * Throws when the registry is unreachable and no cached data exists.
 */
export async function readOrRefreshCache(
  cwd: string,
  maxAgeMs: number,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): Promise<UpdateCache> {
  const existing = await readUpdateCache(cwd);
  if (existing !== null && !isCacheStale(existing, maxAgeMs)) {
    return existing;
  }

  const deps = await resolveWorkspaceDaddaDeps(cwd);

  if (deps.length === 0) {
    const empty: UpdateCache = { checked_at: new Date().toISOString(), packages: {} };
    await writeUpdateCache(cwd, empty);
    return empty;
  }

  // Throws on network failure — caller decides how to handle the error.
  const latestVersions = await fetchLatestVersions(
    deps.map((d) => d.name),
    fetchFn,
  );

  const packages: Record<string, PackageVersionInfo> = {};
  for (const { name, declared, installed } of deps) {
    const latest = latestVersions[name] ?? installed ?? '0.0.0';
    packages[name] = {
      declared,
      installed,
      latest,
      breaking: isBreaking(installed, latest),
    };
  }

  const cache: UpdateCache = {
    checked_at: new Date().toISOString(),
    packages,
  };

  await writeUpdateCache(cwd, cache);
  return cache;
}

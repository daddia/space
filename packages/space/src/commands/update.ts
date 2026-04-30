import fs from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';
import pc from 'picocolors';
import {
  detectInstalledVersions,
  fetchLatestVersions,
  writeUpdateCache,
  readUpdateCache,
  isCacheStale,
  type UpdateCache,
  type PackageVersionInfo,
} from '../lifecycle/version-check.js';

const CACHE_FALLBACK_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Runs the update probe: fetches latest versions from the npm registry,
 * writes the cache, and prints a report. On network failure, falls back to
 * a fresh cache when one exists. Throws when the registry is unreachable and
 * no fresh cache is available.
 *
 * The fetchFn parameter is injected so tests can mock the network without
 * spawning real HTTP requests.
 */
export async function runUpdate(
  cwd: string,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): Promise<void> {
  const [declared, installed] = await Promise.all([
    readDeclaredDaddaDeps(cwd),
    detectInstalledVersions(cwd),
  ]);

  const pkgNames = Object.keys(declared);

  if (pkgNames.length === 0) {
    console.log('All @daddia/* packages are up to date.');
    return;
  }

  let cache: UpdateCache;

  try {
    const latestVersions = await fetchLatestVersions(pkgNames, fetchFn);
    cache = buildCache(declared, installed, latestVersions);
    await writeUpdateCache(cwd, cache);
  } catch (err) {
    // Network probe failed — try to serve from a fresh cache.
    const existing = await readUpdateCache(cwd);
    if (existing !== null && !isCacheStale(existing, CACHE_FALLBACK_MAX_AGE_MS)) {
      process.stderr.write(
        pc.yellow(`Warning: npm registry unreachable; using cached data (${existing.checked_at})\n`),
      );
      printUpdateReport(existing);
      return;
    }
    // No fresh cache — propagate the error so the caller exits non-zero.
    throw err;
  }

  printUpdateReport(cache);
}

export function registerUpdateCommand(program: Command): void {
  program
    .command('update')
    .description('Check @daddia/* packages for updates and write a local cache')
    .action(async () => {
      try {
        await runUpdate(process.cwd());
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(pc.red(`space: ${msg}\n`));
        process.exit(1);
      }
    });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Reads @daddia/* entries and their declared specifiers from package.json. */
async function readDeclaredDaddaDeps(cwd: string): Promise<Record<string, string>> {
  const pkgPath = path.join(cwd, 'package.json');
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return {};
  }
  const allDeps: Record<string, string> = {
    ...((pkg['dependencies'] as Record<string, string> | undefined) ?? {}),
    ...((pkg['devDependencies'] as Record<string, string> | undefined) ?? {}),
  };
  return Object.fromEntries(
    Object.entries(allDeps).filter(([name]) => name.startsWith('@daddia/')),
  );
}

/**
 * Assembles an UpdateCache from the three separate data sources gathered
 * during the update flow. The breaking flag follows the same rule as
 * version-check.ts: a null installed version is treated as non-breaking so
 * uninstalled packages appear as compatible upgrade candidates.
 */
function buildCache(
  declared: Record<string, string>,
  installed: Record<string, string | null>,
  latestVersions: Record<string, string>,
): UpdateCache {
  const packages: Record<string, PackageVersionInfo> = {};
  for (const [name, declaredVersion] of Object.entries(declared)) {
    const installedVersion = installed[name] ?? null;
    const latest = latestVersions[name] ?? installedVersion ?? '0.0.0';
    const installedMajor =
      installedVersion !== null ? parseInt(installedVersion.split('.')[0] ?? '0', 10) : null;
    const latestMajor = parseInt(latest.split('.')[0] ?? '0', 10);
    packages[name] = {
      declared: declaredVersion,
      installed: installedVersion,
      latest,
      breaking: installedMajor !== null && latestMajor > installedMajor,
    };
  }
  return { checked_at: new Date().toISOString(), packages };
}

/**
 * Prints the update report to stdout. Compatible packages appear first,
 * then breaking packages with an upgrade hint. Package names are padded to
 * align the "installed" column. Prints "All @daddia/* packages are up to date."
 * when no packages have available updates.
 */
function printUpdateReport(cache: UpdateCache): void {
  const entries = Object.entries(cache.packages);
  const updates = entries.filter(([, info]) => info.installed !== info.latest);

  if (updates.length === 0) {
    console.log('All @daddia/* packages are up to date.');
    return;
  }

  const maxNameLen = Math.max(...updates.map(([name]) => name.length));

  const compatible: string[] = [];
  const breaking: string[] = [];

  for (const [name, info] of updates) {
    const paddedName = name.padEnd(maxNameLen + 2);
    const installedStr = info.installed ?? 'not installed';
    if (info.breaking) {
      const latestMajor = parseInt(info.latest.split('.')[0] ?? '0', 10);
      breaking.push(
        `${paddedName}installed ${installedStr}  →  latest ${info.latest}  (major; run \`space upgrade --major ${latestMajor}\`)`,
      );
    } else {
      compatible.push(
        `${paddedName}installed ${installedStr}  →  latest ${info.latest}  (compatible)`,
      );
    }
  }

  for (const line of compatible) console.log(line);
  for (const line of breaking) console.log(line);

  console.log('');
  console.log('Cache written to .space/.update-cache.json');
}

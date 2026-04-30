import fs from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';
import pc from 'picocolors';
import { readOrRefreshCache, type UpdateCache } from '../lifecycle/version-check.js';
import { selectCompatibleBumps, applyVersionBumps } from '../lifecycle/apply-upgrade.js';
import {
  mergeOrCreateConfig,
  ensurePackageJsonDeps,
  ensureAgentDirs,
  runInstall,
} from '../lifecycle/index.js';
import {
  resolveProfileName,
  loadBundledProfile,
  syncSkills,
  type NpxRunner,
} from '../skills/sync-driver.js';

const DEFAULT_MAX_AGE_MS = 3_600_000; // 1 hour

export interface UpgradeOptions {
  /** When set, the --major stub fires immediately and the command exits 1. */
  major?: number;
  /** When true, rewrites exact-pinned specifiers. */
  force?: boolean;
  /** When true, skips pnpm install and notes it in the transcript. */
  skipInstall?: boolean;
  /** Maximum cache age in milliseconds before a fresh probe is triggered. */
  maxAgeMs?: number;
  /** Injectable fetch for tests; defaults to globalThis.fetch. */
  fetchFn?: typeof globalThis.fetch;
  /** Injectable npx runner for tests; defaults to spawnSync. */
  runNpx?: NpxRunner;
}

/**
 * Thrown when --major is supplied. The action handler catches it, prints to
 * stderr, and exits 1. Kept as a distinct class so callers can distinguish it
 * from unexpected errors.
 */
export class MajorUpgradeRefusedError extends Error {
  constructor(major: number) {
    super(`Major upgrade to v${major} refused: no codemod package available`);
    this.name = 'MajorUpgradeRefusedError';
  }
}

/**
 * Implements the upgrade flow. Testable by passing UpgradeOptions overrides
 * (fetchFn for network, runNpx for skill sync). Throws on unrecoverable
 * errors so the action handler can decide the exit code.
 */
export async function runUpgrade(cwd: string, opts: UpgradeOptions = {}): Promise<void> {
  const {
    major,
    force = false,
    skipInstall = false,
    maxAgeMs = DEFAULT_MAX_AGE_MS,
    fetchFn = globalThis.fetch,
    runNpx,
  } = opts;

  // --major: print stub, throw so the action handler exits 1.
  if (major !== undefined) {
    process.stderr.write(
      `Error: Major upgrades require a per-major codemod package that does not yet exist\n` +
        `       for this target version.\n\n` +
        `       When @daddia/space-codemod-v${major} is published, run:\n` +
        `         space upgrade --major ${major}\n\n` +
        `       Until then, follow the manual migration guide in the release notes.\n`,
    );
    throw new MajorUpgradeRefusedError(major);
  }

  // Guard: package.json must exist before any workspace mutation.
  try {
    await fs.access(path.join(cwd, 'package.json'));
  } catch {
    throw new Error('No package.json found; run `space init` first');
  }

  // Fetch or return a fresh cache. Throws when the registry is unreachable
  // and the cache is absent or stale.
  const cache = await readOrRefreshCache(cwd, maxAgeMs, fetchFn);

  // Compatible packages that have an actual update available (installed ≠ latest).
  const compatibleBumps = selectCompatibleBumps(cache);
  const actualBumps = Object.fromEntries(
    Object.entries(compatibleBumps).filter(
      ([name, latest]) => cache.packages[name]?.installed !== latest,
    ),
  );

  // Breaking packages for the end-of-transcript "Skipped" lines.
  const breakingEntries = Object.entries(cache.packages).filter(([, info]) => info.breaking);

  if (Object.keys(actualBumps).length === 0) {
    console.log('All @daddia/* packages are already at the latest compatible version.');
    return;
  }

  // Align names across both "Upgrading" and "Skipped" lines.
  const transcriptNames = [...Object.keys(actualBumps), ...breakingEntries.map(([n]) => n)];
  const maxNameLen = Math.max(...transcriptNames.map((n) => n.length));

  // Print "Upgrading" lines then apply version bumps.
  for (const [name, latest] of Object.entries(actualBumps)) {
    const info = cache.packages[name] as UpdateCache['packages'][string];
    const paddedName = name.padEnd(maxNameLen + 3);
    console.log(`Upgrading ${paddedName}${info.installed ?? 'unknown'} → ${latest}`);
  }

  await applyVersionBumps(cwd, actualBumps, force);

  // Install (soft-fail preserved in runInstall; skipInstall notes it).
  if (skipInstall) {
    console.log('  Skipped install (--skip-install)');
  } else {
    console.log('Running pnpm install...');
    await runInstall(cwd);
  }

  // Merge config, re-ensure deps and agent dirs (housekeeping).
  console.log('Merging .space/config...');
  await mergeOrCreateConfig(cwd);
  await ensurePackageJsonDeps(cwd);
  await ensureAgentDirs(cwd);

  // Skill sync — soft-fail so a missing profile or npx error never blocks upgrade.
  try {
    const profileName = resolveProfileName(cwd, undefined);
    const skillNames = loadBundledProfile(profileName);
    console.log(`Syncing skills (profile: ${profileName})...`);
    syncSkills({ workspaceRoot: cwd, profileName, skills: skillNames, runNpx });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`  Warning: skill sync skipped: ${msg}`);
  }

  // Print "Skipped" lines for breaking bumps.
  for (const [name, info] of breakingEntries) {
    const major = parseInt(info.latest.split('.')[0] ?? '0', 10);
    const installedStr = info.installed ?? 'unknown';
    const paddedName = name.padEnd(maxNameLen + 3);
    console.log(
      `Skipped ${paddedName}${installedStr} → ${info.latest}  (major; run \`space upgrade --major ${major}\`)`,
    );
  }

  console.log('');
  console.log('Workspace upgraded successfully.');
}

export function registerUpgradeCommand(program: Command): void {
  program
    .command('upgrade')
    .description('Apply compatible @daddia/* package updates to the workspace')
    .option('--major <version>', 'Target major version (stub: prints migration instructions)')
    .option('--force', 'Rewrite exact-pinned specifiers')
    .option('--skip-install', 'Skip pnpm install after rewriting specifiers')
    .option('--max-age <seconds>', 'Maximum cache age in seconds before re-probing')
    .action(
      async (opts: { major?: string; force?: boolean; skipInstall?: boolean; maxAge?: string }) => {
        try {
          await runUpgrade(process.cwd(), {
            major: opts.major !== undefined ? parseInt(opts.major, 10) : undefined,
            force: opts.force,
            skipInstall: opts.skipInstall,
            maxAgeMs: opts.maxAge !== undefined ? parseInt(opts.maxAge, 10) * 1000 : undefined,
          });
        } catch (err) {
          if (!(err instanceof MajorUpgradeRefusedError)) {
            const msg = err instanceof Error ? err.message : String(err);
            process.stderr.write(pc.red(`space: ${msg}\n`));
          }
          process.exit(1);
        }
      },
    );
}

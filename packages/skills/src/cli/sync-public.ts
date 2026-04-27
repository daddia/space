#!/usr/bin/env node
/**
 * sync-public CLI
 *
 * Mirrors the stable skills from `packages/skills/` to the public
 * `daddia/skills` repository, applying the public-asset policy.
 *
 * Usage:
 *   node dist/cli/sync-public.js                   # default target: ../../../skills
 *   node dist/cli/sync-public.js --target /abs/path
 *   node dist/cli/sync-public.js --dry-run
 *
 * Invoked via the monorepo root script:
 *   pnpm sync:public-skills
 * which delegates to:
 *   pnpm --filter @daddia/skills sync-public
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { syncPublicSkills } from '../publish/sync-public.js';

const packageDir = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetIdx = args.indexOf('--target');
const targetOverride = targetIdx >= 0 ? args[targetIdx + 1] : undefined;

// Skills content lives under packages/skills/skills/ (Vercel pattern).
// Generated directories (e.g. space-index) remain at the package root and are
// passed as extraSourceDirs so the sync module can locate them.
const sourceDir = path.join(packageDir, 'skills');
const profileFile = path.join(packageDir, 'profiles', 'full.yaml');
const extraSourceDirs = [packageDir];

// Default target: sibling `skills` repo at `{space-repo}/../skills`
const targetDir = targetOverride
  ? path.resolve(targetOverride)
  : path.resolve(packageDir, '..', '..', '..', 'skills');

syncPublicSkills({ sourceDir, targetDir, profileFile, extraSourceDirs, dryRun })
  .then((result) => {
    if (result.missingSource.length > 0) {
      process.stderr.write(
        `sync-public: ${result.missingSource.length} skill(s) in profile but missing in source:\n`,
      );
      for (const name of result.missingSource) {
        process.stderr.write(`    - ${name}\n`);
      }
    }

    if (!dryRun) {
      process.stdout.write(
        `sync-public: ${result.copied.length} skills synced (${result.filesWritten} files written)\n`,
      );
      if (result.removedStale.length > 0) {
        process.stdout.write(
          `sync-public: removed ${result.removedStale.length} stale skill directories:\n`,
        );
        for (const name of result.removedStale) {
          process.stdout.write(`    - ${name}\n`);
        }
      }
    }

    process.exit(0);
  })
  .catch((err: unknown) => {
    process.stderr.write(`sync-public: ${(err as Error).message}\n`);
    process.exit(1);
  });

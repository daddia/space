import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import pc from 'picocolors';

/**
 * Detects the package manager in use by checking for lockfiles. Prefers
 * pnpm, then yarn, then bun; falls back to npm when no lockfile is found.
 */
export async function detectPackageManager(
  targetDir: string,
): Promise<'npm' | 'pnpm' | 'yarn' | 'bun'> {
  const candidates: Array<[string, 'npm' | 'pnpm' | 'yarn' | 'bun']> = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm'],
  ];
  for (const [lockfile, pm] of candidates) {
    try {
      await fs.access(path.join(targetDir, lockfile));
      return pm;
    } catch {
      // lockfile not present, try next
    }
  }
  return 'npm';
}

/**
 * Runs the workspace package manager's install command. On failure, prints a
 * soft advisory and returns without throwing — consistent with the `space init`
 * contract so that workspaces remain usable even when install fails.
 */
export async function runInstall(targetDir: string): Promise<void> {
  const pm = await detectPackageManager(targetDir);
  const result = spawnSync(pm, ['install'], {
    cwd: targetDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development', ADBLOCK: '1', DISABLE_OPENCOLLECTIVE: '1' },
  });

  if (result.status !== 0) {
    console.log(`  ${pc.yellow('Skipped')} install (${pm} install failed)`);
    console.log(`  Run ${pc.cyan(`${pm} install`)} manually to install dependencies.`);
  }
}

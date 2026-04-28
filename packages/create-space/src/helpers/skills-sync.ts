import spawn from 'cross-spawn';
import pc from 'picocolors';

/**
 * Invokes `space skills sync` in the target workspace directory.
 * Best-effort: emits a warning on failure and returns false; the scaffold
 * continues and exits 0 regardless. Returns true when sync succeeds so the
 * caller can gate follow-on writes (e.g. .space/profile.yaml) on success.
 * The caller is responsible for ensuring `@daddia/space` is already installed
 * in the target before calling.
 */
export function trySkillsSync(targetDir: string, profileName?: string): boolean {
  const args = ['exec', 'space', 'skills', 'sync'];
  if (profileName) {
    args.push('--profile', profileName);
  }

  const result = spawn.sync('pnpm', args, {
    cwd: targetDir,
    stdio: ['ignore', 'inherit', 'pipe'],
  });

  if (result.status !== 0 || result.error) {
    const reason = result.error?.message ?? `exit ${String(result.status ?? 'unknown')}`;
    console.error(
      `  ${pc.yellow('Warning:')} skills sync failed (${reason}); run ${pc.cyan('space skills sync')} manually.`,
    );
    return false;
  }

  return true;
}

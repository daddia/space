import spawn from 'cross-spawn';
import pc from 'picocolors';

/**
 * Invokes `space skills sync` in the target workspace directory.
 * Best-effort: emits a warning and returns if the command fails; the scaffold
 * continues and exits 0 regardless. The caller is responsible for ensuring
 * `@daddia/space` is already installed in the target before calling.
 */
export function trySkillsSync(targetDir: string, profileName?: string): void {
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
  }
}

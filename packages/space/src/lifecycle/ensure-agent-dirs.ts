import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Creates (or recreates) .cursor/skills and .claude/skills as symlinks pointing
 * to ../.agents/skills — the canonical skill install location populated by
 * `space skills sync` (established in SPACE-15).
 */
export async function ensureAgentDirs(targetDir: string): Promise<void> {
  for (const agentDir of ['.cursor', '.claude']) {
    const dir = path.join(targetDir, agentDir);
    await fs.mkdir(dir, { recursive: true });
    await forceSymlink('../.agents/skills', path.join(dir, 'skills'));
  }
}

/**
 * Creates a symlink at linkPath pointing to target. When the path already
 * exists (EEXIST), removes it and recreates — making the operation idempotent
 * regardless of whether the previous entry was a symlink or a file.
 */
export async function forceSymlink(target: string, linkPath: string): Promise<void> {
  try {
    await fs.symlink(target, linkPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    await fs.rm(linkPath, { force: true });
    await fs.symlink(target, linkPath);
  }
}

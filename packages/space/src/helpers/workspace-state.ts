import fs from 'node:fs/promises';
import path from 'node:path';

export type WorkspaceState = 'greenfield' | 'partial' | 'complete';

/**
 * Classifies a target directory so the caller can decide whether to do a
 * fresh scaffold, an idempotent reinit, or a no-op.
 *
 * greenfield -- dir does not exist, or exists and is empty.
 * partial    -- dir exists with files, but no .space/config present.
 * complete   -- dir exists and contains a readable .space/config.
 */
export async function detectWorkspaceState(targetDir: string): Promise<WorkspaceState> {
  const absTarget = path.resolve(targetDir);

  let entries: string[];
  try {
    entries = await fs.readdir(absTarget);
  } catch {
    return 'greenfield';
  }

  if (entries.length === 0) {
    return 'greenfield';
  }

  const configPath = path.join(absTarget, '.space', 'config');
  try {
    await fs.access(configPath, fs.constants.R_OK);
    return 'complete';
  } catch {
    return 'partial';
  }
}

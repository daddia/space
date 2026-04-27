import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface SkillEntry {
  name: string;
  /** SHA-256 of SKILL.md content for drift detection. */
  contentHash: string;
}

export interface SkillsLock {
  /** Version of the lockfile format. */
  version: 1;
  /** Source repository (e.g. "daddia/skills"). */
  source: string;
  /** Git ref pinned (commit SHA or tag). */
  ref: string;
  /** Active profile name (e.g. "domain-team"). */
  profile: string;
  /** Skills installed and their content hashes. */
  skills: SkillEntry[];
  /** ISO 8601 timestamp of last sync. */
  syncedAt: string;
}

export const LOCKFILE_NAME = 'skills-lock.json';

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

/**
 * Reads `skills-lock.json` from the workspace root.
 * Returns null when the file does not exist or cannot be parsed.
 */
export function readLockfile(workspaceRoot: string): SkillsLock | null {
  const lockPath = path.join(workspaceRoot, LOCKFILE_NAME);
  if (!existsSync(lockPath)) return null;
  try {
    return JSON.parse(readFileSync(lockPath, 'utf-8')) as SkillsLock;
  } catch {
    return null;
  }
}

/**
 * Writes `skills-lock.json` to the workspace root, replacing any existing file.
 */
export function writeLockfile(workspaceRoot: string, lock: SkillsLock): void {
  writeFileSync(
    path.join(workspaceRoot, LOCKFILE_NAME),
    JSON.stringify(lock, null, 2) + '\n',
    'utf-8',
  );
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * Computes the SHA-256 hex digest of a SKILL.md file at the given path.
 */
export function hashSkillContent(skillMdPath: string): string {
  return createHash('sha256').update(readFileSync(skillMdPath)).digest('hex');
}

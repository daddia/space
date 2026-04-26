import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncSkillsOptions {
  /** Value of the --profile flag; overrides .space/profile.yaml when set. */
  profile?: string;
}

/** Shape of .space/profile.yaml in the consumer workspace. */
interface WorkspaceProfileFile {
  name?: string;
}

/** Shape of the profile YAML files in @daddia/skills/profiles/. */
interface SkillsProfileFile {
  name?: string;
  skills?: unknown;
}

/** Shape written to .space/.skill-filter.json */
interface SkillFilterFile {
  skills: string[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class SkillsProfileNotFoundError extends Error {
  constructor(profileName: string) {
    super(`Profile '${profileName}' not found in @daddia/skills/profiles/`);
    this.name = 'SkillsProfileNotFoundError';
  }
}

// ---------------------------------------------------------------------------
// Profile resolution
// ---------------------------------------------------------------------------

/**
 * Determine the active profile name using the precedence:
 *   1. --profile flag value
 *   2. name field in .space/profile.yaml
 *   3. 'full' (default)
 */
export function resolveProfileName(workspaceRoot: string, profileFlag?: string): string {
  if (profileFlag) return profileFlag;

  const workspaceProfilePath = path.join(workspaceRoot, '.space', 'profile.yaml');
  if (existsSync(workspaceProfilePath)) {
    const raw = readFileSync(workspaceProfilePath, 'utf-8');
    const data = parse(raw) as WorkspaceProfileFile | null;
    if (data?.name && typeof data.name === 'string' && data.name.trim()) {
      return data.name.trim();
    }
  }

  return 'full';
}

// ---------------------------------------------------------------------------
// Profile loading
// ---------------------------------------------------------------------------

/**
 * Read the named profile from node_modules/@daddia/skills/profiles/ and return
 * the list of skill directory names it activates.
 *
 * - Throws SkillsProfileNotFoundError if the profile YAML does not exist.
 * - Warns to stderr and skips any skill name that does not correspond to a
 *   directory under node_modules/@daddia/skills/.
 */
export function loadSkillsProfile(workspaceRoot: string, profileName: string): string[] {
  const profilePath = path.join(
    workspaceRoot,
    'node_modules',
    '@daddia',
    'skills',
    'profiles',
    `${profileName}.yaml`,
  );

  if (!existsSync(profilePath)) {
    throw new SkillsProfileNotFoundError(profileName);
  }

  const raw = readFileSync(profilePath, 'utf-8');
  const data = parse(raw) as SkillsProfileFile | null;

  if (!data || !Array.isArray(data.skills)) {
    throw new Error(
      `Profile '${profileName}' has a malformed YAML structure — expected a "skills" list`,
    );
  }

  const skillsSourceDir = path.join(workspaceRoot, 'node_modules', '@daddia', 'skills');
  const validated: string[] = [];

  for (const entry of data.skills as unknown[]) {
    if (typeof entry !== 'string') continue;
    const skillDir = path.join(skillsSourceDir, entry);
    if (!existsSync(skillDir) || !existsSync(path.join(skillDir, 'SKILL.md'))) {
      process.stderr.write(
        `space: Skill '${entry}' listed in profile not found in source; skipped\n`,
      );
      continue;
    }
    validated.push(entry);
  }

  return validated;
}

// ---------------------------------------------------------------------------
// Sync execution
// ---------------------------------------------------------------------------

/**
 * Write .space/.skill-filter.json, invoke sync-skills, then delete the filter
 * file. The filter file is always cleaned up — even when sync-skills fails.
 *
 * @param execSyncSkills  Injected executor; defaults to running the sync-skills
 *                        bin via spawnSync. Override in tests.
 */
export async function syncSkillsWithProfile(
  workspaceRoot: string,
  profileName: string,
  skills: string[],
  execSyncSkills: (workspaceRoot: string) => void = runSyncSkillsBin,
): Promise<void> {
  const filterPath = path.join(workspaceRoot, '.space', '.skill-filter.json');
  const filterContent: SkillFilterFile = { skills };

  writeFileSync(filterPath, JSON.stringify(filterContent, null, 2) + '\n', 'utf-8');

  try {
    execSyncSkills(workspaceRoot);
  } finally {
    if (existsSync(filterPath)) {
      unlinkSync(filterPath);
    }
  }

  process.stdout.write(`space: synced ${skills.length} skills (profile: ${profileName})\n`);
}

// ---------------------------------------------------------------------------
// Default sync-skills executor
// ---------------------------------------------------------------------------

function runSyncSkillsBin(workspaceRoot: string): void {
  const result = spawnSync('sync-skills', [], {
    cwd: workspaceRoot,
    env: { ...process.env, INIT_CWD: workspaceRoot },
    stdio: 'inherit',
    shell: true,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`sync-skills exited with code ${result.status ?? 'unknown'}`);
  }
}

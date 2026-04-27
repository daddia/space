import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { writeLockfile, hashSkillContent, LOCKFILE_NAME } from './lockfile.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Absolute path to the profiles directory bundled inside @daddia/space.
 * Profiles are copied from packages/skills/profiles/ at build time and shipped
 * in the package's `profiles/` directory alongside `dist/`.
 */
export const BUNDLED_PROFILES_DIR = path.join(import.meta.dirname, '..', '..', 'profiles');

export const VALID_PROFILE_NAMES = ['minimal', 'domain-team', 'platform', 'full'] as const;
export type ValidProfileName = (typeof VALID_PROFILE_NAMES)[number];

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class UnknownProfileError extends Error {
  constructor(profileName: string) {
    super(`Unknown profile '${profileName}'. Valid profiles: ${VALID_PROFILE_NAMES.join(', ')}`);
    this.name = 'UnknownProfileError';
  }
}

export class MalformedProfileFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedProfileFileError';
  }
}

export class NpxSkillsError extends Error {
  constructor(
    public readonly exitCode: number | null,
    cause?: Error,
  ) {
    const detail = cause ? cause.message : `exited with code ${exitCode ?? 'unknown'}`;
    super(`npx skills add failed: ${detail}`);
    this.name = 'NpxSkillsError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileYaml {
  name?: string;
  skills?: unknown;
}

interface WorkspaceProfileYaml {
  name?: string;
}

/**
 * Injectable executor used to invoke `npx skills` commands.
 * The default implementation uses spawnSync with stdio: 'inherit'.
 * Override in tests to avoid real network calls.
 */
export type NpxRunner = (args: string[], cwd: string) => { status: number | null; error?: Error };

// ---------------------------------------------------------------------------
// Profile resolution
// ---------------------------------------------------------------------------

/**
 * Determines the active profile name using the precedence:
 *   1. --profile flag value (profileFlag argument)
 *   2. `name` field in .space/profile.yaml
 *   3. 'full' (default)
 *
 * Throws MalformedProfileFileError if .space/profile.yaml cannot be parsed.
 */
export function resolveProfileName(workspaceRoot: string, profileFlag?: string): string {
  if (profileFlag) return profileFlag;

  const profileYamlPath = path.join(workspaceRoot, '.space', 'profile.yaml');
  if (existsSync(profileYamlPath)) {
    const raw = readFileSync(profileYamlPath, 'utf-8');
    let data: WorkspaceProfileYaml | null;
    try {
      data = parse(raw) as WorkspaceProfileYaml | null;
    } catch (err) {
      throw new MalformedProfileFileError(
        `.space/profile.yaml: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
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
 * Reads the named profile from the bundled profiles directory and returns the
 * list of skill names it activates.
 *
 * Throws UnknownProfileError when the profile YAML does not exist in the
 * bundled profiles directory.
 */
export function loadBundledProfile(
  profileName: string,
  profilesDir: string = BUNDLED_PROFILES_DIR,
): string[] {
  const profilePath = path.join(profilesDir, `${profileName}.yaml`);

  if (!existsSync(profilePath)) {
    throw new UnknownProfileError(profileName);
  }

  const raw = readFileSync(profilePath, 'utf-8');
  let data: ProfileYaml | null;
  try {
    data = parse(raw) as ProfileYaml | null;
  } catch (err) {
    throw new MalformedProfileFileError(
      `Profile '${profileName}' has invalid YAML: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!data || !Array.isArray(data.skills)) {
    throw new MalformedProfileFileError(
      `Profile '${profileName}' has invalid YAML — expected a "skills" list`,
    );
  }

  return (data.skills as unknown[]).filter((s): s is string => typeof s === 'string');
}

// ---------------------------------------------------------------------------
// Installed skills scanning
// ---------------------------------------------------------------------------

function scanInstalledSkills(
  agentSkillsDir: string,
  requestedSkills: string[],
): Array<{ name: string; contentHash: string }> {
  const entries: Array<{ name: string; contentHash: string }> = [];
  for (const name of requestedSkills) {
    const skillMd = path.join(agentSkillsDir, name, 'SKILL.md');
    if (existsSync(skillMd)) {
      entries.push({ name, contentHash: hashSkillContent(skillMd) });
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Default npx runner
// ---------------------------------------------------------------------------

function defaultNpxRunner(args: string[], cwd: string): { status: number | null; error?: Error } {
  const result = spawnSync('npx', args, { cwd, stdio: 'inherit', shell: false });
  return { status: result.status, error: result.error };
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export interface SyncSkillsOptions {
  workspaceRoot: string;
  profileName: string;
  skills: string[];
  /** Override the npx executor; defaults to spawnSync. Used in tests. */
  runNpx?: NpxRunner;
}

/**
 * Invokes `npx skills@latest add daddia/skills --skill <name> ...` for all
 * skills in the resolved profile, then writes `skills-lock.json` at the
 * workspace root.
 *
 * Throws NpxSkillsError when the npx invocation fails.
 */
export function syncSkills(opts: SyncSkillsOptions): void {
  const { workspaceRoot, profileName, skills, runNpx = defaultNpxRunner } = opts;

  const npxArgs = [
    'skills@latest',
    'add',
    'daddia/skills',
    ...skills.flatMap((n) => ['--skill', n]),
  ];

  const result = runNpx(npxArgs, workspaceRoot);

  if (result.error) {
    throw new NpxSkillsError(null, result.error);
  }
  if (result.status !== 0) {
    throw new NpxSkillsError(result.status);
  }

  const agentSkillsDir = path.join(workspaceRoot, '.agents', 'skills');
  const installedSkills = scanInstalledSkills(agentSkillsDir, skills);

  writeLockfile(workspaceRoot, {
    version: 1,
    source: 'daddia/skills',
    ref: 'latest',
    profile: profileName,
    skills: installedSkills,
    syncedAt: new Date().toISOString(),
  });

  process.stdout.write(
    `space: synced ${installedSkills.length} skills (profile: ${profileName})\n`,
  );
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------

export interface InstallSkillsOptions {
  workspaceRoot: string;
  /** Override the npx executor; defaults to spawnSync. Used in tests. */
  runNpx?: NpxRunner;
}

/**
 * Reads `skills-lock.json` and invokes `npx skills@latest install --lockfile
 * <path>` to restore the pinned skills into `.agents/skills/`.
 *
 * Throws an error when `skills-lock.json` is absent or the npx invocation fails.
 */
export function installSkills(opts: InstallSkillsOptions): void {
  const { workspaceRoot, runNpx = defaultNpxRunner } = opts;

  const lockfilePath = path.join(workspaceRoot, LOCKFILE_NAME);
  if (!existsSync(lockfilePath)) {
    throw new Error(`${LOCKFILE_NAME} not found; run \`space skills sync\` first`);
  }

  const result = runNpx(['skills@latest', 'install', '--lockfile', lockfilePath], workspaceRoot);

  if (result.error) {
    throw new Error(`npx skills install failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`npx skills install exited with code ${result.status ?? 'unknown'}`);
  }

  process.stdout.write('space: skills installed from skills-lock.json\n');
}

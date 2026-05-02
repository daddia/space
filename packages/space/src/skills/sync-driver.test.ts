import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {
  resolveProfileName,
  loadBundledProfile,
  syncSkills,
  installSkills,
  UnknownProfileError,
  MalformedProfileFileError,
  NpxSkillsError,
  VALID_PROFILE_NAMES,
  BUNDLED_PROFILES_DIR,
} from './sync-driver.js';
import { readLockfile } from './lockfile.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeWorkspace(base: string): Promise<string> {
  await mkdir(path.join(base, '.space'), { recursive: true });
  return base;
}

/**
 * Pre-creates SKILL.md files in .agents/skills/ to simulate what
 * `npx skills add` would produce, then returns a no-op NpxRunner.
 */
function plantSkills(workspaceRoot: string, skillNames: string[]): void {
  const agentSkillsDir = path.join(workspaceRoot, '.agents', 'skills');
  for (const name of skillNames) {
    mkdirSync(path.join(agentSkillsDir, name), { recursive: true });
    writeFileSync(
      path.join(agentSkillsDir, name, 'SKILL.md'),
      `---\nname: ${name}\ndescription: Test skill ${name}.\n---\n# ${name}\n`,
    );
  }
}

// ---------------------------------------------------------------------------
// resolveProfileName
// ---------------------------------------------------------------------------

describe('resolveProfileName', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'sync-driver-'));
    await makeWorkspace(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns the --profile flag value when provided', () => {
    expect(resolveProfileName(tempDir, 'domain-team')).toBe('domain-team');
  });

  it('reads the name from .space/profile.yaml when no flag is given', async () => {
    await writeFile(path.join(tempDir, '.space', 'profile.yaml'), 'name: platform\n');
    expect(resolveProfileName(tempDir)).toBe('platform');
  });

  it('falls back to "full" when neither flag nor .space/profile.yaml is present', () => {
    expect(resolveProfileName(tempDir)).toBe('full');
  });

  it('flag takes precedence over .space/profile.yaml', async () => {
    await writeFile(path.join(tempDir, '.space', 'profile.yaml'), 'name: minimal\n');
    expect(resolveProfileName(tempDir, 'platform')).toBe('platform');
  });

  it('falls back to "full" when .space/profile.yaml has no name field', async () => {
    await writeFile(path.join(tempDir, '.space', 'profile.yaml'), 'description: orphan\n');
    expect(resolveProfileName(tempDir)).toBe('full');
  });

  it('throws MalformedProfileFileError when .space/profile.yaml is invalid YAML', async () => {
    await writeFile(path.join(tempDir, '.space', 'profile.yaml'), 'name: [\nunclosed bracket\n');
    expect(() => resolveProfileName(tempDir)).toThrow(MalformedProfileFileError);
  });
});

// ---------------------------------------------------------------------------
// loadBundledProfile
// ---------------------------------------------------------------------------

describe('loadBundledProfile (bundled profiles)', () => {
  it('loads the minimal profile from the bundled directory', () => {
    const skills = loadBundledProfile('minimal');
    expect(skills).toContain('implement');
    expect(skills).toContain('review-code');
    expect(Array.isArray(skills)).toBe(true);
  });

  it('loads the domain-team profile from the bundled directory', () => {
    const skills = loadBundledProfile('domain-team');
    expect(skills.length).toBeGreaterThan(4);
    expect(skills).toContain('write-backlog');
  });

  it('loads the platform profile from the bundled directory', () => {
    const skills = loadBundledProfile('platform');
    expect(skills).toContain('plan-adr');
  });

  it('loads the full profile from the bundled directory', () => {
    const skills = loadBundledProfile('full');
    expect(skills.length).toBeGreaterThanOrEqual(20);
  });

  it('throws UnknownProfileError for an unrecognised profile name', () => {
    expect(() => loadBundledProfile('ghost')).toThrow(UnknownProfileError);
  });

  it('error message lists valid profile names', () => {
    expect(() => loadBundledProfile('ghost')).toThrow(
      expect.objectContaining({
        message: expect.stringContaining(VALID_PROFILE_NAMES.join(', ')),
      }),
    );
  });
});

describe('loadBundledProfile (injected profiles dir)', () => {
  let profilesDir: string;

  beforeEach(async () => {
    profilesDir = await mkdtemp(path.join(tmpdir(), 'profiles-'));
  });

  afterEach(async () => {
    await rm(profilesDir, { recursive: true, force: true });
  });

  it('returns the skills list for a valid profile', async () => {
    await writeFile(
      path.join(profilesDir, 'test.yaml'),
      'name: test\nskills:\n  - implement\n  - review-code\n',
    );
    const skills = loadBundledProfile('test', profilesDir);
    expect(skills).toEqual(['implement', 'review-code']);
  });

  it('throws UnknownProfileError when the profile YAML does not exist', () => {
    expect(() => loadBundledProfile('missing', profilesDir)).toThrow(UnknownProfileError);
  });

  it('throws MalformedProfileFileError when the YAML has no skills list', async () => {
    await writeFile(path.join(profilesDir, 'bad.yaml'), 'name: bad\n');
    expect(() => loadBundledProfile('bad', profilesDir)).toThrow(MalformedProfileFileError);
  });
});

// ---------------------------------------------------------------------------
// syncSkills
// ---------------------------------------------------------------------------

describe('syncSkills', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'sync-driver-'));
    await makeWorkspace(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes skills-lock.json at the workspace root after a successful sync', () => {
    plantSkills(tempDir, ['implement', 'review-code']);
    syncSkills({
      workspaceRoot: tempDir,
      profileName: 'minimal',
      skills: ['implement', 'review-code'],
      runNpx: () => ({ status: 0 }),
    });

    expect(existsSync(path.join(tempDir, 'skills-lock.json'))).toBe(true);
  });

  it('lockfile contains version: 1, source: "daddia/skills", and profile name', () => {
    plantSkills(tempDir, ['implement']);
    syncSkills({
      workspaceRoot: tempDir,
      profileName: 'domain-team',
      skills: ['implement'],
      runNpx: () => ({ status: 0 }),
    });

    const lock = readLockfile(tempDir);
    expect(lock?.version).toBe(1);
    expect(lock?.source).toBe('daddia/skills');
    expect(lock?.profile).toBe('domain-team');
  });

  it('lockfile contains one entry per successfully installed skill', () => {
    plantSkills(tempDir, ['implement', 'review-code']);
    syncSkills({
      workspaceRoot: tempDir,
      profileName: 'minimal',
      skills: ['implement', 'review-code'],
      runNpx: () => ({ status: 0 }),
    });

    const lock = readLockfile(tempDir);
    expect(lock?.skills).toHaveLength(2);
    expect(lock?.skills.map((s) => s.name)).toContain('implement');
    expect(lock?.skills.map((s) => s.name)).toContain('review-code');
  });

  it('each lockfile skill entry has a non-empty contentHash', () => {
    plantSkills(tempDir, ['implement']);
    syncSkills({
      workspaceRoot: tempDir,
      profileName: 'minimal',
      skills: ['implement'],
      runNpx: () => ({ status: 0 }),
    });

    const lock = readLockfile(tempDir);
    const entry = lock?.skills[0];
    expect(entry?.contentHash).toBeTruthy();
    expect(typeof entry?.contentHash).toBe('string');
    expect(entry?.contentHash.length).toBe(64); // SHA-256 hex
  });

  it('lockfile syncedAt is a valid ISO 8601 timestamp', () => {
    plantSkills(tempDir, ['implement']);
    syncSkills({
      workspaceRoot: tempDir,
      profileName: 'minimal',
      skills: ['implement'],
      runNpx: () => ({ status: 0 }),
    });

    const lock = readLockfile(tempDir);
    expect(() => new Date(lock!.syncedAt).toISOString()).not.toThrow();
  });

  it('throws NpxSkillsError when the npx runner returns a non-zero exit code', () => {
    const failRunner = () => ({ status: 1 });
    expect(() =>
      syncSkills({
        workspaceRoot: tempDir,
        profileName: 'minimal',
        skills: ['implement'],
        runNpx: failRunner,
      }),
    ).toThrow(NpxSkillsError);
  });

  it('throws NpxSkillsError when the npx runner reports an error', () => {
    const errorRunner = () => ({ status: null, error: new Error('ENOENT: npx not found') });
    expect(() =>
      syncSkills({
        workspaceRoot: tempDir,
        profileName: 'minimal',
        skills: ['implement'],
        runNpx: errorRunner,
      }),
    ).toThrow(NpxSkillsError);
  });

  it('does not write skills-lock.json when npx fails', () => {
    const failRunner = () => ({ status: 1 });
    try {
      syncSkills({
        workspaceRoot: tempDir,
        profileName: 'minimal',
        skills: ['implement'],
        runNpx: failRunner,
      });
    } catch {
      // expected
    }
    expect(existsSync(path.join(tempDir, 'skills-lock.json'))).toBe(false);
  });

  it('invokes npx with the correct arguments', () => {
    const capturedArgs: string[][] = [];
    const capturingRunner = (args: string[]) => {
      capturedArgs.push(args);
      return { status: 0 };
    };

    const skills = ['implement', 'review-code'];
    syncSkills({
      workspaceRoot: tempDir,
      profileName: 'minimal',
      skills,
      runNpx: capturingRunner,
    });

    expect(capturedArgs[0]).toEqual([
      'skills@latest',
      'add',
      'daddia/skills',
      '--yes',
      '--skill',
      'implement',
      '--skill',
      'review-code',
    ]);
  });

  it('prints a summary on success', () => {
    plantSkills(tempDir, ['implement']);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    syncSkills({
      workspaceRoot: tempDir,
      profileName: 'minimal',
      skills: ['implement'],
      runNpx: () => ({ status: 0 }),
    });
    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('synced 1 skills (profile: minimal)'),
    );
    stdoutSpy.mockRestore();
  });

  it('skills not found in .agents/skills/ after install are omitted from the lockfile', () => {
    const emptyRunner = () => ({ status: 0 });
    syncSkills({
      workspaceRoot: tempDir,
      profileName: 'minimal',
      skills: ['implement'],
      runNpx: emptyRunner,
    });

    const lock = readLockfile(tempDir);
    expect(lock?.skills).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// installSkills
// ---------------------------------------------------------------------------

describe('installSkills', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'sync-driver-'));
    await makeWorkspace(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('throws when skills-lock.json does not exist', () => {
    expect(() => installSkills({ workspaceRoot: tempDir })).toThrow(
      expect.objectContaining({ message: expect.stringContaining('skills-lock.json not found') }),
    );
  });

  it('invokes npx skills@latest install --lockfile <path>', async () => {
    await writeFile(
      path.join(tempDir, 'skills-lock.json'),
      JSON.stringify({
        version: 1,
        source: 'daddia/skills',
        ref: 'latest',
        profile: 'minimal',
        skills: [],
        syncedAt: new Date().toISOString(),
      }),
    );

    const capturedArgs: string[][] = [];
    const capturingRunner = (args: string[]) => {
      capturedArgs.push(args);
      return { status: 0 };
    };

    installSkills({ workspaceRoot: tempDir, runNpx: capturingRunner });

    expect(capturedArgs[0]?.[0]).toBe('skills@latest');
    expect(capturedArgs[0]?.[1]).toBe('install');
    expect(capturedArgs[0]?.[2]).toBe('--lockfile');
    expect(capturedArgs[0]?.[3]).toContain('skills-lock.json');
  });

  it('throws when npx install returns a non-zero exit code', async () => {
    await writeFile(
      path.join(tempDir, 'skills-lock.json'),
      JSON.stringify({
        version: 1,
        source: 'daddia/skills',
        ref: 'latest',
        profile: 'minimal',
        skills: [],
        syncedAt: '',
      }),
    );

    const failRunner = () => ({ status: 1 });
    expect(() => installSkills({ workspaceRoot: tempDir, runNpx: failRunner })).toThrow(
      expect.objectContaining({ message: expect.stringContaining('exited with code 1') }),
    );
  });

  it('prints a summary on successful install', async () => {
    await writeFile(
      path.join(tempDir, 'skills-lock.json'),
      JSON.stringify({
        version: 1,
        source: 'daddia/skills',
        ref: 'latest',
        profile: 'minimal',
        skills: [],
        syncedAt: '',
      }),
    );

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    installSkills({ workspaceRoot: tempDir, runNpx: () => ({ status: 0 }) });
    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('skills installed from skills-lock.json'),
    );
    stdoutSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// BUNDLED_PROFILES_DIR sanity check
// ---------------------------------------------------------------------------

describe('BUNDLED_PROFILES_DIR', () => {
  it('points to a directory that exists', () => {
    expect(existsSync(BUNDLED_PROFILES_DIR)).toBe(true);
  });

  it('contains a YAML file for each valid profile name', () => {
    for (const name of VALID_PROFILE_NAMES) {
      expect(existsSync(path.join(BUNDLED_PROFILES_DIR, `${name}.yaml`))).toBe(true);
    }
  });
});

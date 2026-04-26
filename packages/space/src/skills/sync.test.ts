import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {
  resolveProfileName,
  loadSkillsProfile,
  syncSkillsWithProfile,
  SkillsProfileNotFoundError,
} from './sync.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeWorkspace(base: string): Promise<string> {
  await mkdir(path.join(base, '.space'), { recursive: true });
  return base;
}

async function makeSkillsPackage(
  workspaceRoot: string,
  skills: string[],
  profiles: Record<string, string> = {},
): Promise<string> {
  const skillsDir = path.join(workspaceRoot, 'node_modules', '@daddia', 'skills');
  await mkdir(skillsDir, { recursive: true });
  await writeFile(
    path.join(skillsDir, 'package.json'),
    JSON.stringify({ name: '@daddia/skills', version: '0.3.0' }),
  );

  for (const name of skills) {
    const d = path.join(skillsDir, name);
    await mkdir(d, { recursive: true });
    await writeFile(path.join(d, 'SKILL.md'), `---\nname: ${name}\n---\n`);
  }

  if (Object.keys(profiles).length > 0) {
    await mkdir(path.join(skillsDir, 'profiles'), { recursive: true });
    for (const [filename, content] of Object.entries(profiles)) {
      await writeFile(path.join(skillsDir, 'profiles', filename), content);
    }
  }

  return skillsDir;
}

// ---------------------------------------------------------------------------
// resolveProfileName
// ---------------------------------------------------------------------------

describe('resolveProfileName', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'sync-skills-'));
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
});

// ---------------------------------------------------------------------------
// loadSkillsProfile
// ---------------------------------------------------------------------------

describe('loadSkillsProfile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'sync-skills-'));
    await makeWorkspace(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns the skills list for a valid profile', async () => {
    await makeSkillsPackage(tempDir, ['implement', 'review-code'], {
      'minimal.yaml': 'name: minimal\nskills:\n  - implement\n  - review-code\n',
    });
    const skills = loadSkillsProfile(tempDir, 'minimal');
    expect(skills).toEqual(['implement', 'review-code']);
  });

  it('throws SkillsProfileNotFoundError when profile YAML does not exist', async () => {
    await makeSkillsPackage(tempDir, []);
    expect(() => loadSkillsProfile(tempDir, 'ghost')).toThrow(SkillsProfileNotFoundError);
  });

  it('throws SkillsProfileNotFoundError with the canonical message', async () => {
    await makeSkillsPackage(tempDir, []);
    expect(() => loadSkillsProfile(tempDir, 'ghost')).toThrow(
      "Profile 'ghost' not found in @daddia/skills/profiles/",
    );
  });

  it('warns to stderr and skips skills not found in @daddia/skills source', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await makeSkillsPackage(tempDir, ['implement'], {
      'test.yaml': 'name: test\nskills:\n  - implement\n  - phantom-skill\n',
    });

    const skills = loadSkillsProfile(tempDir, 'test');
    expect(skills).toEqual(['implement']);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Skill 'phantom-skill' listed in profile not found in source; skipped",
      ),
    );
    stderrSpy.mockRestore();
  });

  it('returns an empty array when all listed skills are missing from source', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await makeSkillsPackage(tempDir, [], {
      'empty.yaml': 'name: empty\nskills:\n  - ghost-a\n  - ghost-b\n',
    });

    const skills = loadSkillsProfile(tempDir, 'empty');
    expect(skills).toHaveLength(0);
    stderrSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// syncSkillsWithProfile
// ---------------------------------------------------------------------------

describe('syncSkillsWithProfile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'sync-skills-'));
    await makeWorkspace(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes .space/.skill-filter.json before invoking the executor', async () => {
    let capturedFilterContent: string | null = null;
    const executor = (root: string) => {
      const p = path.join(root, '.space', '.skill-filter.json');
      capturedFilterContent = existsSync(p) ? readFileSync(p, 'utf-8') : null;
    };

    await syncSkillsWithProfile(tempDir, 'minimal', ['implement', 'review-code'], executor);
    const parsed = JSON.parse(capturedFilterContent!);
    expect(parsed.skills).toEqual(['implement', 'review-code']);
  });

  it('deletes .space/.skill-filter.json after the executor succeeds', async () => {
    await syncSkillsWithProfile(tempDir, 'minimal', ['implement'], () => {});
    expect(existsSync(path.join(tempDir, '.space', '.skill-filter.json'))).toBe(false);
  });

  it('deletes .space/.skill-filter.json even when the executor throws', async () => {
    const failingExecutor = () => {
      throw new Error('sync-skills failed');
    };
    await expect(
      syncSkillsWithProfile(tempDir, 'minimal', ['implement'], failingExecutor),
    ).rejects.toThrow('sync-skills failed');

    expect(existsSync(path.join(tempDir, '.space', '.skill-filter.json'))).toBe(false);
  });

  it('prints "space: synced N skills (profile: name)" on success', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await syncSkillsWithProfile(tempDir, 'minimal', ['implement', 'review-code'], () => {});
    expect(stdoutSpy).toHaveBeenCalledWith('space: synced 2 skills (profile: minimal)\n');
    stdoutSpy.mockRestore();
  });

  it('does not print the success message when the executor throws', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await expect(
      syncSkillsWithProfile(tempDir, 'minimal', ['implement'], () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow();
    expect(stdoutSpy).not.toHaveBeenCalledWith(expect.stringContaining('synced'));
    stdoutSpy.mockRestore();
  });
});

// Helpers used in tests are all imported at the top of this file.

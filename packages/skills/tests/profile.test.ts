import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadProfile, resolveProfile } from '../src/profile.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'space-profile-test-'));
}

const SAMPLE_SKILL_MD = `---
name: implement
description: Implements code for a story. Do NOT use for reviews.
allowed-tools:
  - Read
  - Write
stage: stable
produces:
  - code
consumes: []
version: '1.0.0'
---

# Implement

Body.
`;

function createProfilesDir(rootDir: string): void {
  fs.mkdirSync(path.join(rootDir, 'profiles'), { recursive: true });
}

function writeProfile(rootDir: string, name: string, content: string): void {
  fs.writeFileSync(path.join(rootDir, 'profiles', `${name}.yaml`), content);
}

function writeSkillDir(rootDir: string, name: string): void {
  const skillDir = path.join(rootDir, name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), SAMPLE_SKILL_MD);
}

// ---------------------------------------------------------------------------
// loadProfile
// ---------------------------------------------------------------------------

describe('loadProfile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    createProfilesDir(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads a profile by name', () => {
    writeProfile(
      tmpDir,
      'minimal',
      'name: minimal\ndescription: Minimal set.\nskills:\n  - implement\n  - create-mr\n',
    );
    const profile = loadProfile('minimal', tmpDir);
    expect(profile.name).toBe('minimal');
    expect(profile.description).toBe('Minimal set.');
    expect(profile.skills).toEqual(['implement', 'create-mr']);
  });

  it('accepts .yml extension', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'profiles', 'test.yml'),
      'name: test\ndescription: Test.\nskills:\n  - implement\n',
    );
    const profile = loadProfile('test', tmpDir);
    expect(profile.name).toBe('test');
  });

  it('throws with list of available profiles when name is unknown', () => {
    writeProfile(tmpDir, 'minimal', 'name: minimal\nskills:\n  - implement\n');
    expect(() => loadProfile('nonexistent', tmpDir)).toThrow(/nonexistent/);
    expect(() => loadProfile('nonexistent', tmpDir)).toThrow(/minimal/);
  });

  it('handles a profile with no description field', () => {
    writeProfile(tmpDir, 'nodesc', 'name: nodesc\nskills:\n  - implement\n');
    const profile = loadProfile('nodesc', tmpDir);
    expect(profile.description).toBe('');
  });
});

// ---------------------------------------------------------------------------
// resolveProfile
// ---------------------------------------------------------------------------

describe('resolveProfile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    createProfilesDir(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves all skills that exist on disk', () => {
    writeSkillDir(tmpDir, 'implement');
    writeSkillDir(tmpDir, 'create-mr');
    writeProfile(
      tmpDir,
      'minimal',
      'name: minimal\ndescription: Minimal.\nskills:\n  - implement\n  - create-mr\n',
    );
    const { profile, skills, missing } = resolveProfile('minimal', tmpDir);
    expect(profile.name).toBe('minimal');
    expect(skills.map((s) => s.name)).toEqual(expect.arrayContaining(['implement', 'create-mr']));
    expect(missing).toEqual([]);
  });

  it('reports missing skills explicitly rather than throwing', () => {
    writeSkillDir(tmpDir, 'implement');
    writeProfile(
      tmpDir,
      'partial',
      'name: partial\nskills:\n  - implement\n  - missing-skill\n',
    );
    const { skills, missing } = resolveProfile('partial', tmpDir);
    expect(skills.map((s) => s.name)).toEqual(['implement']);
    expect(missing).toEqual(['missing-skill']);
  });

  it('returns missing for all skills when none exist on disk', () => {
    writeProfile(
      tmpDir,
      'empty-disk',
      'name: empty-disk\nskills:\n  - skill-a\n  - skill-b\n  - skill-c\n',
    );
    const { skills, missing } = resolveProfile('empty-disk', tmpDir);
    expect(skills).toEqual([]);
    expect(missing).toEqual(['skill-a', 'skill-b', 'skill-c']);
  });

  it('skills[] has exactly N loaded Skill objects when 1 of N+1 is missing', () => {
    const count = 5;
    for (let i = 1; i <= count; i++) {
      writeSkillDir(tmpDir, `skill-${i}`);
    }
    const skillLines = Array.from({ length: count + 1 }, (_, i) => `  - skill-${i + 1}`).join('\n');
    writeProfile(tmpDir, 'test', `name: test\nskills:\n${skillLines}\n`);

    // skill-6 does not exist
    const { skills, missing } = resolveProfile('test', tmpDir);
    expect(skills).toHaveLength(count);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toBe(`skill-${count + 1}`);
  });
});

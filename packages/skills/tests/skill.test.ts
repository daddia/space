import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadSkill, loadAllSkills } from '../src/skill.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'space-skills-test-'));
}

function writeSkill(rootDir: string, name: string, content: string): string {
  const skillDir = path.join(rootDir, name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);
  return skillDir;
}

const SAMPLE_SKILL_MD = `---
name: write-product
description: Drafts product.md. Do NOT use for roadmaps.
allowed-tools:
  - Read
  - Write
artefact: product.md
track: strategy
role: pm
stage: stable
produces:
  - product.md
consumes: []
version: '1.0.0'
---

# Write Product

Body content here.
`;

// ---------------------------------------------------------------------------
// loadSkill
// ---------------------------------------------------------------------------

describe('loadSkill', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads a skill with correct name from directory basename', () => {
    const skillDir = writeSkill(tmpDir, 'write-product', SAMPLE_SKILL_MD);
    const skill = loadSkill(skillDir);
    expect(skill.name).toBe('write-product');
  });

  it('sets path to the absolute skill directory', () => {
    const skillDir = writeSkill(tmpDir, 'write-product', SAMPLE_SKILL_MD);
    const skill = loadSkill(skillDir);
    expect(skill.path).toBe(skillDir);
  });

  it('parses frontmatter fields correctly', () => {
    const skillDir = writeSkill(tmpDir, 'write-product', SAMPLE_SKILL_MD);
    const skill = loadSkill(skillDir);
    expect(skill.frontmatter.name).toBe('write-product');
    expect(skill.frontmatter.stage).toBe('stable');
    expect(skill.frontmatter['allowed-tools']).toEqual(['Read', 'Write']);
  });

  it('returns body without frontmatter', () => {
    const skillDir = writeSkill(tmpDir, 'write-product', SAMPLE_SKILL_MD);
    const skill = loadSkill(skillDir);
    expect(skill.body).toContain('# Write Product');
    expect(skill.body.replace(/^\n+/, '').startsWith('# Write Product')).toBe(true);
    expect(skill.body).not.toContain('name: write-product');
  });

  it('lists template*.md files in templates', () => {
    const skillDir = writeSkill(tmpDir, 'write-product', SAMPLE_SKILL_MD);
    fs.writeFileSync(path.join(skillDir, 'template.md'), '# Template');
    fs.writeFileSync(path.join(skillDir, 'template-pitch.md'), '# Pitch template');
    const skill = loadSkill(skillDir);
    expect(skill.templates).toContain('template.md');
    expect(skill.templates).toContain('template-pitch.md');
    expect(skill.templates).not.toContain('SKILL.md');
  });

  it('returns empty templates array when no template files exist', () => {
    const skillDir = writeSkill(tmpDir, 'implement', SAMPLE_SKILL_MD);
    const skill = loadSkill(skillDir);
    expect(skill.templates).toEqual([]);
  });

  it('detects examples directory', () => {
    const skillDir = writeSkill(tmpDir, 'write-product', SAMPLE_SKILL_MD);
    fs.mkdirSync(path.join(skillDir, 'examples'));
    fs.writeFileSync(path.join(skillDir, 'examples', 'example.md'), '# Example');
    const skill = loadSkill(skillDir);
    expect(skill.hasExamples).toBe(true);
  });

  it('reports hasExamples false when no examples directory', () => {
    const skillDir = writeSkill(tmpDir, 'implement', SAMPLE_SKILL_MD);
    const skill = loadSkill(skillDir);
    expect(skill.hasExamples).toBe(false);
  });

  it('throws when SKILL.md is absent', () => {
    const emptyDir = path.join(tmpDir, 'no-skill');
    fs.mkdirSync(emptyDir);
    expect(() => loadSkill(emptyDir)).toThrow(/SKILL\.md not found/);
  });
});

// ---------------------------------------------------------------------------
// loadAllSkills
// ---------------------------------------------------------------------------

describe('loadAllSkills', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads all skill directories that contain SKILL.md', () => {
    writeSkill(tmpDir, 'write-product', SAMPLE_SKILL_MD);
    writeSkill(tmpDir, 'implement', SAMPLE_SKILL_MD);
    writeSkill(tmpDir, 'review-code', SAMPLE_SKILL_MD);
    const skills = loadAllSkills(tmpDir);
    const names = skills.map((s) => s.name);
    expect(names).toContain('write-product');
    expect(names).toContain('implement');
    expect(names).toContain('review-code');
  });

  it('skips directories without SKILL.md', () => {
    writeSkill(tmpDir, 'write-product', SAMPLE_SKILL_MD);
    fs.mkdirSync(path.join(tmpDir, 'not-a-skill'));
    const skills = loadAllSkills(tmpDir);
    expect(skills.map((s) => s.name)).not.toContain('not-a-skill');
  });

  it('skips reserved directories (bin, src, profiles, views, etc.)', () => {
    writeSkill(tmpDir, 'write-product', SAMPLE_SKILL_MD);
    for (const reserved of ['bin', 'src', 'dist', 'profiles', 'views', 'space-index', 'node_modules', 'tests']) {
      const dir = path.join(tmpDir, reserved);
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, 'SKILL.md'), SAMPLE_SKILL_MD);
    }
    const skills = loadAllSkills(tmpDir);
    expect(skills.map((s) => s.name)).toEqual(['write-product']);
  });

  it('returns skills sorted alphabetically', () => {
    writeSkill(tmpDir, 'write-product', SAMPLE_SKILL_MD);
    writeSkill(tmpDir, 'implement', SAMPLE_SKILL_MD);
    writeSkill(tmpDir, 'create-mr', SAMPLE_SKILL_MD);
    const skills = loadAllSkills(tmpDir);
    const names = skills.map((s) => s.name);
    expect(names).toEqual([...names].sort());
  });

  it('returns empty array when rootDir has no skill directories', () => {
    const skills = loadAllSkills(tmpDir);
    expect(skills).toEqual([]);
  });
});

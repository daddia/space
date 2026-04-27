import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { publicStrip } from '../../src/lint/public-strip.js';
import { loadSkill } from '../../src/skill.js';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'space-skills-public-strip-'));
}

function writeSkillDir(rootDir: string, name: string, content: string): string {
  const skillDir = path.join(rootDir, name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);
  return skillDir;
}

const STABLE_SKILL_MD = `---
name: write-product
description: Drafts product.md for a domain. Do NOT use for roadmaps.
track: strategy
role: pm
stage: stable
---

# Write Product

Body content here.
`;

describe('publicStrip', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes for a stable skill with valid name and description', () => {
    const skillDir = writeSkillDir(tmpDir, 'write-product', STABLE_SKILL_MD);
    const skill = loadSkill(skillDir);
    expect(publicStrip(skill, [])).toHaveLength(0);
  });

  it('skips a skill with no stage field', () => {
    const noStageMd = STABLE_SKILL_MD.replace('stage: stable\n', '');
    const skillDir = writeSkillDir(tmpDir, 'write-product', noStageMd);
    const skill = loadSkill(skillDir);
    expect(publicStrip(skill, [])).toHaveLength(0);
  });

  it('skips a draft skill', () => {
    const draftMd = STABLE_SKILL_MD.replace('stage: stable', 'stage: draft');
    const skillDir = writeSkillDir(tmpDir, 'write-product', draftMd);
    const skill = loadSkill(skillDir);
    expect(publicStrip(skill, [])).toHaveLength(0);
  });

  it('skips a deprecated skill', () => {
    const deprecatedMd = STABLE_SKILL_MD.replace('stage: stable', 'stage: deprecated');
    const skillDir = writeSkillDir(tmpDir, 'old-skill', deprecatedMd);
    const skill = loadSkill(skillDir);
    expect(publicStrip(skill, [])).toHaveLength(0);
  });

  it('emits error when the frontmatter uses "desc:" instead of "description:"', () => {
    const badMd = `---
name: write-product
desc: This uses the wrong YAML key so description strips away
stage: stable
---

# Write Product

Body content.
`;
    const skillDir = writeSkillDir(tmpDir, 'write-product', badMd);
    const skill = loadSkill(skillDir);
    const result = publicStrip(skill, []);
    const descDiag = result.find((d) => d.message.includes('"description"'));
    expect(descDiag).toBeDefined();
    expect(descDiag!.rule).toBe('public-strip');
    expect(descDiag!.severity).toBe('error');
    expect(descDiag!.skill).toBe('write-product');
  });

  it('emits error when name is absent from the frontmatter', () => {
    const badMd = `---
description: Drafts product.md for a domain. Do NOT use for roadmaps.
stage: stable
---

# Write Product

Body content.
`;
    const skillDir = writeSkillDir(tmpDir, 'write-product', badMd);
    const skill = loadSkill(skillDir);
    const result = publicStrip(skill, []);
    const nameDiag = result.find((d) => d.message.includes('"name"'));
    expect(nameDiag).toBeDefined();
    expect(nameDiag!.rule).toBe('public-strip');
    expect(nameDiag!.severity).toBe('error');
  });

  it('emits both errors when both name and description are missing', () => {
    const badMd = `---
stage: stable
---

# Body
`;
    const skillDir = writeSkillDir(tmpDir, 'test-skill', badMd);
    const skill = loadSkill(skillDir);
    const result = publicStrip(skill, []);
    const publicStripDiags = result.filter((d) => d.rule === 'public-strip');
    const missingFields = publicStripDiags.filter((d) =>
      d.message.includes('"name"') || d.message.includes('"description"'),
    );
    expect(missingFields).toHaveLength(2);
    expect(missingFields.every((d) => d.severity === 'error')).toBe(true);
  });

  it('emits an error when SKILL.md cannot be read (path does not exist)', () => {
    const skillDir = writeSkillDir(tmpDir, 'real-skill', STABLE_SKILL_MD);
    const skill = loadSkill(skillDir);
    // Overwrite path to point to a non-existent directory after loading
    const fakeSkill = { ...skill, path: path.join(tmpDir, 'nonexistent') };
    const result = publicStrip(fakeSkill, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.rule).toBe('public-strip');
    expect(result[0]!.message).toContain('could not read');
  });

  it('reports the skill name in the diagnostic', () => {
    const badMd = `---
stage: stable
---

# Body
`;
    const skillDir = writeSkillDir(tmpDir, 'named-skill', badMd);
    const skill = loadSkill(skillDir);
    const result = publicStrip(skill, []);
    expect(result.every((d) => d.skill === 'named-skill')).toBe(true);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { negativeConstraints } from '../../src/lint/negative-constraints.js';
import type { Skill } from '../../src/skill.js';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'neg-constraints-'));
}

function makeSkillDir(rootDir: string, name: string): string {
  const dir = path.join(rootDir, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeSkill(skillDir: string, body: string, templates: string[] = []): Skill {
  return {
    name: path.basename(skillDir),
    path: skillDir,
    frontmatter: { name: path.basename(skillDir), description: 'test' },
    body,
    templates,
    hasExamples: false,
    hasScripts: false,
    hasReferences: false,
  };
}

const DRAFTING_AIDE_BLOCK = `<!-- DRAFTING AIDE — DO NOT INCLUDE this block in the output -->\n`;
const BODY_WITH_NEG = `# Title\n\n## Negative constraints\n\nDo not use for X.\n`;
const BODY_WITHOUT_NEG = `# Title\n\nSome content without the constraints section.\n`;

describe('negativeConstraints', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when a skill has no templates and has ## Negative constraints in body', () => {
    const skillDir = makeSkillDir(tmpDir, 'implement');
    const skill = makeSkill(skillDir, BODY_WITH_NEG);
    expect(negativeConstraints(skill, [])).toHaveLength(0);
  });

  it('fails when a skill has no templates and is missing ## Negative constraints', () => {
    const skillDir = makeSkillDir(tmpDir, 'implement');
    const skill = makeSkill(skillDir, BODY_WITHOUT_NEG);
    const result = negativeConstraints(skill, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.rule).toBe('negative-constraints');
    expect(result[0]!.severity).toBe('error');
  });

  it('passes when a skill has a template containing the DRAFTING AIDE block', () => {
    const skillDir = makeSkillDir(tmpDir, 'write-product');
    fs.writeFileSync(path.join(skillDir, 'template.md'), DRAFTING_AIDE_BLOCK + '# Template\n');
    const skill = makeSkill(skillDir, BODY_WITHOUT_NEG, ['template.md']);
    expect(negativeConstraints(skill, [])).toHaveLength(0);
  });

  it('fails when a template is missing the DRAFTING AIDE block', () => {
    const skillDir = makeSkillDir(tmpDir, 'write-product');
    fs.writeFileSync(path.join(skillDir, 'template.md'), '# Template with no block\n');
    const skill = makeSkill(skillDir, BODY_WITHOUT_NEG, ['template.md']);
    const result = negativeConstraints(skill, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.message).toContain('template.md');
  });

  it('skips alias templates (those with an Alias: marker) from the template check', () => {
    const skillDir = makeSkillDir(tmpDir, 'design');
    fs.writeFileSync(
      path.join(skillDir, 'template.md'),
      '<!-- Alias: write-wp-design -->\n# Old template\n',
    );
    const skill = makeSkill(skillDir, BODY_WITHOUT_NEG, ['template.md']);
    // All templates are aliases, so the skill falls back to the body check
    // The body has no ## Negative constraints, so it should fail
    const result = negativeConstraints(skill, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.message).toContain('## Negative constraints');
  });
});

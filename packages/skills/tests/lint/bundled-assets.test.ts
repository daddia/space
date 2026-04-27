import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { bundledAssets } from '../../src/lint/bundled-assets.js';
import type { Skill } from '../../src/skill.js';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'space-skills-bundled-assets-'));
}

function makeSkillDir(rootDir: string, name: string): string {
  const skillDir = path.join(rootDir, name);
  fs.mkdirSync(skillDir, { recursive: true });
  return skillDir;
}

function makeSkill(dir: string, name: string, body: string): Skill {
  return {
    name,
    path: dir,
    frontmatter: { name, description: 'A test skill. Do NOT use directly.' },
    body,
    templates: [],
    hasExamples: false,
    hasScripts: false,
    hasReferences: false,
  };
}

describe('bundledAssets', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when the body contains no local asset links', () => {
    const dir = makeSkillDir(tmpDir, 'write-adr');
    const skill = makeSkill(dir, 'write-adr', 'Use [solution](space:architecture/solution.md) as reference.');
    expect(bundledAssets(skill, [])).toHaveLength(0);
  });

  it('passes when a referenced template.md exists', () => {
    const dir = makeSkillDir(tmpDir, 'write-adr');
    fs.writeFileSync(path.join(dir, 'template.md'), '# Template');
    const skill = makeSkill(dir, 'write-adr', 'Use [template.md](template.md) as a scaffold.');
    expect(bundledAssets(skill, [])).toHaveLength(0);
  });

  it('passes when a referenced example file exists', () => {
    const dir = makeSkillDir(tmpDir, 'write-adr');
    fs.mkdirSync(path.join(dir, 'examples'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'examples', 'workflow-engine.md'), '# Example');
    const skill = makeSkill(
      dir,
      'write-adr',
      'See [examples/workflow-engine.md](examples/workflow-engine.md) for reference.',
    );
    expect(bundledAssets(skill, [])).toHaveLength(0);
  });

  it('emits an error when a referenced template does not exist', () => {
    const dir = makeSkillDir(tmpDir, 'write-adr');
    const skill = makeSkill(dir, 'write-adr', 'Use [template.md](template.md) as a scaffold.');
    const result = bundledAssets(skill, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.rule).toBe('bundled-assets');
    expect(result[0]!.severity).toBe('error');
    expect(result[0]!.skill).toBe('write-adr');
    expect(result[0]!.message).toContain('"template.md"');
  });

  it('emits an error when a referenced example file does not exist', () => {
    const dir = makeSkillDir(tmpDir, 'write-adr');
    const skill = makeSkill(
      dir,
      'write-adr',
      'See [examples/missing.md](examples/missing.md) for reference.',
    );
    const result = bundledAssets(skill, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.rule).toBe('bundled-assets');
    expect(result[0]!.message).toContain('"examples/missing.md"');
  });

  it('emits one error per missing asset when multiple are missing', () => {
    const dir = makeSkillDir(tmpDir, 'write-adr');
    const body =
      'Use [template.md](template.md).\n' +
      'See [examples/missing-a.md](examples/missing-a.md).\n' +
      'See [examples/missing-b.md](examples/missing-b.md).';
    const skill = makeSkill(dir, 'write-adr', body);
    const result = bundledAssets(skill, []);
    expect(result).toHaveLength(3);
    expect(result.every((d) => d.rule === 'bundled-assets')).toBe(true);
  });

  it('does not flag http/https links', () => {
    const dir = makeSkillDir(tmpDir, 'write-adr');
    const skill = makeSkill(
      dir,
      'write-adr',
      'See [docs](https://example.com/template.md) for more.',
    );
    expect(bundledAssets(skill, [])).toHaveLength(0);
  });

  it('does not flag {source}:path cross-repo links', () => {
    const dir = makeSkillDir(tmpDir, 'write-adr');
    const skill = makeSkill(
      dir,
      'write-adr',
      'See [space:solution](space:architecture/solution.md) for context.',
    );
    expect(bundledAssets(skill, [])).toHaveLength(0);
  });

  it('does not flag non-asset local links (not template or examples/)', () => {
    const dir = makeSkillDir(tmpDir, 'write-adr');
    const skill = makeSkill(dir, 'write-adr', 'See [README](README.md) for info.');
    expect(bundledAssets(skill, [])).toHaveLength(0);
  });

  it('reports the skill name in the diagnostic', () => {
    const dir = makeSkillDir(tmpDir, 'plan-adr');
    const skill = makeSkill(dir, 'plan-adr', 'See [template.md](template.md).');
    const result = bundledAssets(skill, []);
    expect(result[0]!.skill).toBe('plan-adr');
  });
});

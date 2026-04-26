import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { parseProfileYaml, validateProfiles } from './profile-utils.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createPackageDir(skills, profiles) {
  const dir = await mkdtemp(path.join(tmpdir(), 'profile-lint-'));
  await mkdir(path.join(dir, 'bin'), { recursive: true });

  for (const { name, stage } of skills) {
    const skillDir = path.join(dir, name);
    await mkdir(skillDir, { recursive: true });
    const sm = `---\nname: ${name}\nstage: ${stage ?? 'stable'}\nproduces:\n  - x\n---\n`;
    await writeFile(path.join(skillDir, 'SKILL.md'), sm, 'utf8');
  }

  if (profiles) {
    await mkdir(path.join(dir, 'profiles'), { recursive: true });
    for (const [file, content] of Object.entries(profiles)) {
      await writeFile(path.join(dir, 'profiles', file), content, 'utf8');
    }
  }

  return dir;
}

function stageMap(skills) {
  return new Map(skills.map(({ name, stage }) => [name, stage ?? 'stable']));
}

// ---------------------------------------------------------------------------
// parseProfileYaml
// ---------------------------------------------------------------------------

describe('parseProfileYaml', () => {
  it('parses name and skills list', () => {
    const yaml = 'name: minimal\nskills:\n  - implement\n  - review-code\n';
    const result = parseProfileYaml(yaml);
    expect(result.name).toBe('minimal');
    expect(result.skills).toEqual(['implement', 'review-code']);
  });

  it('parses optional description', () => {
    const yaml = 'name: x\ndescription: A test profile\nskills:\n  - implement\n';
    const result = parseProfileYaml(yaml);
    expect(result.description).toBe('A test profile');
  });

  it('parses folded description spanning multiple lines', () => {
    const yaml =
      'name: x\ndescription: >\n  A multi-line\n  description.\nskills:\n  - implement\n';
    const result = parseProfileYaml(yaml);
    expect(result.description).toBe('A multi-line description.');
  });

  it('ignores comment lines', () => {
    const yaml = '# leading comment\nname: x\n# mid comment\nskills:\n  - implement\n';
    const result = parseProfileYaml(yaml);
    expect(result.name).toBe('x');
    expect(result.skills).toEqual(['implement']);
  });

  it('returns an object with no skills key when skills list is absent', () => {
    const result = parseProfileYaml('name: x\n');
    expect(result.skills).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// validateProfiles
// ---------------------------------------------------------------------------

describe('validateProfiles', () => {
  let packageDir;

  afterEach(async () => {
    if (packageDir) await rm(packageDir, { recursive: true, force: true });
  });

  it('produces no findings for a valid profile', async () => {
    const skills = [{ name: 'implement' }, { name: 'review-code' }];
    packageDir = await createPackageDir(skills, {
      'minimal.yaml': 'name: minimal\nskills:\n  - implement\n  - review-code\n',
    });
    const findings = [];
    validateProfiles(packageDir, stageMap(skills), findings);
    expect(findings).toHaveLength(0);
  });

  it('reports an error for a profile missing the name field', async () => {
    const skills = [{ name: 'implement' }];
    packageDir = await createPackageDir(skills, {
      'bad.yaml': 'skills:\n  - implement\n',
    });
    const findings = [];
    validateProfiles(packageDir, stageMap(skills), findings);
    const rules = findings.map((f) => f.rule);
    expect(rules).toContain('profile.missing-field');
    expect(findings.some((f) => f.message.includes('name'))).toBe(true);
  });

  it('reports an error for a profile missing the skills field', async () => {
    const skills = [{ name: 'implement' }];
    packageDir = await createPackageDir(skills, {
      'bad.yaml': 'name: bad\n',
    });
    const findings = [];
    validateProfiles(packageDir, stageMap(skills), findings);
    const rules = findings.map((f) => f.rule);
    expect(rules).toContain('profile.missing-field');
    expect(findings.some((f) => f.message.includes('skills'))).toBe(true);
  });

  it('reports an error for a skill name that does not resolve to a directory', async () => {
    const skills = [{ name: 'implement' }];
    packageDir = await createPackageDir(skills, {
      'test.yaml': 'name: test\nskills:\n  - implement\n  - nonexistent-skill\n',
    });
    const findings = [];
    validateProfiles(packageDir, stageMap(skills), findings);
    const unknownErrors = findings.filter((f) => f.rule === 'profile.unknown-skill');
    expect(unknownErrors).toHaveLength(1);
    expect(unknownErrors[0].message).toContain('nonexistent-skill');
  });

  it('reports an error when a listed skill is not stage: stable', async () => {
    const skills = [
      { name: 'implement', stage: 'stable' },
      { name: 'old-skill', stage: 'deprecated' },
    ];
    packageDir = await createPackageDir(skills, {
      'test.yaml': 'name: test\nskills:\n  - implement\n  - old-skill\n',
    });
    const findings = [];
    validateProfiles(packageDir, stageMap(skills), findings);
    const nonStableErrors = findings.filter((f) => f.rule === 'profile.non-stable');
    expect(nonStableErrors).toHaveLength(1);
    expect(nonStableErrors[0].message).toContain('old-skill');
    expect(nonStableErrors[0].message).toContain('deprecated');
  });

  it('validates multiple profile files independently', async () => {
    const skills = [{ name: 'implement' }, { name: 'review-code' }];
    packageDir = await createPackageDir(skills, {
      'valid.yaml': 'name: valid\nskills:\n  - implement\n',
      'bad.yaml': 'name: bad\nskills:\n  - ghost-skill\n',
    });
    const findings = [];
    validateProfiles(packageDir, stageMap(skills), findings);
    expect(findings.some((f) => f.skill === 'profiles/bad.yaml')).toBe(true);
    expect(findings.some((f) => f.skill === 'profiles/valid.yaml')).toBe(false);
  });

  it('does nothing when the profiles/ directory does not exist', async () => {
    const skills = [{ name: 'implement' }];
    packageDir = await createPackageDir(skills, null);
    const findings = [];
    validateProfiles(packageDir, stageMap(skills), findings);
    expect(findings).toHaveLength(0);
  });

  it('reports an error for an empty skills list', async () => {
    const skills = [{ name: 'implement' }];
    packageDir = await createPackageDir(skills, {
      'empty.yaml': 'name: empty\nskills: []\n',
    });
    const findings = [];
    validateProfiles(packageDir, stageMap(skills), findings);
    const emptyErrors = findings.filter((f) => f.rule === 'profile.empty-skills');
    expect(emptyErrors).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Gherkin: minimal.yaml and full.yaml content assertions against real profiles
// ---------------------------------------------------------------------------

describe('real profile content assertions', () => {
  const profilesDir = path.resolve(new URL(import.meta.url).pathname, '..', '..', 'profiles');
  const packageDir = path.resolve(new URL(import.meta.url).pathname, '..', '..');

  it('minimal.yaml contains exactly implement, review-code, create-mr, write-adr', () => {
    const content = fs.readFileSync(path.join(profilesDir, 'minimal.yaml'), 'utf8');
    const profile = parseProfileYaml(content);
    expect(profile.skills).toEqual(
      expect.arrayContaining(['implement', 'review-code', 'create-mr', 'write-adr']),
    );
    expect(profile.skills).toHaveLength(4);
  });

  it('full.yaml contains only skill names that resolve to existing stable directories', () => {
    const content = fs.readFileSync(path.join(profilesDir, 'full.yaml'), 'utf8');
    const profile = parseProfileYaml(content);
    const findings = [];
    // Load real stage map from the package dir
    const stableSkills = fs
      .readdirSync(packageDir)
      .filter((e) => {
        if (['bin', 'views', 'profiles'].includes(e) || e.startsWith('.')) return false;
        return (
          fs.statSync(path.join(packageDir, e)).isDirectory() &&
          fs.existsSync(path.join(packageDir, e, 'SKILL.md'))
        );
      })
      .map((name) => {
        const sm = fs.readFileSync(path.join(packageDir, name, 'SKILL.md'), 'utf8');
        const stageMatch = sm.match(/^stage:\s*(.+)$/m);
        return { name, stage: stageMatch ? stageMatch[1].trim() : 'unknown' };
      });

    validateProfiles(packageDir, stageMap(stableSkills), findings);
    const fullErrors = findings.filter((f) => f.skill === 'profiles/full.yaml');
    expect(fullErrors).toHaveLength(0);
  });

  it('every skill in full.yaml has stage: stable in the real package', () => {
    const content = fs.readFileSync(path.join(profilesDir, 'full.yaml'), 'utf8');
    const profile = parseProfileYaml(content);
    for (const skillName of profile.skills) {
      const skillMd = path.join(packageDir, skillName, 'SKILL.md');
      expect(fs.existsSync(skillMd), `${skillName}/SKILL.md should exist`).toBe(true);
      const stageMatch = fs.readFileSync(skillMd, 'utf8').match(/^stage:\s*(.+)$/m);
      expect(stageMatch?.[1]?.trim(), `${skillName} should be stage: stable`).toBe('stable');
    }
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  buildRoleView,
  roleMatches,
  generateViews,
  ROLE_VIEWS,
} from '../../src/generate/views.js';
import { loadAllSkills } from '../../src/skill.js';
import type { Skill } from '../../src/skill.js';
import type { DaddiaFrontmatter } from '../../src/frontmatter.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeSkill(name: string, fm: Partial<DaddiaFrontmatter>): Skill {
  return {
    name,
    path: `/fake/${name}`,
    frontmatter: fm as DaddiaFrontmatter,
    body: '',
    templates: [],
    hasExamples: false,
    hasScripts: false,
    hasReferences: false,
  };
}

function makeSkillMd(
  name: string,
  description: string,
  role: string | string[],
  produces: string[],
  stage?: string,
): string {
  const roleBlock = Array.isArray(role)
    ? `role:\n${role.map((r) => `  - ${r}`).join('\n')}\n`
    : `role: ${role}\n`;
  const producesBlock = `produces:\n${produces.map((p) => `  - ${p}`).join('\n')}\n`;
  return (
    `---\nname: ${name}\ndescription: ${description}\n` +
    `artefact: code\ntrack: delivery\n` +
    `${roleBlock}${producesBlock}` +
    `stage: ${stage ?? 'stable'}\nversion: '0.1'\n---\n\n# ${name}\n`
  );
}

async function createPackageDir(
  skills: Array<{ name: string; description: string; role: string | string[]; produces: string[]; stage?: string }>,
): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'gen-views-'));
  await mkdir(path.join(dir, 'bin'), { recursive: true });
  for (const skill of skills) {
    const skillDir = path.join(dir, skill.name);
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, 'SKILL.md'),
      makeSkillMd(skill.name, skill.description, skill.role, skill.produces, skill.stage),
      'utf8',
    );
  }
  return dir;
}

// ---------------------------------------------------------------------------
// roleMatches
// ---------------------------------------------------------------------------

describe('roleMatches', () => {
  it('returns true when the role array contains a match value', () => {
    expect(roleMatches(['pm', 'founder'], ['pm'])).toBe(true);
  });

  it('returns true when a string role matches', () => {
    expect(roleMatches('engineer', ['engineer'])).toBe(true);
  });

  it('returns false when no match value is present', () => {
    expect(roleMatches(['architect'], ['pm', 'founder'])).toBe(false);
  });

  it('returns false for null/undefined role', () => {
    expect(roleMatches(null, ['pm'])).toBe(false);
    expect(roleMatches(undefined, ['pm'])).toBe(false);
  });

  it('matches are case-sensitive', () => {
    expect(roleMatches(['PM'], ['pm'])).toBe(false);
  });

  it('returns true for founder matching the pm view', () => {
    expect(roleMatches(['founder'], ['pm', 'founder'])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildRoleView
// ---------------------------------------------------------------------------

describe('buildRoleView', () => {
  const fixtures: Skill[] = [
    makeSkill('implement', {
      description: 'Implements code for a story against an approved design.md.',
      artefact: 'code',
      track: 'delivery',
      consumes: ['design.md', 'backlog.md'],
      produces: ['code'],
    }),
    makeSkill('write-wp-design', {
      description: 'Drafts a work-package design.md.',
      artefact: 'design.md',
      track: 'delivery',
      consumes: ['solution.md', 'backlog.md'],
      produces: ['design.md'],
    }),
  ];

  it('starts with the correct heading', () => {
    const content = buildRoleView('Engineer', fixtures);
    expect(content).toMatch(/^# Skills — Engineer/);
  });

  it('includes the generate:views refresh note', () => {
    const content = buildRoleView('Engineer', fixtures);
    expect(content).toContain('pnpm generate:views');
  });

  it('has the correct 6-column table header', () => {
    const content = buildRoleView('Engineer', fixtures);
    expect(content).toContain('| Skill | What it does | Artefact | Track | Consumes | Produces |');
  });

  it('contains one row per skill', () => {
    const content = buildRoleView('Engineer', fixtures);
    expect(content).toContain('implement');
    expect(content).toContain('write-wp-design');
  });

  it('truncates descriptions longer than 120 chars', () => {
    const long = [makeSkill('x', { description: 'A'.repeat(130), produces: ['x'] })];
    const content = buildRoleView('Test', long);
    expect(content).toContain('...');
    expect(content).not.toContain('A'.repeat(130));
  });

  it('renders joined consumes array', () => {
    const content = buildRoleView('Engineer', fixtures);
    expect(content).toContain('design.md, backlog.md');
  });

  it('renders em-dash for absent consumes', () => {
    const noConsumes = [makeSkill('y', { description: 'test', produces: ['x'] })];
    const content = buildRoleView('Test', noConsumes);
    expect(content).toMatch(/\| — \|/);
  });

  it('produces an empty table body when the skill list is empty', () => {
    const content = buildRoleView('Engineer', []);
    const dataRows = content
      .split('\n')
      .filter((l) => l.startsWith('|') && !l.startsWith('| Skill') && !l.startsWith('| ---'));
    expect(dataRows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generateViews (integration, temp filesystem)
// ---------------------------------------------------------------------------

describe('generateViews (integration)', () => {
  let packageDir: string;

  afterEach(async () => {
    if (packageDir) await rm(packageDir, { recursive: true, force: true });
  });

  it('generates separate content for each role view', async () => {
    packageDir = await createPackageDir([
      { name: 'pm-skill', description: 'pm test', role: ['pm'], produces: ['x'] },
      { name: 'eng-skill', description: 'eng test', role: ['engineer'], produces: ['x'] },
      { name: 'arch-skill', description: 'arch test', role: ['architect'], produces: ['x'] },
    ]);
    const skills = loadAllSkills(packageDir);
    const views = generateViews(skills);

    expect(views['pm.md']).toContain('pm-skill');
    expect(views['pm.md']).not.toContain('eng-skill');
    expect(views['engineer.md']).toContain('eng-skill');
    expect(views['engineer.md']).not.toContain('pm-skill');
    expect(views['architect.md']).toContain('arch-skill');
  });

  it('includes founder-role skills in pm.md', async () => {
    packageDir = await createPackageDir([
      { name: 'founder-skill', description: 'test', role: ['founder'], produces: ['x'] },
    ]);
    const views = generateViews(loadAllSkills(packageDir));
    expect(views['pm.md']).toContain('founder-skill');
  });

  it('excludes deprecated skills from all views', async () => {
    packageDir = await createPackageDir([
      { name: 'live-skill', description: 'live', role: ['engineer'], produces: ['x'], stage: 'stable' },
      { name: 'old-skill', description: 'old', role: ['engineer'], produces: ['x'], stage: 'deprecated' },
    ]);
    const views = generateViews(loadAllSkills(packageDir));
    expect(views['engineer.md']).toContain('live-skill');
    expect(views['engineer.md']).not.toContain('old-skill');
  });

  it('returns all ROLE_VIEW file keys', async () => {
    packageDir = await createPackageDir([
      { name: 'impl', description: 'test', role: ['engineer'], produces: ['code'] },
    ]);
    const views = generateViews(loadAllSkills(packageDir));
    for (const { file } of ROLE_VIEWS) {
      expect(views).toHaveProperty(file);
    }
  });
});

// ---------------------------------------------------------------------------
// Snapshot: 3-skill fixture set
// ---------------------------------------------------------------------------

describe('buildRoleView snapshot', () => {
  it('produces the expected engineer view for a canonical 3-skill fixture set', () => {
    const fixtures: Skill[] = [
      makeSkill('implement', {
        description:
          'Implements code for a story or task against an approved design.md and backlog.md.',
        artefact: 'code',
        track: 'delivery',
        consumes: ['design.md', 'backlog.md'],
        produces: ['code'],
      }),
      makeSkill('review-code', {
        description: 'Performs a comprehensive code review of changes in a branch or PR.',
        artefact: 'code review',
        track: 'delivery',
        consumes: ['design.md', 'backlog.md'],
        produces: ['review'],
      }),
      makeSkill('write-wp-design', {
        description: 'Drafts a work-package design.md in walking-skeleton mode or TDD mode.',
        artefact: 'design.md',
        track: 'delivery',
        consumes: ['solution.md', 'backlog.md'],
        produces: ['design.md'],
      }),
    ];

    expect(buildRoleView('Engineer', fixtures)).toMatchSnapshot();
  });
});

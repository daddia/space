import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { buildRoleView, roleMatches, generateViews, ROLE_VIEWS } from './generate-views.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeSkillMd({ name, description, artefact, phase, role, consumes, produces, stage }) {
  const consumesBlock =
    Array.isArray(consumes) && consumes.length > 0
      ? `consumes:\n${consumes.map((c) => `  - ${c}`).join('\n')}\n`
      : '';
  const roleBlock = Array.isArray(role)
    ? `role:\n${role.map((r) => `  - ${r}`).join('\n')}\n`
    : `role:\n  - ${role ?? 'engineer'}\n`;
  const producesBlock =
    Array.isArray(produces) && produces.length > 0
      ? `produces:\n${produces.map((p) => `  - ${p}`).join('\n')}\n`
      : `produces:\n  - code\n`;

  return (
    `---\nname: ${name}\ndescription: ${description}\n` +
    `artefact: ${artefact ?? 'code'}\nphase: ${phase ?? 'delivery'}\n` +
    `${roleBlock}${consumesBlock}${producesBlock}` +
    `stage: ${stage ?? 'stable'}\nversion: '0.1'\n---\n\n# ${name}\n`
  );
}

async function createPackageDir(skills) {
  const dir = await mkdtemp(path.join(tmpdir(), 'gen-views-'));
  await mkdir(path.join(dir, 'bin'), { recursive: true });
  for (const skill of skills) {
    const skillDir = path.join(dir, skill.name);
    await mkdir(skillDir, { recursive: true });
    await writeFile(path.join(skillDir, 'SKILL.md'), makeSkillMd(skill), 'utf8');
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
  const fixtures = [
    {
      name: 'implement',
      fm: {
        description: 'Implements code for a story against an approved design.md.',
        artefact: 'code',
        phase: 'delivery',
        consumes: ['design.md', 'backlog.md'],
        produces: ['code'],
      },
    },
    {
      name: 'write-wp-design',
      fm: {
        description: 'Drafts a work-package design.md.',
        artefact: 'design.md',
        phase: 'delivery',
        consumes: ['solution.md', 'backlog.md'],
        produces: ['design.md'],
      },
    },
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
    const long = [{ name: 'x', fm: { description: 'A'.repeat(130), produces: ['x'] } }];
    const content = buildRoleView('Test', long);
    expect(content).toContain('...');
    expect(content).not.toContain('A'.repeat(130));
  });

  it('renders joined consumes array', () => {
    const content = buildRoleView('Engineer', fixtures);
    expect(content).toContain('design.md, backlog.md');
  });

  it('renders em-dash for absent consumes', () => {
    const noConsumes = [{ name: 'y', fm: { description: 'test', produces: ['x'] } }];
    const content = buildRoleView('Test', noConsumes);
    // consumes column should be —
    expect(content).toMatch(/\| — \|/);
  });

  it('produces an empty table body when the skill list is empty', () => {
    const content = buildRoleView('Engineer', []);
    const lines = content.split('\n');
    // header line + blank + refresh note + blank + col header + sep = 6 lines, no data rows
    const dataRows = lines.filter(
      (l) => l.startsWith('|') && !l.startsWith('| Skill') && !l.startsWith('| ---'),
    );
    expect(dataRows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generateViews (integration, temp filesystem)
// ---------------------------------------------------------------------------

describe('generateViews', () => {
  let packageDir;

  afterEach(async () => {
    if (packageDir) await rm(packageDir, { recursive: true, force: true });
  });

  it('creates the views/ directory if absent', async () => {
    packageDir = await createPackageDir([
      { name: 'impl', description: 'test', role: ['engineer'], produces: ['code'] },
    ]);
    generateViews(packageDir);
    expect(fs.existsSync(path.join(packageDir, 'views'))).toBe(true);
  });

  it('writes all three view files', async () => {
    packageDir = await createPackageDir([
      { name: 'impl', description: 'test', role: ['engineer'], produces: ['code'] },
    ]);
    generateViews(packageDir);
    for (const { file } of ROLE_VIEWS) {
      expect(fs.existsSync(path.join(packageDir, 'views', file))).toBe(true);
    }
  });

  it('filters skills into the correct view files', async () => {
    packageDir = await createPackageDir([
      { name: 'pm-skill', description: 'pm test', role: ['pm'], produces: ['x'] },
      { name: 'eng-skill', description: 'eng test', role: ['engineer'], produces: ['x'] },
      { name: 'arch-skill', description: 'arch test', role: ['architect'], produces: ['x'] },
    ]);
    generateViews(packageDir);

    const pmContent = fs.readFileSync(path.join(packageDir, 'views', 'pm.md'), 'utf8');
    const engContent = fs.readFileSync(path.join(packageDir, 'views', 'engineer.md'), 'utf8');
    const archContent = fs.readFileSync(path.join(packageDir, 'views', 'architect.md'), 'utf8');

    expect(pmContent).toContain('pm-skill');
    expect(pmContent).not.toContain('eng-skill');

    expect(engContent).toContain('eng-skill');
    expect(engContent).not.toContain('pm-skill');

    expect(archContent).toContain('arch-skill');
    expect(archContent).not.toContain('eng-skill');
  });

  it('includes founder-role skills in pm.md', async () => {
    packageDir = await createPackageDir([
      { name: 'founder-skill', description: 'test', role: ['founder'], produces: ['x'] },
    ]);
    generateViews(packageDir);
    const pmContent = fs.readFileSync(path.join(packageDir, 'views', 'pm.md'), 'utf8');
    expect(pmContent).toContain('founder-skill');
  });

  it('excludes deprecated skills from all views', async () => {
    packageDir = await createPackageDir([
      {
        name: 'live-skill',
        description: 'live',
        role: ['engineer'],
        produces: ['x'],
        stage: 'stable',
      },
      {
        name: 'old-skill',
        description: 'old',
        role: ['engineer'],
        produces: ['x'],
        stage: 'deprecated',
      },
    ]);
    generateViews(packageDir);
    const engContent = fs.readFileSync(path.join(packageDir, 'views', 'engineer.md'), 'utf8');
    expect(engContent).toContain('live-skill');
    expect(engContent).not.toContain('old-skill');
  });

  it('returns changed=false when output is already up to date', async () => {
    packageDir = await createPackageDir([
      { name: 'impl', description: 'test', role: ['engineer'], produces: ['code'] },
    ]);
    generateViews(packageDir); // first run — writes
    const second = generateViews(packageDir); // second run — no change
    expect(second.changed).toBe(false);
  });

  it('returns changed=true when a view file is stale', async () => {
    packageDir = await createPackageDir([
      { name: 'impl', description: 'test', role: ['engineer'], produces: ['code'] },
    ]);
    await mkdir(path.join(packageDir, 'views'), { recursive: true });
    await writeFile(path.join(packageDir, 'views', 'engineer.md'), '# stale content', 'utf8');
    const result = generateViews(packageDir);
    expect(result.changed).toBe(true);
  });

  it('reports the correct row count per view', async () => {
    packageDir = await createPackageDir([
      { name: 'a', description: 'test', role: ['engineer'], produces: ['x'] },
      { name: 'b', description: 'test', role: ['engineer'], produces: ['x'] },
      { name: 'c', description: 'test', role: ['pm'], produces: ['x'] },
    ]);
    const { counts } = generateViews(packageDir);
    expect(counts['engineer.md']).toBe(2);
    expect(counts['pm.md']).toBe(1);
    expect(counts['architect.md']).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// EARS: every stable skill in at least one view
// ---------------------------------------------------------------------------

describe('EARS: every stable skill covered by at least one role view', () => {
  it('all fixture skills appear in at least one view file', async () => {
    const packageDir = await mkdtemp(path.join(tmpdir(), 'gen-views-ears-'));
    try {
      await mkdir(path.join(packageDir, 'bin'), { recursive: true });

      const skills = [
        { name: 'a', description: 'test', role: ['engineer'], produces: ['x'] },
        { name: 'b', description: 'test', role: ['pm'], produces: ['x'] },
        { name: 'c', description: 'test', role: ['architect', 'engineer'], produces: ['x'] },
        { name: 'd', description: 'test', role: ['founder'], produces: ['x'] },
      ];

      for (const s of skills) {
        const skillDir = path.join(packageDir, s.name);
        await mkdir(skillDir, { recursive: true });
        await writeFile(path.join(skillDir, 'SKILL.md'), makeSkillMd(s), 'utf8');
      }

      generateViews(packageDir);

      const viewContents = ROLE_VIEWS.map(({ file }) =>
        fs.readFileSync(path.join(packageDir, 'views', file), 'utf8'),
      ).join('\n');

      for (const { name } of skills) {
        expect(viewContents).toContain(name);
      }
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Snapshot: 3-skill fixture set
// ---------------------------------------------------------------------------

describe('buildRoleView snapshot', () => {
  it('produces the expected engineer view for a canonical 3-skill fixture set', () => {
    const fixtures = [
      {
        name: 'implement',
        fm: {
          description:
            'Implements code for a story or task against an approved design.md and backlog.md.',
          artefact: 'code',
          track: 'delivery',
          consumes: ['design.md', 'backlog.md'],
          produces: ['code'],
        },
      },
      {
        name: 'review-code',
        fm: {
          description: 'Performs a comprehensive code review of changes in a branch or PR.',
          artefact: 'code review',
          track: 'delivery',
          consumes: ['design.md', 'backlog.md'],
          produces: ['review'],
        },
      },
      {
        name: 'write-wp-design',
        fm: {
          description: 'Drafts a work-package design.md in walking-skeleton mode or TDD mode.',
          artefact: 'design.md',
          track: 'delivery',
          consumes: ['solution.md', 'backlog.md'],
          produces: ['design.md'],
        },
      },
    ];

    expect(buildRoleView('Engineer', fixtures)).toMatchSnapshot();
  });
});

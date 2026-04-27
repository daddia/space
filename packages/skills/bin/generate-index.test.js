import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { buildIndexTable, replaceGeneratedSection, generateIndex } from './generate-index.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const SENTINEL_SKILL_MD = `---
name: space-index
description: test description
artefact: skill-routing
version: '0.1'
stage: stable
produces:
  - skill-routing
---

# Space Index

<!-- BEGIN GENERATED — do not edit; run \`pnpm generate:index\` to refresh -->
| Skill | Description (excerpt) | Artefact | Phase | Role | Consumes | Produces |
| --- | --- | --- | --- | --- | --- | --- |
<!-- END GENERATED -->
`;

function makeSkillMd({ name, description, artefact, phase, role, consumes, produces, stage }) {
  const consumesBlock =
    consumes && consumes.length > 0
      ? `consumes:\n${consumes.map((c) => `  - ${c}`).join('\n')}\n`
      : '';
  const roleBlock = Array.isArray(role)
    ? `role:\n${role.map((r) => `  - ${r}`).join('\n')}\n`
    : `role: ${role ?? 'engineer'}\n`;
  const producesBlock = `produces:\n${produces.map((p) => `  - ${p}`).join('\n')}\n`;

  return `---\nname: ${name}\ndescription: ${description}\nartefact: ${artefact ?? 'code'}\nphase: ${phase ?? 'delivery'}\n${roleBlock}${consumesBlock}${producesBlock}stage: ${stage ?? 'stable'}\nversion: '0.1'\n---\n\n# ${name}\n`;
}

async function createPackageDir(skills) {
  const dir = await mkdtemp(path.join(tmpdir(), 'gen-idx-'));

  await mkdir(path.join(dir, 'bin'), { recursive: true });

  for (const skill of skills) {
    const skillDir = path.join(dir, skill.name);
    await mkdir(skillDir, { recursive: true });
    await writeFile(path.join(skillDir, 'SKILL.md'), makeSkillMd(skill), 'utf8');
  }

  return dir;
}

// ---------------------------------------------------------------------------
// buildIndexTable
// ---------------------------------------------------------------------------

describe('buildIndexTable', () => {
  const fixtures = [
    {
      name: 'write-product',
      fm: {
        description: 'Drafts product.md in pitch mode or product mode.',
        artefact: 'product.md',
        phase: 'discovery',
        role: ['pm', 'founder'],
        produces: ['product.md'],
      },
    },
    {
      name: 'implement',
      fm: {
        description: 'Implements code for a story against an approved design.md and backlog.md.',
        artefact: 'code',
        phase: 'delivery',
        role: ['engineer'],
        consumes: ['design.md', 'backlog.md'],
        produces: ['code'],
      },
    },
    {
      name: 'write-backlog',
      fm: {
        description: 'Drafts a domain-level or work-package backlog.md.',
        artefact: 'backlog.md',
        phase: 'discovery',
        role: ['engineer', 'pm'],
        consumes: ['product.md'],
        produces: ['backlog.md'],
      },
    },
  ];

  it('produces a table with header, separator, and one row per skill', () => {
    const table = buildIndexTable(fixtures);
    const lines = table.split('\n');
    expect(lines[0]).toContain('Skill');
    expect(lines[0]).toContain('Description (excerpt)');
    expect(lines[1]).toContain('---');
    expect(lines).toHaveLength(2 + fixtures.length);
  });

  it('includes the skill name in each row', () => {
    const table = buildIndexTable(fixtures);
    expect(table).toContain('write-product');
    expect(table).toContain('implement');
    expect(table).toContain('write-backlog');
  });

  it('truncates descriptions longer than 120 chars with an ellipsis', () => {
    const longDesc = 'A'.repeat(130);
    const result = buildIndexTable([
      { name: 'test-skill', fm: { description: longDesc, produces: ['x'] } },
    ]);
    const row = result.split('\n').find((l) => l.includes('test-skill'));
    expect(row).toContain('...');
    // excerpt plus separator pipe = the original 130 chars are not fully present
    expect(row).not.toContain(longDesc);
  });

  it('does not truncate descriptions at or under 120 chars', () => {
    const shortDesc = 'B'.repeat(120);
    const result = buildIndexTable([
      { name: 'test-skill', fm: { description: shortDesc, produces: ['x'] } },
    ]);
    const row = result.split('\n').find((l) => l.includes('test-skill'));
    expect(row).toContain(shortDesc);
    expect(row).not.toContain('...');
  });

  it('renders em-dash for missing consumes', () => {
    const result = buildIndexTable([
      {
        name: 'test-skill',
        fm: { description: 'test', artefact: 'code', produces: ['code'] },
      },
    ]);
    const row = result.split('\n').find((l) => l.includes('test-skill'));
    // consumes column should be —
    expect(row).toContain('| — |');
  });

  it('renders joined array for multi-value role', () => {
    const result = buildIndexTable([
      {
        name: 'test-skill',
        fm: {
          description: 'test',
          role: ['pm', 'engineer'],
          produces: ['x'],
        },
      },
    ]);
    const row = result.split('\n').find((l) => l.includes('test-skill'));
    expect(row).toContain('pm, engineer');
  });
});

// ---------------------------------------------------------------------------
// replaceGeneratedSection
// ---------------------------------------------------------------------------

describe('replaceGeneratedSection', () => {
  it('replaces table content between the sentinels', () => {
    const newTable = '| a | b |\n| --- | --- |\n| x | y |';
    const result = replaceGeneratedSection(SENTINEL_SKILL_MD, newTable);
    expect(result).toContain(newTable);
    expect(result).toContain('<!-- BEGIN GENERATED');
    expect(result).toContain('<!-- END GENERATED -->');
  });

  it('preserves content before the BEGIN sentinel', () => {
    const result = replaceGeneratedSection(SENTINEL_SKILL_MD, 'newTable');
    expect(result).toContain('# Space Index');
  });

  it('preserves content after the END sentinel', () => {
    const withTrailing = SENTINEL_SKILL_MD + '\n## Footer\n';
    const result = replaceGeneratedSection(withTrailing, 'new');
    expect(result).toContain('## Footer');
  });

  it('throws when the BEGIN sentinel is absent', () => {
    const noBegin = SENTINEL_SKILL_MD.replace('<!-- BEGIN GENERATED', '<!-- WRONG');
    expect(() => replaceGeneratedSection(noBegin, 'table')).toThrow(
      'missing the <!-- BEGIN GENERATED --> sentinel',
    );
  });

  it('throws when the END sentinel is absent', () => {
    const noEnd = SENTINEL_SKILL_MD.replace('<!-- END GENERATED -->', '<!-- WRONG -->');
    expect(() => replaceGeneratedSection(noEnd, 'table')).toThrow(
      'missing the <!-- END GENERATED --> sentinel',
    );
  });

  it('replaces stale content between sentinels with the new table', () => {
    const stale = SENTINEL_SKILL_MD.replace(
      '| Skill | Description (excerpt) | Artefact | Phase | Role | Consumes | Produces |\n| --- | --- | --- | --- | --- | --- | --- |',
      '| old | stale | table | here | x | y | z |',
    );
    const result = replaceGeneratedSection(stale, '| fresh | table |');
    expect(result).toContain('| fresh | table |');
    expect(result).not.toContain('| old | stale |');
  });
});

// ---------------------------------------------------------------------------
// generateIndex (integration, temp filesystem)
// ---------------------------------------------------------------------------

describe('generateIndex', () => {
  let packageDir;

  afterEach(async () => {
    if (packageDir) await rm(packageDir, { recursive: true, force: true });
  });

  it('returns changed=false when the committed output is already up to date', async () => {
    const skills = [
      {
        name: 'write-product',
        description: 'Drafts product.md.',
        artefact: 'product.md',
        phase: 'discovery',
        role: ['pm'],
        produces: ['product.md'],
      },
    ];
    packageDir = await createPackageDir(skills);

    await mkdir(path.join(packageDir, 'space-index'), { recursive: true });

    // First run: generate from scratch into SENTINEL_SKILL_MD
    await writeFile(path.join(packageDir, 'space-index', 'SKILL.md'), SENTINEL_SKILL_MD, 'utf8');
    const first = generateIndex(packageDir);
    expect(first.skillCount).toBe(2); // write-product + space-index

    // Second run: output should now be unchanged
    const second = generateIndex(packageDir);
    expect(second.changed).toBe(false);
  });

  it('returns changed=true and updates the file when the table is stale', async () => {
    const skills = [
      {
        name: 'new-skill',
        description: 'Drafts a new thing.',
        artefact: 'new.md',
        phase: 'delivery',
        role: ['engineer'],
        produces: ['new.md'],
      },
    ];
    packageDir = await createPackageDir(skills);
    await mkdir(path.join(packageDir, 'space-index'), { recursive: true });
    await writeFile(path.join(packageDir, 'space-index', 'SKILL.md'), SENTINEL_SKILL_MD, 'utf8');

    const result = generateIndex(packageDir);
    expect(result.changed).toBe(true);

    // The written file should now contain the new skill row
    const written = fs.readFileSync(path.join(packageDir, 'space-index', 'SKILL.md'), 'utf8');
    expect(written).toContain('new-skill');
  });

  it('excludes skills with stage: deprecated from the index table', async () => {
    const skills = [
      {
        name: 'stable-skill',
        description: 'A stable skill.',
        artefact: 'stable.md',
        phase: 'delivery',
        role: ['engineer'],
        produces: ['stable.md'],
        stage: 'stable',
      },
      {
        name: 'deprecated-skill',
        description: 'An old skill.',
        artefact: 'old.md',
        phase: 'delivery',
        role: ['engineer'],
        produces: ['old.md'],
        stage: 'deprecated',
      },
    ];
    packageDir = await createPackageDir(skills);
    await mkdir(path.join(packageDir, 'space-index'), { recursive: true });
    await writeFile(path.join(packageDir, 'space-index', 'SKILL.md'), SENTINEL_SKILL_MD, 'utf8');

    generateIndex(packageDir);

    const written = fs.readFileSync(path.join(packageDir, 'space-index', 'SKILL.md'), 'utf8');
    expect(written).toContain('stable-skill');
    expect(written).not.toContain('deprecated-skill');
  });

  it('includes space-index itself in the generated table', async () => {
    packageDir = await createPackageDir([]);
    await mkdir(path.join(packageDir, 'space-index'), { recursive: true });
    await writeFile(path.join(packageDir, 'space-index', 'SKILL.md'), SENTINEL_SKILL_MD, 'utf8');

    generateIndex(packageDir);

    const written = fs.readFileSync(path.join(packageDir, 'space-index', 'SKILL.md'), 'utf8');
    expect(written).toContain('space-index');
  });
});

// ---------------------------------------------------------------------------
// Snapshot: generated section with a fixed 3-skill fixture set
// ---------------------------------------------------------------------------

describe('buildIndexTable snapshot', () => {
  it('produces the expected table for a canonical 3-skill fixture set', () => {
    const fixtures = [
      {
        name: 'implement',
        fm: {
          description:
            'Implements code for a story or task against an approved design.md and backlog.md.',
          artefact: 'code',
          track: 'delivery',
          role: ['engineer'],
          consumes: ['design.md', 'backlog.md'],
          produces: ['code'],
        },
      },
      {
        name: 'write-product',
        fm: {
          description:
            'Drafts product.md in pitch mode or product mode. Use when the user mentions "product doc", "PRD", or "why are we building this".',
          artefact: 'product.md',
          track: 'discovery',
          role: ['pm', 'founder'],
          produces: ['product.md'],
        },
      },
      {
        name: 'space-index',
        fm: {
          description: 'Identifies the right skill for a vague or open-ended request.',
          artefact: 'skill-routing',
          track: 'discovery',
          role: ['pm', 'founder', 'architect', 'engineer'],
          produces: ['skill-routing'],
        },
      },
    ];

    const table = buildIndexTable(fixtures);
    expect(table).toMatchSnapshot();
  });
});

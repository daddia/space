import { describe, it, expect } from 'vitest';
import { generateIndexTable } from '../../src/generate/index-table.js';
import type { Skill } from '../../src/skill.js';
import type { DaddiaFrontmatter } from '../../src/frontmatter.js';

function makeSkill(
  name: string,
  fm: Partial<DaddiaFrontmatter>,
): Skill {
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

const FIXTURES: Skill[] = [
  makeSkill('write-product', {
    description: 'Drafts product.md in pitch mode or product mode.',
    artefact: 'product.md',
    track: 'discovery',
    role: 'pm',
    produces: ['product.md'],
  }),
  makeSkill('implement', {
    description:
      'Implements code for a story or task against an approved design.md and backlog.md.',
    artefact: 'code',
    track: 'delivery',
    role: 'engineer',
    consumes: ['design.md', 'backlog.md'],
    produces: ['code'],
  }),
  makeSkill('write-backlog', {
    description: 'Drafts a domain-level or work-package backlog.md.',
    artefact: 'backlog.md',
    track: 'discovery',
    role: 'pm',
    consumes: ['product.md'],
    produces: ['backlog.md'],
  }),
];

describe('generateIndexTable', () => {
  it('produces a table with header, separator, and one row per skill', () => {
    const table = generateIndexTable(FIXTURES);
    const lines = table.split('\n');
    expect(lines[0]).toContain('Skill');
    expect(lines[0]).toContain('Description (excerpt)');
    expect(lines[1]).toContain('---');
    expect(lines).toHaveLength(2 + FIXTURES.length);
  });

  it('includes the skill name in each row', () => {
    const table = generateIndexTable(FIXTURES);
    expect(table).toContain('write-product');
    expect(table).toContain('implement');
    expect(table).toContain('write-backlog');
  });

  it('truncates descriptions longer than 120 chars with an ellipsis', () => {
    const longDesc = 'A'.repeat(130);
    const result = generateIndexTable([makeSkill('test-skill', { description: longDesc, produces: ['x'] })]);
    const row = result.split('\n').find((l) => l.includes('test-skill'));
    expect(row).toContain('...');
    expect(row).not.toContain(longDesc);
  });

  it('does not truncate descriptions at or under 120 chars', () => {
    const shortDesc = 'B'.repeat(120);
    const result = generateIndexTable([makeSkill('test-skill', { description: shortDesc, produces: ['x'] })]);
    const row = result.split('\n').find((l) => l.includes('test-skill'));
    expect(row).toContain(shortDesc);
    expect(row).not.toContain('...');
  });

  it('renders em-dash for missing consumes', () => {
    const result = generateIndexTable([
      makeSkill('test-skill', { description: 'test', artefact: 'code', produces: ['code'] }),
    ]);
    const row = result.split('\n').find((l) => l.includes('test-skill'));
    expect(row).toContain('| — |');
  });

  it('renders joined array for multi-value role', () => {
    const result = generateIndexTable([
      makeSkill('test-skill', { description: 'test', role: ['pm', 'engineer'] as unknown as 'pm', produces: ['x'] }),
    ]);
    const row = result.split('\n').find((l) => l.includes('test-skill'));
    expect(row).toContain('pm, engineer');
  });
});

// ---------------------------------------------------------------------------
// Snapshot: canonical 3-skill fixture set
// ---------------------------------------------------------------------------

describe('generateIndexTable snapshot', () => {
  it('produces the expected table for a canonical 3-skill fixture set', () => {
    const fixtures: Skill[] = [
      makeSkill('implement', {
        description:
          'Implements code for a story or task against an approved design.md and backlog.md.',
        artefact: 'code',
        track: 'delivery',
        role: 'engineer',
        consumes: ['design.md', 'backlog.md'],
        produces: ['code'],
      }),
      makeSkill('write-product', {
        description:
          'Drafts product.md in pitch mode or product mode. Use when the user mentions "product doc", "PRD", or "why are we building this".',
        artefact: 'product.md',
        track: 'discovery',
        role: ['pm', 'founder'] as unknown as 'pm',
        produces: ['product.md'],
      }),
      makeSkill('space-index', {
        description: 'Identifies the right skill for a vague or open-ended request.',
        artefact: 'skill-routing',
        track: 'discovery',
        role: ['pm', 'founder', 'architect', 'engineer'] as unknown as 'pm',
        produces: ['skill-routing'],
      }),
    ];

    expect(generateIndexTable(fixtures)).toMatchSnapshot();
  });
});

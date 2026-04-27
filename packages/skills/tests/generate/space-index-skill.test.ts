import { describe, it, expect } from 'vitest';
import {
  replaceGeneratedSection,
  generateSpaceIndexSkill,
} from '../../src/generate/space-index-skill.js';
import type { Skill } from '../../src/skill.js';
import type { DaddiaFrontmatter } from '../../src/frontmatter.js';

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
// generateSpaceIndexSkill
// ---------------------------------------------------------------------------

describe('generateSpaceIndexSkill', () => {
  it('splices the generated table into the sentinel section', () => {
    const skills = [
      makeSkill('write-product', {
        description: 'Drafts product.md.',
        artefact: 'product.md',
        track: 'discovery',
        role: 'pm',
        produces: ['product.md'],
      }),
    ];
    const result = generateSpaceIndexSkill(SENTINEL_SKILL_MD, skills);
    expect(result).toContain('write-product');
    expect(result).toContain('<!-- BEGIN GENERATED');
    expect(result).toContain('<!-- END GENERATED -->');
  });

  it('excludes deprecated skills from the generated table', () => {
    const skills = [
      makeSkill('stable-skill', {
        description: 'Stable.',
        artefact: 'stable.md',
        track: 'delivery',
        role: 'engineer',
        stage: 'stable',
        produces: ['stable.md'],
      }),
      makeSkill('deprecated-skill', {
        description: 'Old.',
        artefact: 'old.md',
        track: 'delivery',
        role: 'engineer',
        stage: 'deprecated',
        produces: ['old.md'],
      }),
    ];
    const result = generateSpaceIndexSkill(SENTINEL_SKILL_MD, skills);
    expect(result).toContain('stable-skill');
    expect(result).not.toContain('deprecated-skill');
  });

  it('is idempotent — running twice on the same output produces no change', () => {
    const skills = [
      makeSkill('write-product', {
        description: 'Drafts product.md.',
        artefact: 'product.md',
        track: 'discovery',
        role: 'pm',
        produces: ['product.md'],
      }),
    ];
    const first = generateSpaceIndexSkill(SENTINEL_SKILL_MD, skills);
    const second = generateSpaceIndexSkill(first, skills);
    expect(second).toBe(first);
  });
});

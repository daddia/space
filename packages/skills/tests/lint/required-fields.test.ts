import { describe, it, expect } from 'vitest';
import { requiredFields } from '../../src/lint/required-fields.js';
import type { Skill } from '../../src/skill.js';
import type { DaddiaFrontmatter } from '../../src/frontmatter.js';

function makeSkill(fm: Partial<DaddiaFrontmatter>): Skill {
  return {
    name: fm.name ?? 'test-skill',
    path: '/fake/test-skill',
    frontmatter: fm as DaddiaFrontmatter,
    body: '',
    templates: [],
    hasExamples: false,
    hasScripts: false,
    hasReferences: false,
  };
}

const FULL_FM: DaddiaFrontmatter = {
  name: 'write-product',
  description: 'Drafts product.md. Do NOT use for roadmaps.',
  'allowed-tools': ['Read', 'Write'],
  version: '1.0.0',
  artefact: 'product.md',
  track: 'strategy',
  role: 'pm',
  produces: ['product.md'],
};

describe('requiredFields', () => {
  it('passes when all required fields are present and non-empty', () => {
    const result = requiredFields(makeSkill(FULL_FM), []);
    expect(result).toHaveLength(0);
  });

  it('fails when name is absent', () => {
    const { name: _, ...rest } = FULL_FM;
    const result = requiredFields(makeSkill(rest as DaddiaFrontmatter), []);
    expect(result.some((d) => d.message.includes('name'))).toBe(true);
  });

  it('fails when allowed-tools is an empty array', () => {
    const result = requiredFields(makeSkill({ ...FULL_FM, 'allowed-tools': [] }), []);
    expect(result.some((d) => d.message.includes('allowed-tools'))).toBe(true);
  });

  it('fails when produces is an empty array', () => {
    const result = requiredFields(makeSkill({ ...FULL_FM, produces: [] }), []);
    expect(result.some((d) => d.message.includes('produces'))).toBe(true);
  });

  it('reports the correct rule name on each diagnostic', () => {
    const { name: _, ...rest } = FULL_FM;
    const result = requiredFields(makeSkill(rest as DaddiaFrontmatter), []);
    for (const d of result) {
      expect(d.rule).toBe('required-fields');
    }
  });

  it('reports one diagnostic per missing field', () => {
    const result = requiredFields(makeSkill({ name: 'x', description: 'y' }), []);
    const missingFields = result.map((d) => d.message.match(/field: (\S+)/)?.[1]);
    expect(missingFields).toContain('allowed-tools');
    expect(missingFields).toContain('version');
    expect(missingFields).toContain('artefact');
    expect(missingFields).toContain('track');
    expect(missingFields).toContain('role');
    expect(missingFields).toContain('produces');
  });
});

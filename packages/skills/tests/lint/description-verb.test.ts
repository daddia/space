import { describe, it, expect } from 'vitest';
import { descriptionVerb } from '../../src/lint/description-verb.js';
import type { Skill } from '../../src/skill.js';

function makeSkill(description: string): Skill {
  return {
    name: 'test-skill',
    path: '/fake/test-skill',
    frontmatter: { name: 'test-skill', description },
    body: '',
    templates: [],
    hasExamples: false,
    hasScripts: false,
    hasReferences: false,
  };
}

const VALID_VERBS = [
  'Drafts',
  'Creates',
  'Implements',
  'Reviews',
  'Performs',
  'Documents',
  'Produces',
  'Identifies',
  'Refines',
];

describe('descriptionVerb', () => {
  for (const verb of VALID_VERBS) {
    it(`passes when description starts with "${verb}"`, () => {
      const result = descriptionVerb(makeSkill(`${verb} something useful.`), []);
      expect(result).toHaveLength(0);
    });
  }

  it('fails when description does not start with an allowed verb', () => {
    const result = descriptionVerb(makeSkill('This skill does something.'), []);
    expect(result).toHaveLength(1);
    expect(result[0]!.rule).toBe('description-verb');
    expect(result[0]!.severity).toBe('error');
  });

  it('fails when description starts with a lowercase verb', () => {
    const result = descriptionVerb(makeSkill('drafts something.'), []);
    expect(result).toHaveLength(1);
  });

  it('reports the skill name in the diagnostic', () => {
    const result = descriptionVerb(makeSkill('does not match'), []);
    expect(result[0]!.skill).toBe('test-skill');
  });
});

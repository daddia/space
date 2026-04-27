import { describe, it, expect } from 'vitest';
import { descriptionUniqueness } from '../../src/lint/description-uniqueness.js';
import type { Skill } from '../../src/skill.js';

function makeSkill(name: string, description: string): Skill {
  return {
    name,
    path: `/fake/${name}`,
    frontmatter: { name, description },
    body: '',
    templates: [],
    hasExamples: false,
    hasScripts: false,
    hasReferences: false,
  };
}

describe('descriptionUniqueness', () => {
  it('passes when the description is unique among all skills', () => {
    const skill = makeSkill('skill-b', 'Drafts a backlog. Do NOT use for roadmaps.');
    const all = [
      makeSkill('skill-a', 'Drafts a product. Do NOT use for roadmaps.'),
      skill,
    ];
    const result = descriptionUniqueness(skill, all);
    expect(result).toHaveLength(0);
  });

  it('fails when a later skill duplicates an earlier skill description', () => {
    const desc = 'Drafts product.md. Do NOT use for roadmaps.';
    const skillA = makeSkill('skill-a', desc);
    const skillB = makeSkill('skill-b', desc);
    const all = [skillA, skillB];
    const result = descriptionUniqueness(skillB, all);
    expect(result).toHaveLength(1);
    expect(result[0]!.rule).toBe('description-uniqueness');
    expect(result[0]!.severity).toBe('error');
    expect(result[0]!.message).toContain('skill-a');
  });

  it('normalises whitespace before comparing', () => {
    const skillA = makeSkill('skill-a', 'Drafts  product.md.');
    const skillB = makeSkill('skill-b', 'Drafts product.md.');
    const all = [skillA, skillB];
    const result = descriptionUniqueness(skillB, all);
    expect(result).toHaveLength(1);
  });

  it('does not flag a skill against itself (first occurrence is always unique)', () => {
    const skill = makeSkill('skill-a', 'Drafts product.md. Do NOT use for roadmaps.');
    const result = descriptionUniqueness(skill, [skill]);
    expect(result).toHaveLength(0);
  });
});

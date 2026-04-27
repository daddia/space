import { describe, it, expect } from 'vitest';
import { descriptionDoNot } from '../../src/lint/description-do-not.js';
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

describe('descriptionDoNot', () => {
  it('passes when description contains "Do NOT"', () => {
    const result = descriptionDoNot(makeSkill('Drafts product.md. Do NOT use for roadmaps.'), []);
    expect(result).toHaveLength(0);
  });

  it('fails when description has no "Do NOT" clause', () => {
    const result = descriptionDoNot(makeSkill('Drafts product.md for any purpose.'), []);
    expect(result).toHaveLength(1);
    expect(result[0]!.rule).toBe('description-do-not');
    expect(result[0]!.severity).toBe('error');
  });

  it('is case-sensitive — "do not" (lowercase) does not satisfy the rule', () => {
    const result = descriptionDoNot(makeSkill('Drafts something. do not use for X.'), []);
    expect(result).toHaveLength(1);
  });

  it('reports the skill name in the diagnostic', () => {
    const result = descriptionDoNot(makeSkill('No clause here.'), []);
    expect(result[0]!.skill).toBe('test-skill');
  });
});

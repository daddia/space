import { describe, it, expect } from 'vitest';
import { descriptionLength } from '../../src/lint/description-length.js';
import type { Skill } from '../../src/skill.js';

function makeSkill(description: string): Skill {
  return {
    name: 'test-skill',
    path: '/fake/test-skill',
    frontmatter: { name: 'test-skill', description },
    body: '## Negative constraints\n\nDo not use.',
    templates: [],
    hasExamples: false,
    hasScripts: false,
    hasReferences: false,
  };
}

describe('descriptionLength', () => {
  it('passes when description is exactly 200 characters', () => {
    const result = descriptionLength(makeSkill('A'.repeat(200)), []);
    expect(result).toHaveLength(0);
  });

  it('passes when description is exactly 500 characters', () => {
    const result = descriptionLength(makeSkill('A'.repeat(500)), []);
    expect(result).toHaveLength(0);
  });

  it('passes for a description within the 200-500 range', () => {
    const result = descriptionLength(makeSkill('A'.repeat(350)), []);
    expect(result).toHaveLength(0);
  });

  it('fails when description is shorter than 200 characters', () => {
    const result = descriptionLength(makeSkill('A'.repeat(199)), []);
    expect(result).toHaveLength(1);
    expect(result[0]!.rule).toBe('description-length');
    expect(result[0]!.severity).toBe('error');
    expect(result[0]!.message).toContain('199 chars');
  });

  it('fails when description is longer than 500 characters', () => {
    const result = descriptionLength(makeSkill('A'.repeat(600)), []);
    expect(result).toHaveLength(1);
    expect(result[0]!.rule).toBe('description-length');
    expect(result[0]!.message).toContain('600 chars');
  });

  it('reports the skill name in the diagnostic', () => {
    const result = descriptionLength(makeSkill('short'), []);
    expect(result[0]!.skill).toBe('test-skill');
  });
});

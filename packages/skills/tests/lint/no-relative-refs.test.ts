import { describe, it, expect } from 'vitest';
import { noRelativeRefs } from '../../src/lint/no-relative-refs.js';
import type { Skill } from '../../src/skill.js';

function makeSkill(body: string): Skill {
  return {
    name: 'test-skill',
    path: '/fake/test-skill',
    frontmatter: { name: 'test-skill', description: 'test' },
    body,
    templates: [],
    hasExamples: false,
    hasScripts: false,
    hasReferences: false,
  };
}

describe('noRelativeRefs', () => {
  it('passes when the body contains no ../ paths', () => {
    const result = noRelativeRefs(makeSkill('See [solution](space:architecture/solution.md).'), []);
    expect(result).toHaveLength(0);
  });

  it('fails when the body contains ../ path', () => {
    const result = noRelativeRefs(makeSkill('See [docs](../architecture/solution.md).'), []);
    expect(result).toHaveLength(1);
    expect(result[0]!.rule).toBe('no-relative-refs');
    expect(result[0]!.severity).toBe('error');
  });

  it('fails on deep relative paths', () => {
    const result = noRelativeRefs(makeSkill('Reference: ../../some/file.md'), []);
    expect(result).toHaveLength(1);
  });

  it('passes for an empty body', () => {
    const result = noRelativeRefs(makeSkill(''), []);
    expect(result).toHaveLength(0);
  });

  it('reports the skill name in the diagnostic', () => {
    const result = noRelativeRefs(makeSkill('see ../file'), []);
    expect(result[0]!.skill).toBe('test-skill');
  });
});

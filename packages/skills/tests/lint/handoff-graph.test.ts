import { describe, it, expect } from 'vitest';
import { handoffGraph } from '../../src/lint/handoff-graph.js';
import type { Skill } from '../../src/skill.js';

function makeSkill(name: string, consumes: string[] = [], produces: string[] = []): Skill {
  return {
    name,
    path: `/fake/${name}`,
    frontmatter: { name, description: 'test', consumes, produces },
    body: '',
    templates: [],
    hasExamples: false,
    hasScripts: false,
    hasReferences: false,
  };
}

describe('handoffGraph', () => {
  it('passes when consumes is empty', () => {
    const skill = makeSkill('implement', []);
    const result = handoffGraph(skill, [skill]);
    expect(result).toHaveLength(0);
  });

  it('passes when every consumed artefact is produced by another skill', () => {
    const producer = makeSkill('write-product', [], ['product.md']);
    const consumer = makeSkill('implement', ['product.md'], ['code']);
    const result = handoffGraph(consumer, [producer, consumer]);
    expect(result).toHaveLength(0);
  });

  it('fails when a consumed artefact is not produced by any other skill', () => {
    const skill = makeSkill('implement', ['design.md'], ['code']);
    const result = handoffGraph(skill, [skill]);
    expect(result).toHaveLength(1);
    expect(result[0]!.rule).toBe('handoff-graph');
    expect(result[0]!.severity).toBe('error');
    expect(result[0]!.message).toContain('"design.md"');
  });

  it('does not count the skill itself as a valid producer of its own consumes', () => {
    const skill = makeSkill('self-ref', ['design.md'], ['design.md']);
    const result = handoffGraph(skill, [skill]);
    expect(result).toHaveLength(1);
  });

  it('reports one diagnostic per unresolved consumed artefact', () => {
    const skill = makeSkill('multi', ['a.md', 'b.md'], []);
    const result = handoffGraph(skill, [skill]);
    expect(result).toHaveLength(2);
  });
});

import { describe, it, expect } from 'vitest';
import { publicBodyReferences } from '../../src/lint/public-body-references.js';
import type { Skill } from '../../src/skill.js';

function makeSkill(body: string, stage?: string): Skill {
  return {
    name: 'test-skill',
    path: '/fake/test-skill',
    frontmatter: {
      name: 'test-skill',
      description: 'A test skill. Do NOT use directly.',
      ...(stage ? { stage: stage as Skill['frontmatter']['stage'] } : {}),
    },
    body,
    templates: [],
    hasExamples: false,
    hasScripts: false,
    hasReferences: false,
  };
}

describe('publicBodyReferences', () => {
  it('passes for a body with no local links', () => {
    const result = publicBodyReferences(makeSkill('No links here, just text.', 'stable'), []);
    expect(result).toHaveLength(0);
  });

  it('passes for a body with http/https links', () => {
    const skill = makeSkill('See [docs](https://example.com/guide.md).', 'stable');
    expect(publicBodyReferences(skill, [])).toHaveLength(0);
  });

  it('passes for a body with {source}:path cross-repo links', () => {
    const skill = makeSkill('See [arch](space:architecture/solution.md).', 'stable');
    expect(publicBodyReferences(skill, [])).toHaveLength(0);
  });

  it('passes for a body linking to SKILL.md (always ships)', () => {
    const skill = makeSkill('See [skill](SKILL.md).', 'stable');
    expect(publicBodyReferences(skill, [])).toHaveLength(0);
  });

  it('passes for a body linking to template.md (ships)', () => {
    const skill = makeSkill('See [template](template.md).', 'stable');
    expect(publicBodyReferences(skill, [])).toHaveLength(0);
  });

  it('passes for a body linking to a generic example (ships)', () => {
    const skill = makeSkill('See [example](examples/product.md).', 'stable');
    expect(publicBodyReferences(skill, [])).toHaveLength(0);
  });

  it('emits error when body links to a template variant (template-*.md)', () => {
    const skill = makeSkill(
      'See [template-domain.md](template-domain.md) for domain mode.',
      'stable',
    );
    const result = publicBodyReferences(skill, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.rule).toBe('public-body-references');
    expect(result[0]!.severity).toBe('error');
    expect(result[0]!.skill).toBe('test-skill');
    expect(result[0]!.message).toContain('"template-domain.md"');
  });

  it('emits error when body links to a cart-prefixed example', () => {
    const skill = makeSkill(
      'See [examples/cart-domain-backlog.md](examples/cart-domain-backlog.md).',
      'stable',
    );
    const result = publicBodyReferences(skill, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.rule).toBe('public-body-references');
    expect(result[0]!.message).toContain('"examples/cart-domain-backlog.md"');
  });

  it('emits error when body links to a space-prefixed example', () => {
    const skill = makeSkill(
      'See [examples/space-product.md](examples/space-product.md).',
      'stable',
    );
    const result = publicBodyReferences(skill, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.message).toContain('"examples/space-product.md"');
  });

  it('emits error when body links to a workflow-engine-prefixed example', () => {
    const skill = makeSkill(
      'See [examples/workflow-engine.md](examples/workflow-engine.md).',
      'stable',
    );
    const result = publicBodyReferences(skill, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.message).toContain('"examples/workflow-engine.md"');
  });

  it('emits error when body links to a file under .internal/', () => {
    const skill = makeSkill('See [file](.internal/private-doc.md).', 'stable');
    const result = publicBodyReferences(skill, []);
    expect(result).toHaveLength(1);
    expect(result[0]!.message).toContain('".internal/private-doc.md"');
  });

  it('emits one error per non-shipping link', () => {
    const skill = makeSkill(
      'Use [template-tdd.md](template-tdd.md) and [template-walking-skeleton.md](template-walking-skeleton.md) and [examples/cart-foo.md](examples/cart-foo.md).',
      'stable',
    );
    const result = publicBodyReferences(skill, []);
    expect(result).toHaveLength(3);
    expect(result.every((d) => d.rule === 'public-body-references')).toBe(true);
  });

  it('skips a draft skill entirely', () => {
    const skill = makeSkill('See [examples/cart-product.md](examples/cart-product.md).', 'draft');
    expect(publicBodyReferences(skill, [])).toHaveLength(0);
  });

  it('skips a deprecated skill entirely', () => {
    const skill = makeSkill('See [template-domain.md](template-domain.md).', 'deprecated');
    expect(publicBodyReferences(skill, [])).toHaveLength(0);
  });

  it('skips a skill with no stage field (not explicitly stable)', () => {
    const skill = makeSkill('See [examples/cart-product.md](examples/cart-product.md).');
    // Skills without a stage field are caught by required-fields lint, but
    // public-body-references only runs against explicitly stable skills.
    expect(publicBodyReferences(skill, [])).toHaveLength(0);
  });

  it('reports the skill name in the diagnostic', () => {
    const skill: Skill = {
      name: 'write-backlog',
      path: '/fake/write-backlog',
      frontmatter: {
        name: 'write-backlog',
        description: 'Drafts a backlog. Do NOT use for roadmaps.',
        stage: 'stable',
      },
      body: 'See [examples/cart-foo.md](examples/cart-foo.md).',
      templates: [],
      hasExamples: true,
      hasScripts: false,
      hasReferences: false,
    };
    const result = publicBodyReferences(skill, []);
    expect(result[0]!.skill).toBe('write-backlog');
  });
});

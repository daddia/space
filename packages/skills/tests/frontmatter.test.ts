import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  serialiseFrontmatter,
  stripFrontmatter,
  PUBLIC_KEYS,
  type DaddiaFrontmatter,
} from '../src/frontmatter.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RICH_SKILL_MD = `---
name: write-product
description: >
  Drafts product.md at portfolio, product, or domain scope. Use when the user
  mentions "product doc". Do NOT include tech stack. Do NOT use for roadmaps.
allowed-tools:
  - Read
  - Write
artefact: product.md
track: strategy
role: pm
stage: stable
consumes: []
produces:
  - product.md
version: '1.0.0'
---

# Write Product

Skill body content goes here.
Second line of body.
`;

const MINIMAL_SKILL_MD = `---
name: implement
description: Implements code for a story or task.
---

# Implement

Body.
`;

const NO_FRONTMATTER = `# Just a heading

Some content.
`;

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------

describe('parseFrontmatter', () => {
  it('parses all fields from rich daddia frontmatter', () => {
    const { data } = parseFrontmatter(RICH_SKILL_MD);
    expect(data.name).toBe('write-product');
    expect(data.artefact).toBe('product.md');
    expect(data.track).toBe('strategy');
    expect(data.role).toBe('pm');
    expect(data.stage).toBe('stable');
    expect(data['allowed-tools']).toEqual(['Read', 'Write']);
    expect(data.produces).toEqual(['product.md']);
    expect(data.consumes).toEqual([]);
  });

  it('returns body without frontmatter', () => {
    const { body } = parseFrontmatter(RICH_SKILL_MD);
    // blank line between the closing --- and the first heading is preserved
    expect(body).toContain('# Write Product');
    expect(body.replace(/^\n+/, '').startsWith('# Write Product')).toBe(true);
    expect(body).not.toContain('name: write-product');
  });

  it('handles folded scalar (>) description correctly', () => {
    const { data } = parseFrontmatter(RICH_SKILL_MD);
    expect(typeof data.description).toBe('string');
    expect(data.description.length).toBeGreaterThan(0);
    // yaml parses folded scalars into a single string (may include newlines)
    expect(data.description).toContain('Drafts product.md');
  });

  it('parses minimal frontmatter', () => {
    const { data, body } = parseFrontmatter(MINIMAL_SKILL_MD);
    expect(data.name).toBe('implement');
    expect(data.description).toBe('Implements code for a story or task.');
    expect(body.trim()).toBe('# Implement\n\nBody.');
  });

  it('returns empty data and full content as body when no frontmatter', () => {
    const { data, body } = parseFrontmatter(NO_FRONTMATTER);
    expect(data).toEqual({});
    expect(body).toBe(NO_FRONTMATTER);
  });
});

// ---------------------------------------------------------------------------
// serialiseFrontmatter
// ---------------------------------------------------------------------------

describe('serialiseFrontmatter', () => {
  it('produces fenced YAML starting and ending with ---', () => {
    const data: DaddiaFrontmatter = { name: 'test', description: 'A test skill.' };
    const result = serialiseFrontmatter(data);
    expect(result.startsWith('---\n')).toBe(true);
    expect(result.trimEnd().endsWith('---')).toBe(true);
  });

  it('round-trips scalar fields', () => {
    const data: DaddiaFrontmatter = {
      name: 'write-product',
      description: 'Short description.',
      artefact: 'product.md',
      stage: 'stable',
    };
    const serialised = serialiseFrontmatter(data);
    const { data: parsed } = parseFrontmatter(`${serialised}\n# Body`);
    expect(parsed.name).toBe(data.name);
    expect(parsed.description).toBe(data.description);
    expect(parsed.artefact).toBe(data.artefact);
    expect(parsed.stage).toBe(data.stage);
  });

  it('round-trips list fields', () => {
    const data: DaddiaFrontmatter = {
      name: 'x',
      description: 'y',
      'allowed-tools': ['Read', 'Write', 'Glob'],
      produces: ['product.md'],
      consumes: [],
    };
    const serialised = serialiseFrontmatter(data);
    const { data: parsed } = parseFrontmatter(`${serialised}\n# Body`);
    expect(parsed['allowed-tools']).toEqual(['Read', 'Write', 'Glob']);
    expect(parsed.produces).toEqual(['product.md']);
    expect(parsed.consumes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// stripFrontmatter
// ---------------------------------------------------------------------------

describe('stripFrontmatter', () => {
  it('retains only allowed keys in the stripped frontmatter', () => {
    const { data } = parseFrontmatter(stripFrontmatter(RICH_SKILL_MD, PUBLIC_KEYS));
    expect(data.name).toBe('write-product');
    expect(data.description).toBeDefined();
    expect(data['allowed-tools']).toEqual(['Read', 'Write']);
    // daddia-specific fields must be absent
    expect((data as Record<string, unknown>).artefact).toBeUndefined();
    expect((data as Record<string, unknown>).track).toBeUndefined();
    expect((data as Record<string, unknown>).stage).toBeUndefined();
    expect((data as Record<string, unknown>).produces).toBeUndefined();
  });

  it('preserves the body byte-for-byte', () => {
    const { body: originalBody } = parseFrontmatter(RICH_SKILL_MD);
    const stripped = stripFrontmatter(RICH_SKILL_MD, PUBLIC_KEYS);
    const { body: strippedBody } = parseFrontmatter(stripped);
    expect(strippedBody).toBe(originalBody);
  });

  it('preserves name and description after stripping', () => {
    const stripped = stripFrontmatter(RICH_SKILL_MD, PUBLIC_KEYS);
    const { data } = parseFrontmatter(stripped);
    expect(data.name).toBe('write-product');
    expect(typeof data.description).toBe('string');
    expect(data.description.length).toBeGreaterThan(0);
  });

  it('returns original content unchanged when no frontmatter fence is present', () => {
    expect(stripFrontmatter(NO_FRONTMATTER, PUBLIC_KEYS)).toBe(NO_FRONTMATTER);
  });

  it('handles a custom allowed-keys set', () => {
    const nameOnly: ReadonlySet<'name'> = new Set(['name']);
    const stripped = stripFrontmatter(
      RICH_SKILL_MD,
      nameOnly as ReadonlySet<keyof import('../src/frontmatter.js').PublicFrontmatter>,
    );
    const { data } = parseFrontmatter(stripped);
    expect(data.name).toBe('write-product');
    expect((data as Record<string, unknown>).description).toBeUndefined();
  });
});

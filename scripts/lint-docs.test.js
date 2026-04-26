import { describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  checkFrontmatterSchema,
  checkLinkCheck,
  checkBudget,
  checkNegativeConstraints,
  checkNoSpeculativeEpicIds,
  checkStoryACSchema,
  checkNoRepeatedScope,
  parseFrontmatter,
  splitFrontmatter,
  extractSectionItems,
  lintDocs,
} from './lint-docs.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeDocsDir() {
  const dir = await mkdtemp(path.join(tmpdir(), 'lint-docs-'));
  await mkdir(path.join(dir, 'docs'), { recursive: true });
  return dir;
}

const VALID_PRODUCT_FM = {
  type: 'Product',
  product: 'test',
  status: 'Draft',
  owner: 'Team',
  last_updated: '2026-01-01',
};

// ---------------------------------------------------------------------------
// parseFrontmatter / splitFrontmatter
// ---------------------------------------------------------------------------

describe('parseFrontmatter', () => {
  it('parses simple key: value pairs', () => {
    const fm = parseFrontmatter('type: Product\nstatus: Draft\n');
    expect(fm.type).toBe('Product');
    expect(fm.status).toBe('Draft');
  });

  it('strips surrounding quotes from values', () => {
    expect(parseFrontmatter("version: '1.0'").version).toBe('1.0');
  });
});

describe('splitFrontmatter', () => {
  it('splits YAML frontmatter from body', () => {
    const { fm, body } = splitFrontmatter('---\ntype: Product\n---\n\n# Title\n');
    expect(fm).toContain('type: Product');
    expect(body).toContain('# Title');
  });

  it('returns empty fm when no frontmatter', () => {
    const { fm, body } = splitFrontmatter('# Title\n');
    expect(fm).toBe('');
    expect(body).toContain('# Title');
  });
});

// ---------------------------------------------------------------------------
// frontmatter-schema
// ---------------------------------------------------------------------------

describe('checkFrontmatterSchema', () => {
  it('returns no findings for a complete Product frontmatter', () => {
    expect(checkFrontmatterSchema('docs/product.md', VALID_PRODUCT_FM)).toHaveLength(0);
  });

  it('reports a finding when a required field is missing', () => {
    const fm = { ...VALID_PRODUCT_FM };
    delete fm.owner;
    const findings = checkFrontmatterSchema('docs/product.md', fm);
    expect(findings).toHaveLength(1);
    expect(findings[0].check).toBe('frontmatter-schema');
    expect(findings[0].message).toContain('owner');
  });

  it('returns no findings for an unknown doc type', () => {
    expect(checkFrontmatterSchema('docs/x.md', { type: 'Unknown' })).toHaveLength(0);
  });

  it('returns no findings when type is absent', () => {
    expect(checkFrontmatterSchema('docs/x.md', {})).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// link-check
// ---------------------------------------------------------------------------

describe('checkLinkCheck', () => {
  let tempDir;

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it('returns no findings when a same-dir link resolves', async () => {
    tempDir = await makeDocsDir();
    await writeFile(path.join(tempDir, 'docs', 'product.md'), '# Product\n');
    await writeFile(path.join(tempDir, 'docs', 'roadmap.md'), '[p](product.md)\n');
    const findings = checkLinkCheck('docs/roadmap.md', '[p](product.md)\n', tempDir);
    expect(findings).toHaveLength(0);
  });

  it('reports a finding when a same-dir link target does not exist', async () => {
    tempDir = await makeDocsDir();
    const findings = checkLinkCheck('docs/roadmap.md', '[p](missing.md)\n', tempDir);
    expect(findings).toHaveLength(1);
    expect(findings[0].check).toBe('link-check');
    expect(findings[0].message).toContain('missing.md');
  });

  it('skips links with ../ (cross-directory references)', () => {
    const findings = checkLinkCheck(
      'docs/work/foo/backlog.md',
      '[x](../../docs/backlog.md)\n',
      '/tmp',
    );
    expect(findings).toHaveLength(0);
  });

  it('skips http:// links', () => {
    const findings = checkLinkCheck('docs/product.md', '[x](https://example.com)\n', '/tmp');
    expect(findings).toHaveLength(0);
  });

  it('skips links inside code fences', async () => {
    tempDir = await makeDocsDir();
    const content = '```\n[broken](does-not-exist.md)\n```\n';
    const findings = checkLinkCheck('docs/product.md', content, tempDir);
    expect(findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// budget
// ---------------------------------------------------------------------------

describe('checkBudget', () => {
  it('returns no findings when line count is under the limit', () => {
    const content = 'line\n'.repeat(100);
    expect(checkBudget('docs/product.md', content, { type: 'Product' })).toHaveLength(0);
  });

  it('reports a finding when line count exceeds the limit', () => {
    const content = 'line\n'.repeat(700);
    const findings = checkBudget('docs/product.md', content, { type: 'Product' });
    expect(findings).toHaveLength(1);
    expect(findings[0].check).toBe('budget');
  });

  it('returns no findings for an unknown type', () => {
    const content = 'line\n'.repeat(9999);
    expect(checkBudget('docs/x.md', content, { type: 'Unknown' })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// negative-constraints
// ---------------------------------------------------------------------------

describe('checkNegativeConstraints', () => {
  it('returns no findings when no DO NOT INCLUDE comment is present', () => {
    const content = '# Doc\n\nSome content.\n';
    expect(checkNegativeConstraints('docs/product.md', content)).toHaveLength(0);
  });

  it('reports a finding when an actual HTML comment contains DO NOT INCLUDE', () => {
    const content = '# Doc\n<!--\nDO NOT INCLUDE: commercial rationale\n-->\n';
    const findings = checkNegativeConstraints('docs/product.md', content);
    expect(findings).toHaveLength(1);
    expect(findings[0].check).toBe('negative-constraints');
  });

  it('ignores DO NOT INCLUDE text inside code fences', () => {
    const content = '# Doc\n```html\n<!--\nDO NOT INCLUDE: example\n-->\n```\n';
    expect(checkNegativeConstraints('docs/product.md', content)).toHaveLength(0);
  });

  it('ignores DO NOT INCLUDE in inline backtick code', () => {
    const content = '# Doc\nSee `<!-- DO NOT INCLUDE -->` in templates.\n';
    expect(checkNegativeConstraints('docs/product.md', content)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// no-speculative-epic-ids
// ---------------------------------------------------------------------------

describe('checkNoSpeculativeEpicIds', () => {
  it('returns no findings when no epic IDs are present', () => {
    const content = '# Roadmap\n\nOutcomes and phases.\n';
    expect(checkNoSpeculativeEpicIds('docs/roadmap.md', content)).toHaveLength(0);
  });

  it('reports a finding when an epic ID pattern appears', () => {
    const content = '# Roadmap\n\nNext phase ships CART-01.\n';
    const findings = checkNoSpeculativeEpicIds('docs/roadmap.md', content);
    expect(findings).toHaveLength(1);
    expect(findings[0].check).toBe('no-speculative-epic-ids');
    expect(findings[0].message).toContain('CART-01');
  });

  it('ignores epic IDs inside code fences', () => {
    const content = '# Roadmap\n```\nSPACE-01\n```\n';
    expect(checkNoSpeculativeEpicIds('docs/roadmap.md', content)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// story-AC-schema
// ---------------------------------------------------------------------------

describe('checkStoryACSchema', () => {
  it('returns no findings for a complete v2 story', () => {
    const story = `- [ ] **[WP-01] Title**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 3
  - **Epic:** WP | **Labels:** x | **Depends on:** -
  - **Deliverable:** something
  - **Design:** [link](design.md#section)
  - **Acceptance (EARS):**
    - WHEN x, THE SYSTEM SHALL y.
  - **Acceptance (Gherkin):**
    \`\`\`gherkin
    Scenario: test
      Given x
      When y
      Then z
    \`\`\`
`;
    expect(checkStoryACSchema('docs/work/wp/backlog.md', story)).toHaveLength(0);
  });

  it('reports a finding when a required field is missing', () => {
    const story = `- [ ] **[WP-01] Title**
  - **Status:** Not started | **Priority:** P1 | **Estimate:** 3
  - **Acceptance (EARS):**
    - WHEN x, THE SYSTEM SHALL y.
`;
    const findings = checkStoryACSchema('docs/work/wp/backlog.md', story);
    // Should flag missing Epic, Labels, Depends on, Deliverable, Design, Gherkin
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].check).toBe('story-AC-schema');
  });

  it('skips v0 backlogs that have no Acceptance (EARS) stories', () => {
    const oldStyleContent = `- [x] **[SPACE-01] Story**\n  - **Status:** Done\n  - **Acceptance:**\n    - passes\n`;
    expect(checkStoryACSchema('docs/work/01/backlog.md', oldStyleContent)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// no-repeated-scope
// ---------------------------------------------------------------------------

describe('checkNoRepeatedScope', () => {
  it('returns no findings when items are distinct', () => {
    const sections = [
      { file: 'docs/product.md', items: ['Auth UI', 'Billing'] },
      { file: 'docs/solution.md', items: ['Database', 'Caching'] },
    ];
    expect(checkNoRepeatedScope(sections)).toHaveLength(0);
  });

  it('reports a finding when the same item appears in two docs', () => {
    const sections = [
      { file: 'docs/product.md', items: ['Auth UI'] },
      { file: 'docs/solution.md', items: ['Auth UI'] },
    ];
    const findings = checkNoRepeatedScope(sections);
    expect(findings).toHaveLength(1);
    expect(findings[0].check).toBe('no-repeated-scope');
  });

  it('is case-insensitive for item comparison', () => {
    const sections = [
      { file: 'docs/product.md', items: ['auth ui'] },
      { file: 'docs/solution.md', items: ['Auth UI'] },
    ];
    expect(checkNoRepeatedScope(sections)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// extractSectionItems
// ---------------------------------------------------------------------------

describe('extractSectionItems', () => {
  it('extracts bullet items from a named section', () => {
    const content = '## No-gos\n\n- End-user products\n- Billing\n\n## Other\n';
    expect(extractSectionItems(content, 'No-gos')).toEqual(['End-user products', 'Billing']);
  });

  it('returns empty array when the section is not found', () => {
    expect(extractSectionItems('# Doc\nNo sections.', 'Missing')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// lintDocs integration: clean repo docs tree passes
// ---------------------------------------------------------------------------

describe('lintDocs against real docs tree', () => {
  it('produces zero findings on the committed docs/ tree', () => {
    const repoRoot = path.resolve(new URL(import.meta.url).pathname, '..', '..');
    const findings = lintDocs(repoRoot);
    if (findings.length > 0) {
      console.error('Unexpected findings:', findings);
    }
    expect(findings).toHaveLength(0);
  });
});

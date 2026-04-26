#!/usr/bin/env node
/**
 * lint-docs
 *
 * Eight structural checks on docs/ and work/ artefact files.
 *
 * Checks (ID, spec):
 *   frontmatter-schema      required frontmatter keys present per doc type
 *   link-check              same-directory relative links resolve to existing files
 *   budget                  doc length within per-type limit
 *   id-resolution           cited ADR-NNNN IDs resolve in decisions/register.md
 *   no-repeated-scope       out-of-scope sections don't repeat the same item
 *   negative-constraints    no artefact contains a DO NOT INCLUDE comment block
 *   no-speculative-epic-ids roadmap.md files contain no epic ID patterns
 *   story-AC-schema         every story in v2 work-package backlogs has all required fields
 *
 * Output format:
 *   [check-id] path/to/file.md: message
 *
 * Exit codes:
 *   0  zero findings
 *   1  one or more findings
 *
 * Usage:
 *   node scripts/lint-docs.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..');

// ---------------------------------------------------------------------------
// Exported core logic (used by tests)
// ---------------------------------------------------------------------------

/** @typedef {{ file: string, check: string, message: string }} Finding */

export const CANONICAL_TYPES = new Set([
  'Product',
  'Solution',
  'Roadmap',
  'Backlog',
  'Design',
  'Contracts',
  'product',
  'solution',
  'roadmap',
  'backlog',
  'design',
  'contracts',
]);

// Required frontmatter fields per doc type (case-insensitive type key)
const REQUIRED_FIELDS = {
  product: ['type', 'product', 'status', 'owner', 'last_updated'],
  solution: ['type', 'product', 'status', 'owner', 'last_updated'],
  roadmap: ['type', 'product', 'status', 'owner', 'last_updated'],
  backlog: ['type', 'scope', 'status', 'owner', 'last_updated'],
  design: ['type', 'scope', 'status', 'owner', 'last_updated'],
  contracts: ['type', 'status', 'owner', 'last_updated'],
};

// Line-count budgets per doc type (generous: catches runaway docs, not normal growth)
const BUDGETS = {
  product: 600,
  solution: 1000,
  roadmap: 600,
  backlog: 650,
  design: 1050,
  contracts: 600,
};

const STORY_REQUIRED_FIELDS = [
  'Status',
  'Priority',
  'Estimate',
  'Epic',
  'Labels',
  'Depends on',
  'Deliverable',
  'Design',
  'Acceptance (EARS)',
  'Acceptance (Gherkin)',
];

// Epic ID patterns that must not appear in roadmap files
const EPIC_ID_RE = /\b([A-Z]{2,}-[0-9]+|EPIC-[0-9]+)\b/;

// ADR ID owning document
const ADR_OWNER = 'architecture/decisions/register.md';

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------

export function splitFrontmatter(content) {
  if (!content.startsWith('---\n')) return { fm: '', body: content };
  const end = content.indexOf('\n---', 4);
  if (end === -1) return { fm: '', body: content };
  return { fm: content.slice(4, end), body: content.slice(end + 4) };
}

export function parseFrontmatter(src) {
  const out = {};
  for (const line of src.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Individual checks — each returns Finding[]
// ---------------------------------------------------------------------------

export function checkFrontmatterSchema(filePath, fm) {
  const type = (fm.type ?? '').toLowerCase();
  const required = REQUIRED_FIELDS[type];
  if (!required) return [];
  return required
    .filter((k) => !fm[k] || fm[k] === '')
    .map((k) => ({
      file: filePath,
      check: 'frontmatter-schema',
      message: `missing required frontmatter field: ${k}`,
    }));
}

export function checkLinkCheck(filePath, content, repoRoot) {
  const findings = [];
  const fileDir = path.dirname(path.resolve(repoRoot, filePath));

  // Strip code fence blocks so we don't check example links inside them
  const stripped = content.replace(/```[\s\S]*?```/g, '');

  const linkRe = /\]\(([^)#\s]+)/g;
  let m;
  while ((m = linkRe.exec(stripped)) !== null) {
    const href = m[1];
    if (href.startsWith('http') || href.startsWith('mailto') || href.startsWith('#')) continue;
    if (href.startsWith('../') || href.includes('../')) continue; // skip cross-dir refs
    if (!href.endsWith('.md')) continue; // only check .md file links

    const resolved = path.resolve(fileDir, href);
    if (!fs.existsSync(resolved)) {
      findings.push({
        file: filePath,
        check: 'link-check',
        message: `broken link -> ${href}`,
      });
    }
  }
  return findings;
}

export function checkBudget(filePath, content, fm) {
  const type = (fm.type ?? '').toLowerCase();
  const limit = BUDGETS[type];
  if (!limit) return [];
  const lines = content.split('\n').length;
  if (lines > limit) {
    return [
      {
        file: filePath,
        check: 'budget',
        message: `doc is ${lines} lines; limit for type ${fm.type} is ${limit}`,
      },
    ];
  }
  return [];
}

export function checkIdResolution(filePath, content, repoRoot) {
  // Only check ADR IDs; skip if the owning document doesn't exist
  const ownerPath = path.join(repoRoot, ADR_OWNER);
  if (!fs.existsSync(ownerPath)) return [];

  const ownerContent = fs.readFileSync(ownerPath, 'utf-8');
  const stripped = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '');

  const findings = [];
  const adrRe = /\bADR-([0-9]{4})\b/g;
  let m;
  while ((m = adrRe.exec(stripped)) !== null) {
    const id = `ADR-${m[1]}`;
    if (!ownerContent.includes(id)) {
      findings.push({
        file: filePath,
        check: 'id-resolution',
        message: `${id} cited but not found in ${ADR_OWNER}`,
      });
    }
  }
  return findings;
}

export function checkNoRepeatedScope(docsWithScopes) {
  /**
   * docsWithScopes: Array<{ file, items: string[] }>
   * Items are the out-of-scope bullet text values extracted from each doc.
   * Returns findings for any item that appears in more than one doc.
   */
  const seen = new Map(); // normalised item → first file
  const findings = [];

  for (const { file, items } of docsWithScopes) {
    for (const item of items) {
      const norm = item.toLowerCase().trim().replace(/\s+/g, ' ');
      if (!norm) continue;
      if (seen.has(norm)) {
        findings.push({
          file,
          check: 'no-repeated-scope',
          message: `out-of-scope item "${item.trim()}" also appears in ${seen.get(norm)}`,
        });
      } else {
        seen.set(norm, file);
      }
    }
  }
  return findings;
}

export function checkNegativeConstraints(filePath, content) {
  // Strip code fences and inline code before checking for actual HTML comment blocks
  const stripped = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '');

  if (/<!--[\s\S]*?DO NOT INCLUDE[\s\S]*?-->/.test(stripped)) {
    return [
      {
        file: filePath,
        check: 'negative-constraints',
        message: 'doc contains a DO NOT INCLUDE drafting-aide comment block (skill template only)',
      },
    ];
  }
  return [];
}

export function checkNoSpeculativeEpicIds(filePath, content) {
  const stripped = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '');

  const findings = [];
  for (const line of stripped.split('\n')) {
    const m = line.match(EPIC_ID_RE);
    if (m) {
      findings.push({
        file: filePath,
        check: 'no-speculative-epic-ids',
        message: `roadmap cites epic ID ${m[0]} — roadmap owns outcomes, not epics; move epic to backlog.md`,
      });
    }
  }
  return findings;
}

export function checkStoryACSchema(filePath, content) {
  // Only apply to v2 backlogs (those that already have at least one EARS story)
  if (!content.includes('Acceptance (EARS)')) return [];

  const findings = [];
  const storyRe = /^- \[.\] \*\*\[([^\]]+)\]/gm;
  let m;
  while ((m = storyRe.exec(content)) !== null) {
    const id = m[1];
    const pos = m.index;
    const nextPos = content.indexOf('\n- [', pos + 5);
    const block = nextPos === -1 ? content.slice(pos) : content.slice(pos, nextPos);

    for (const field of STORY_REQUIRED_FIELDS) {
      if (!block.includes(`**${field}:**`)) {
        findings.push({
          file: filePath,
          check: 'story-AC-schema',
          message: `story ${id} is missing required field: ${field}`,
        });
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Out-of-scope section extraction
// ---------------------------------------------------------------------------

/**
 * Extract bullet-point text from a named section in a Markdown doc.
 * Used by no-repeated-scope to find out-of-scope items.
 */
export function extractSectionItems(content, headingPattern) {
  const headingRe = new RegExp(`^##\\s+${headingPattern}`, 'im');
  const m = headingRe.exec(content);
  if (!m) return [];

  const start = m.index + m[0].length;
  const nextHeading = content.indexOf('\n## ', start);
  const section = nextHeading === -1 ? content.slice(start) : content.slice(start, nextHeading);

  return section
    .split('\n')
    .filter((l) => l.trimStart().startsWith('-'))
    .map((l) => l.replace(/^[\s-]+/, '').trim());
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

export function collectDocFiles(repoRoot) {
  const files = [];
  const docsDir = path.join(repoRoot, 'docs');

  function walk(dir, relBase) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const rel = path.join(relBase, entry);
      if (fs.statSync(full).isDirectory()) {
        // Skip non-artefact subdirectories under docs/
        if (relBase === 'docs' && (entry === 'getting-started' || entry === 'research')) continue;
        walk(full, rel);
      } else if (entry.endsWith('.md') && entry !== 'README.md') {
        files.push(rel);
      }
    }
  }

  walk(docsDir, 'docs');
  return files;
}

// ---------------------------------------------------------------------------
// Main lint runner
// ---------------------------------------------------------------------------

export function lintDocs(repoRoot) {
  const files = collectDocFiles(repoRoot);
  const allFindings = [];

  // Collect out-of-scope sections across canonical docs for no-repeated-scope check
  const scopeSections = [];

  for (const relPath of files) {
    const fullPath = path.join(repoRoot, relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const { fm: rawFm } = splitFrontmatter(content);
    const fm = parseFrontmatter(rawFm);
    const type = (fm.type ?? '').toLowerCase();

    if (!CANONICAL_TYPES.has(fm.type ?? '')) continue;

    // 1. frontmatter-schema
    allFindings.push(...checkFrontmatterSchema(relPath, fm));

    // 2. link-check
    allFindings.push(...checkLinkCheck(relPath, content, repoRoot));

    // 3. budget
    allFindings.push(...checkBudget(relPath, content, fm));

    // 4. id-resolution
    allFindings.push(...checkIdResolution(relPath, content, repoRoot));

    // 5. negative-constraints
    allFindings.push(...checkNegativeConstraints(relPath, content));

    // 6. no-speculative-epic-ids (roadmap docs only)
    if (type === 'roadmap') {
      allFindings.push(...checkNoSpeculativeEpicIds(relPath, content));
    }

    // 7. story-AC-schema (work-package backlog docs only)
    if (type === 'backlog' && relPath.includes('/work/')) {
      allFindings.push(...checkStoryACSchema(relPath, content));
    }

    // Collect out-of-scope items for no-repeated-scope (after all per-file checks)
    if (type === 'product') {
      scopeSections.push({ file: relPath, items: extractSectionItems(content, 'No-gos') });
    } else if (type === 'solution') {
      scopeSections.push({ file: relPath, items: extractSectionItems(content, 'Out of scope') });
    } else if (type === 'roadmap') {
      scopeSections.push({ file: relPath, items: extractSectionItems(content, 'Later') });
    } else if (type === 'backlog' && !relPath.includes('/work/')) {
      scopeSections.push({ file: relPath, items: extractSectionItems(content, 'Summary') });
    }
  }

  // 8. no-repeated-scope (cross-file, done after collecting all sections)
  allFindings.push(...checkNoRepeatedScope(scopeSections));

  return allFindings;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const findings = lintDocs(REPO_ROOT);

  for (const { file, check, message } of findings) {
    process.stdout.write(`[${check}] ${file}: ${message}\n`);
  }

  if (findings.length > 0) {
    process.stdout.write(`\nlint-docs: ${findings.length} finding(s)\n`);
    process.exit(1);
  }

  process.stdout.write('lint-docs: all checks pass\n');
}

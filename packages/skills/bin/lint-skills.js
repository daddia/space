#!/usr/bin/env node
/**
 * lint-skills
 *
 * Validates every skill package against the v2 skill contract defined in
 * docs/design/space-artefact-model.md and the SPACE-02 epic acceptance
 * criteria.
 *
 * Checks (grouped by SPACE-02 story that introduced them):
 *
 *   SPACE-02-06  Enriched frontmatter
 *     - Required fields present and non-empty:
 *       name, description, allowed-tools, version, artefact, phase, role,
 *       produces
 *     - `consumes` entries resolve to something another skill `produces`
 *       (handoff graph integrity)
 *
 *   SPACE-02-07  Description authoring rules
 *     - description is 200–500 characters
 *     - description opens with a third-person verb-ing form
 *       (Drafts, Creates, Implements, Reviews, Performs, Documents, Produces,
 *       Identifies)
 *     - description mentions the produced artefact name verbatim
 *     - description contains at least one `Do NOT use` disambiguation clause
 *     - descriptions are unique (no collision)
 *
 *   SPACE-02-08  Negative constraints
 *     - Every template*.md file starts (after optional YAML frontmatter) with
 *       a DRAFTING AIDE / DO NOT INCLUDE block
 *     - Skills with no template file have a `## Negative constraints` section
 *       in their SKILL.md body
 *
 *   Alias exemption
 *     - Skills whose frontmatter declares `stage: deprecated` are exempt from
 *       v2-frontmatter and description-authoring checks (they are backward-
 *       compat shims). They still must point at a live skill via `related:`.
 *
 * Usage:
 *   node bin/lint-skills.js             # lint all skills in this package
 *   node bin/lint-skills.js write-solution write-backlog
 *                                       # lint only the named skills
 *   node bin/lint-skills.js --json      # machine-readable output
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — one or more errors
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateProfiles } from './profile-utils.js';

const packageDir = path.resolve(fileURLToPath(import.meta.url), '..', '..');

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const skillFilter = args.filter((a) => !a.startsWith('--'));

const REQUIRED_FIELDS = [
  'name',
  'description',
  'allowed-tools',
  'version',
  'artefact',
  'track',
  'role',
  'produces',
];

const DESCRIPTION_VERB_RE =
  /^(Drafts|Creates|Implements|Reviews|Performs|Documents|Produces|Identifies|Refines)\b/;

const ALIAS_MARKER_RE = /^<!--\s*Alias:/m;

// ---------------------------------------------------------------------------
// Load skills
// ---------------------------------------------------------------------------

const skillDirs = fs
  .readdirSync(packageDir)
  .filter((entry) => {
    if (entry === 'bin' || entry.startsWith('.')) return false;
    const fullPath = path.join(packageDir, entry);
    return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'SKILL.md'));
  })
  .filter((name) => skillFilter.length === 0 || skillFilter.includes(name))
  .sort();

if (skillDirs.length === 0) {
  console.error('lint-skills: no skills found to lint');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Parse each skill
// ---------------------------------------------------------------------------

const skills = skillDirs.map((name) => {
  const dir = path.join(packageDir, name);
  const skillMdPath = path.join(dir, 'SKILL.md');
  const content = fs.readFileSync(skillMdPath, 'utf8');
  const { frontmatter, body } = splitFrontmatter(content);
  const fm = parseFrontmatter(frontmatter);

  const templates = fs
    .readdirSync(dir)
    .filter((f) => /^template.*\.md$/.test(f))
    .map((f) => path.join(dir, f));

  return { name, dir, content, body, fm, templates };
});

// Build the produced-artefact set so we can resolve `consumes`
const produced = new Set();
for (const { fm } of skills) {
  for (const item of fm.produces ?? []) produced.add(item);
}

// ---------------------------------------------------------------------------
// Run checks
// ---------------------------------------------------------------------------

const findings = []; // { skill, severity, rule, message }
const descriptionIndex = new Map(); // description → first skill that used it

for (const skill of skills) {
  const { name, fm, body, templates, dir } = skill;
  const isAlias = fm.stage === 'deprecated' || ALIAS_MARKER_RE.test(body);

  // ─── Relative path check ────────────────────────────────────────────────
  // Skills must use the {source}:{path} URI scheme for cross-repo references.
  // Bare ../ paths are fragile and workspace-specific.
  if (!isAlias && body.includes('../')) {
    err(name, 'path.relative', 'skill body contains ../ relative path — use {source}:{path} URI scheme for cross-repo references (see AGENTS.md)');
  }

  // ─── Required fields ────────────────────────────────────────────────────
  if (!isAlias) {
    for (const field of REQUIRED_FIELDS) {
      if (fm[field] === undefined || fm[field] === null || fm[field] === '') {
        err(name, 'fm.required', `missing required frontmatter field: ${field}`);
      } else if (Array.isArray(fm[field]) && fm[field].length === 0) {
        err(name, 'fm.required', `frontmatter field is empty: ${field}`);
      }
    }
  } else {
    // Aliases must still have a name, description, allowed-tools, and related target
    for (const field of ['name', 'description', 'allowed-tools']) {
      if (!fm[field]) err(name, 'alias.required', `alias missing: ${field}`);
    }
    if (!fm.related || fm.related.length === 0) {
      err(name, 'alias.related', 'alias SKILL.md must list live skill in `related`');
    }
  }

  // ─── Consumes graph integrity ──────────────────────────────────────────
  for (const item of fm.consumes ?? []) {
    if (!produced.has(item)) {
      err(name, 'graph.consumes', `consumes "${item}" but no other skill produces it`);
    }
  }

  // ─── Description authoring rules ────────────────────────────────────────
  const desc = fm.description ?? '';
  if (!isAlias) {
    if (desc.length < 200 || desc.length > 500) {
      err(name, 'desc.length', `description is ${desc.length} chars (expected 200–500)`);
    }
    if (!DESCRIPTION_VERB_RE.test(desc)) {
      err(
        name,
        'desc.verb',
        'description must open with a third-person verb-ing form (Drafts|Creates|Implements|Reviews|Performs|Documents|Produces|Identifies)',
      );
    }
    if (!/Do NOT\b/.test(desc)) {
      err(
        name,
        'desc.disambiguation',
        'description must contain at least one `Do NOT` neighbour disambiguation clause',
      );
    }
    // Mentions produced artefact name verbatim — only enforced for file
    // artefacts (names ending in .md). Non-file artefacts like
    // "MR description", "code", "review", "validation" are prose labels and
    // are covered by the trigger-phrase clauses instead.
    const producesList = fm.produces ?? [];
    const fileArtefacts = producesList.filter((p) => /\.md$/.test(p));
    if (fileArtefacts.length > 0) {
      const mentionsProduced = fileArtefacts.some((p) => desc.includes(p));
      if (!mentionsProduced) {
        err(
          name,
          'desc.artefact',
          `description must mention at least one produced .md artefact verbatim (produces: ${fileArtefacts.join(', ')})`,
        );
      }
    }

    const normalised = desc.replace(/\s+/g, ' ').trim();
    if (descriptionIndex.has(normalised)) {
      err(name, 'desc.unique', `description collides with ${descriptionIndex.get(normalised)}`);
    } else {
      descriptionIndex.set(normalised, name);
    }
  }

  // ─── Negative-constraint coverage ──────────────────────────────────────
  // Templates that are themselves aliases are detected by the "Alias:" marker
  // at the top of the file and are exempt.
  const realTemplates = templates.filter((t) => {
    const c = fs.readFileSync(t, 'utf8');
    return !ALIAS_MARKER_RE.test(c);
  });

  if (realTemplates.length > 0) {
    for (const tpl of realTemplates) {
      const tplContent = fs.readFileSync(tpl, 'utf8');
      // Allow the block to appear either above the frontmatter or between
      // the frontmatter and the first heading.
      const hasBlock = /<!--[\s\S]*?(DRAFTING AIDE|DO NOT INCLUDE)[\s\S]*?-->/m.test(tplContent);
      if (!hasBlock) {
        err(
          name,
          'neg.template',
          `template ${path.relative(dir, tpl)} is missing a DRAFTING AIDE / DO NOT INCLUDE block`,
        );
      }
    }
  } else if (!isAlias) {
    // No templates → SKILL.md must carry the negative-constraints section
    if (!/^## Negative constraints\s*$/m.test(body)) {
      err(
        name,
        'neg.skill',
        'skill has no template*.md — SKILL.md must include a `## Negative constraints` section',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Profile validation (runs when no skill filter is active)
// ---------------------------------------------------------------------------

if (skillFilter.length === 0) {
  const stageBySkillName = new Map(skills.map(({ name, fm }) => [name, fm.stage ?? 'unknown']));
  validateProfiles(packageDir, stageBySkillName, findings);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const errors = findings.filter((f) => f.severity === 'error');
const summary = {
  skillsLinted: skills.length,
  errors: errors.length,
  findings,
};

if (jsonOutput) {
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
} else {
  const grouped = new Map();
  for (const f of findings) {
    if (!grouped.has(f.skill)) grouped.set(f.skill, []);
    grouped.get(f.skill).push(f);
  }

  console.log(`lint-skills: linted ${skills.length} skill(s)`);
  if (errors.length === 0) {
    console.log('lint-skills: all checks pass');
  } else {
    for (const [skill, fs] of grouped) {
      console.log(`\n  ${skill}`);
      for (const f of fs) console.log(`    ✗ [${f.rule}] ${f.message}`);
    }
    console.log(`\nlint-skills: ${errors.length} error(s)`);
  }
}

process.exit(errors.length > 0 ? 1 : 0);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function err(skill, rule, message) {
  findings.push({ skill, severity: 'error', rule, message });
}

function splitFrontmatter(src) {
  if (!src.startsWith('---\n')) return { frontmatter: '', body: src };
  const end = src.indexOf('\n---', 4);
  if (end === -1) return { frontmatter: '', body: src };
  return {
    frontmatter: src.slice(4, end),
    body: src.slice(end + 4).replace(/^\n/, ''),
  };
}

/**
 * Minimal YAML parser sufficient for our SKILL.md frontmatter.
 *
 * Supports:
 *   - scalar keys:           key: value
 *   - folded scalar:         key: >
 *                              multi
 *                              line
 *   - sequence of scalars:   key:
 *                              - item
 *                              - item
 *   - quoted strings:        key: 'value'
 *
 * Does not support nested maps (we do not use them).
 */
function parseFrontmatter(src) {
  const out = {};
  const lines = src.split('\n');
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith('#')) {
      i++;
      continue;
    }

    // Only handle top-level keys (no leading spaces)
    if (raw.startsWith(' ') || raw.startsWith('\t')) {
      i++;
      continue;
    }

    const match = raw.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      i++;
      continue;
    }

    const key = match[1];
    const inline = match[2];

    if (inline === '' || inline === '|' || inline === '>' || inline === '>-' || inline === '|-') {
      // Block scalar or list continues on following indented lines
      const block = [];
      const isList = inline === '' && lines[i + 1]?.match(/^\s+-\s+/);
      i++;

      if (isList) {
        const items = [];
        while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
          items.push(
            lines[i]
              .replace(/^\s+-\s+/, '')
              .trim()
              .replace(/^['"]|['"]$/g, ''),
          );
          i++;
        }
        out[key] = items;
        continue;
      }

      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
        if (lines[i].trim()) block.push(lines[i].trim());
        i++;
      }
      out[key] = block.join(' ').trim();
      continue;
    }

    // Inline empty list
    if (inline === '[]') {
      out[key] = [];
      i++;
      continue;
    }

    // Inline scalar — strip quotes if present
    out[key] = inline.trim().replace(/^['"]|['"]$/g, '');
    i++;
  }

  return out;
}

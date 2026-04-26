#!/usr/bin/env node
/**
 * generate-views
 *
 * Walks all SKILL.md files in this package, reads their frontmatter, and
 * writes three role-filtered Markdown tables:
 *
 *   packages/skills/views/pm.md        — role includes "pm" or "founder"
 *   packages/skills/views/architect.md — role includes "architect"
 *   packages/skills/views/engineer.md  — role includes "engineer"
 *
 * Exit codes:
 *   0 — all committed view files are already up to date
 *   1 — one or more view files were stale and have been updated (commit the diff)
 *
 * Usage:
 *   node bin/generate-views.js
 *   pnpm --filter '@daddia/skills' run generate:views
 *
 * In CI this script is run as a check step. A non-zero exit means the
 * committed views/ files are out of date — the developer must run the
 * script locally, commit the result, and push again.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------

/**
 * Each role view has a display title and one or more role values it matches.
 * The "pm" view aggregates both "pm" and "founder" role values.
 */
export const ROLE_VIEWS = [
  { file: 'pm.md', title: 'PM & Founder', matches: ['pm', 'founder'] },
  { file: 'architect.md', title: 'Architect', matches: ['architect'] },
  { file: 'engineer.md', title: 'Engineer', matches: ['engineer'] },
];

// ---------------------------------------------------------------------------
// Exported core logic (used by tests)
// ---------------------------------------------------------------------------

/**
 * Build the full content of a role view Markdown file.
 *
 * @param {string}   roleTitle  Display title used in the file heading
 * @param {{ name: string, fm: Record<string, unknown> }[]} skills  Pre-filtered skills
 * @returns {string} Complete file content (no trailing newline)
 */
export function buildRoleView(roleTitle, skills) {
  const header = [
    `# Skills \u2014 ${roleTitle}`,
    '',
    'Generated from `packages/skills/*/SKILL.md` frontmatter. Run',
    '`pnpm generate:views` to refresh.',
    '',
    '| Skill | What it does | Artefact | Phase | Consumes | Produces |',
    '| --- | --- | --- | --- | --- | --- |',
  ].join('\n');

  const rows = skills.map(({ name, fm }) => {
    const desc = typeof fm.description === 'string' ? fm.description : '';
    const excerpt = desc.length > 120 ? desc.slice(0, 120).replace(/\s+\S*$/, '') + '...' : desc;
    const artefact = fm.artefact ?? '\u2014';
    const phase = fm.phase ?? '\u2014';
    const consumes =
      Array.isArray(fm.consumes) && fm.consumes.length > 0 ? fm.consumes.join(', ') : '\u2014';
    const produces =
      Array.isArray(fm.produces) && fm.produces.length > 0 ? fm.produces.join(', ') : '\u2014';
    return `| ${name} | ${excerpt} | ${artefact} | ${phase} | ${consumes} | ${produces} |`;
  });

  return [header, ...rows].join('\n');
}

/**
 * Return whether a skill's role array matches a given set of role values.
 *
 * @param {unknown}  role        fm.role value (string, array, or absent)
 * @param {string[]} matchValues Role strings to check for (case-sensitive)
 * @returns {boolean}
 */
export function roleMatches(role, matchValues) {
  if (!role) return false;
  const roles = Array.isArray(role) ? role : [role];
  return matchValues.some((m) => roles.includes(m));
}

/**
 * Walk the package directory, filter skills by role, and write the three
 * view files into packages/skills/views/. Creates the views/ directory if
 * it does not exist.
 *
 * @param {string} packageDir  Absolute path to the @daddia/skills package root
 * @returns {{ changed: boolean, counts: Record<string, number> }}
 *   changed — true if any view file was updated
 *   counts  — number of rows written per view file (keyed by filename)
 */
export function generateViews(packageDir) {
  const skillDirs = fs
    .readdirSync(packageDir)
    .filter((entry) => {
      if (entry === 'bin' || entry === 'views' || entry.startsWith('.')) return false;
      const fullPath = path.join(packageDir, entry);
      return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'SKILL.md'));
    })
    .sort();

  const allSkills = skillDirs
    .map((name) => {
      const content = fs.readFileSync(path.join(packageDir, name, 'SKILL.md'), 'utf8');
      const { frontmatter } = splitFrontmatter(content);
      const fm = parseFrontmatter(frontmatter);
      return { name, fm };
    })
    .filter(({ fm }) => fm.stage !== 'deprecated');

  // Warn about stable skills that fall through all role views — they would be
  // invisible to role-based filtering and likely have an incorrect role value.
  const coveredSkills = new Set();
  for (const { matches } of ROLE_VIEWS) {
    for (const skill of allSkills) {
      if (roleMatches(skill.fm.role, matches)) coveredSkills.add(skill.name);
    }
  }
  for (const { name } of allSkills) {
    if (!coveredSkills.has(name)) {
      process.stderr.write(
        `generate-views: warning — "${name}" has no recognized role value and is absent from all views\n`,
      );
    }
  }

  const viewsDir = path.join(packageDir, 'views');
  fs.mkdirSync(viewsDir, { recursive: true });

  let anyChanged = false;
  const counts = {};

  for (const { file, title, matches } of ROLE_VIEWS) {
    const filtered = allSkills.filter(({ fm }) => roleMatches(fm.role, matches));
    const newContent = buildRoleView(title, filtered);
    const filePath = path.join(viewsDir, file);

    const currentContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;

    if (currentContent !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      anyChanged = true;
    }

    counts[file] = filtered.length;
  }

  return { changed: anyChanged, counts };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packageDir = path.resolve(fileURLToPath(import.meta.url), '..', '..');

  let result;
  try {
    result = generateViews(packageDir);
  } catch (err) {
    process.stderr.write(`generate-views: error — ${err.message}\n`);
    process.exit(1);
  }

  const { changed, counts } = result;
  const summary = Object.entries(counts)
    .map(([f, n]) => `${f}: ${n} skills`)
    .join(', ');
  process.stdout.write(`generate-views: views/ (${summary})\n`);

  if (changed) {
    process.stderr.write('generate-views: output was stale — commit the updated views/ files\n');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Helpers (inlined from lint-skills.js pattern — bin scripts are self-contained)
// ---------------------------------------------------------------------------

function splitFrontmatter(src) {
  if (!src.startsWith('---\n')) return { frontmatter: '', body: src };
  const end = src.indexOf('\n---', 4);
  if (end === -1) return { frontmatter: '', body: src };
  return {
    frontmatter: src.slice(4, end),
    body: src.slice(end + 4).replace(/^\n/, ''),
  };
}

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

    if (inline === '[]') {
      out[key] = [];
      i++;
      continue;
    }

    out[key] = inline.trim().replace(/^['"]|['"]$/g, '');
    i++;
  }

  return out;
}

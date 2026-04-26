#!/usr/bin/env node
/**
 * generate-index
 *
 * Walks all SKILL.md files in this package, reads their frontmatter, and
 * writes a generated index table into space-index/SKILL.md between the
 * sentinel comment markers.
 *
 * Exit codes:
 *   0 — committed output is already up to date (no changes made)
 *   1 — committed output was stale; file has been updated (commit the diff)
 *
 * Usage:
 *   node bin/generate-index.js
 *   pnpm --filter '@daddia/skills' run generate:index
 *
 * In CI this script is run as a check step. A non-zero exit means the
 * committed space-index/SKILL.md is out of date — the developer must run
 * the script locally, commit the result, and push again.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Exported core logic (used by tests)
// ---------------------------------------------------------------------------

/**
 * Build the Markdown table rows from a list of skills.
 *
 * @param {{ name: string, fm: Record<string, unknown> }[]} skills
 * @returns {string} Markdown table (header + separator + rows), no trailing newline
 */
export function buildIndexTable(skills) {
  const header =
    '| Skill | Description (excerpt) | Artefact | Phase | Role | Consumes | Produces |';
  const sep = '| --- | --- | --- | --- | --- | --- | --- |';

  const rows = skills.map(({ name, fm }) => {
    const desc = typeof fm.description === 'string' ? fm.description : '';
    const excerpt = desc.length > 120 ? desc.slice(0, 120).replace(/\s+\S*$/, '') + '...' : desc;
    const artefact = fm.artefact ?? '—';
    const phase = fm.phase ?? '—';
    const role = Array.isArray(fm.role) ? fm.role.join(', ') : (fm.role ?? '—');
    const consumes =
      Array.isArray(fm.consumes) && fm.consumes.length > 0 ? fm.consumes.join(', ') : '—';
    const produces =
      Array.isArray(fm.produces) && fm.produces.length > 0 ? fm.produces.join(', ') : '—';
    return `| ${name} | ${excerpt} | ${artefact} | ${phase} | ${role} | ${consumes} | ${produces} |`;
  });

  return [header, sep, ...rows].join('\n');
}

/**
 * Replace the content between the BEGIN/END GENERATED sentinels in a
 * SKILL.md file string with the provided table string.
 *
 * @param {string} fileContent  Full content of space-index/SKILL.md
 * @param {string} newTable     Output of buildIndexTable()
 * @returns {string} Updated file content
 * @throws {Error} If either sentinel is missing
 */
export function replaceGeneratedSection(fileContent, newTable) {
  const BEGIN = '<!-- BEGIN GENERATED';
  const END = '<!-- END GENERATED -->';

  const beginIdx = fileContent.indexOf(BEGIN);
  if (beginIdx === -1) {
    throw new Error('space-index/SKILL.md is missing the <!-- BEGIN GENERATED --> sentinel');
  }

  const endIdx = fileContent.indexOf(END);
  if (endIdx === -1) {
    throw new Error('space-index/SKILL.md is missing the <!-- END GENERATED --> sentinel');
  }

  const beginLineEnd = fileContent.indexOf('\n', beginIdx);
  if (beginLineEnd === -1) {
    throw new Error('<!-- BEGIN GENERATED --> sentinel has no trailing newline');
  }

  const before = fileContent.slice(0, beginLineEnd + 1);
  const after = fileContent.slice(endIdx);

  return before + newTable + '\n' + after;
}

/**
 * Walk the package directory, read skill frontmatter, generate the index
 * table, and write it into space-index/SKILL.md if the content has changed.
 *
 * @param {string} packageDir  Absolute path to the @daddia/skills package root
 * @returns {{ changed: boolean, skillCount: number }}
 */
export function generateIndex(packageDir) {
  const skillDirs = fs
    .readdirSync(packageDir)
    .filter((entry) => {
      if (entry === 'bin' || entry.startsWith('.')) return false;
      const fullPath = path.join(packageDir, entry);
      return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'SKILL.md'));
    })
    .sort();

  const skills = skillDirs
    .map((name) => {
      const content = fs.readFileSync(path.join(packageDir, name, 'SKILL.md'), 'utf8');
      const { frontmatter } = splitFrontmatter(content);
      const fm = parseFrontmatter(frontmatter);
      return { name, fm };
    })
    .filter(({ fm }) => fm.stage !== 'deprecated');

  const newTable = buildIndexTable(skills);

  const targetPath = path.join(packageDir, 'space-index', 'SKILL.md');
  const currentContent = fs.readFileSync(targetPath, 'utf8');
  const newContent = replaceGeneratedSection(currentContent, newTable);

  const changed = newContent !== currentContent;
  if (changed) {
    fs.writeFileSync(targetPath, newContent, 'utf8');
  }

  return { changed, skillCount: skills.length };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packageDir = path.resolve(fileURLToPath(import.meta.url), '..', '..');

  let result;
  try {
    result = generateIndex(packageDir);
  } catch (err) {
    process.stderr.write(`generate-index: error — ${err.message}\n`);
    process.exit(1);
  }

  const { changed, skillCount } = result;
  const linesNote = changed ? 'updated' : 'already up to date';
  process.stdout.write(
    `generate-index: space-index/SKILL.md (${skillCount} skills, ${linesNote})\n`,
  );

  if (changed) {
    process.stderr.write(
      'generate-index: output was stale — commit the updated space-index/SKILL.md\n',
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Helpers (shared with lint-skills.js logic, inlined to keep bin self-contained)
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

/**
 * Minimal YAML parser sufficient for SKILL.md frontmatter.
 * Mirrors the implementation in lint-skills.js.
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

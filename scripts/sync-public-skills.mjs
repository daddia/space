#!/usr/bin/env node
/**
 * sync-public-skills.mjs
 *
 * One-way mirror from `packages/skills/<skill>/` to the public daddia/skills
 * repository. The source of truth is `@daddia/skills` in this monorepo;
 * `github.com/daddia/skills` is a derived artefact for public distribution.
 *
 * The source SKILL.md frontmatter is rich (track, role, stage, consumes,
 * produces, version, etc.) because daddia tooling and the Crew runtime read
 * those fields. The public artefact is stripped to the open agent skills
 * spec subset so it stays minimal and ecosystem-portable. See PUBLIC_KEYS
 * below for the kept allow-list.
 *
 * What ships per skill:
 *   - SKILL.md (frontmatter stripped to PUBLIC_KEYS; body unchanged)
 *   - template*.md (any file matching the pattern)
 *   - examples/ (entire directory if present)
 *   - scripts/ (entire directory if present)
 *
 * What's excluded:
 *   - Any skill not listed in profiles/full.yaml (deferred / deprecated / aliases)
 *   - Tooling directories: bin/, profiles/, views/
 *   - Package metadata: package.json, AGENTS.md, CHANGELOG.md
 *   - Target-owned files: README.md, LICENSE, .git/, .github/ (preserved verbatim)
 *
 * Usage:
 *   node scripts/sync-public-skills.mjs                # default target: ../skills
 *   node scripts/sync-public-skills.mjs --target /abs/path/to/skills
 *   node scripts/sync-public-skills.mjs --dry-run      # preview without writes
 */

/**
 * Frontmatter keys preserved in the public SKILL.md. Anything else is dropped.
 *
 * Rationale per key:
 *   - name              required by the open agent skills spec
 *   - description       required; the only field used by the router
 *   - allowed-tools     open spec; restricts which tools an agent may invoke
 *   - argument-hint     Cursor convention; harmless and useful when present
 *   - license           open spec; informative when present
 *
 * Daddia-specific keys (track, role, stage, consumes, produces, version,
 * owner, tags, prerequisites, related, when_to_use, artefact, domain,
 * also-relevant-to-tracks, also-relevant-to-roles) are intentionally
 * dropped. They serve daddia's authoring tooling, views, and routing
 * evaluator -- they are noise to external consumers.
 */
const PUBLIC_KEYS = new Set(['name', 'description', 'allowed-tools', 'argument-hint', 'license']);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetIdx = args.indexOf('--target');
const targetOverride = targetIdx >= 0 ? args[targetIdx + 1] : null;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const sourceDir = path.join(repoRoot, 'packages', 'skills');
const profilePath = path.join(sourceDir, 'profiles', 'full.yaml');
const targetDir = targetOverride
  ? path.resolve(targetOverride)
  : path.resolve(repoRoot, '..', 'skills');

if (!fs.existsSync(sourceDir)) {
  fail(`Source not found: ${sourceDir}`);
}
if (!fs.existsSync(profilePath)) {
  fail(`Profile not found: ${profilePath}`);
}
if (!fs.existsSync(targetDir)) {
  fail(`Target not found: ${targetDir}\nCreate it first or pass --target.`);
}

// ---------------------------------------------------------------------------
// Stable skill set (from full.yaml)
// ---------------------------------------------------------------------------

const stableSkills = readStableSkillNames(profilePath);
if (stableSkills.length === 0) {
  fail(`Profile parsed but contained no skills: ${profilePath}`);
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

const plan = {
  copy: [],
  removeStale: [],
  missingSource: [],
};

for (const name of stableSkills) {
  const src = path.join(sourceDir, name);
  if (!fs.existsSync(path.join(src, 'SKILL.md'))) {
    plan.missingSource.push(name);
    continue;
  }
  plan.copy.push({ name, src });
}

for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  if (entry.name.startsWith('.')) continue; // .git, .github, etc.
  const candidate = path.join(targetDir, entry.name);
  if (!fs.existsSync(path.join(candidate, 'SKILL.md'))) continue;
  if (!stableSkills.includes(entry.name)) {
    plan.removeStale.push(entry.name);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`Source:  ${path.relative(process.cwd(), sourceDir)}`);
console.log(`Target:  ${path.relative(process.cwd(), targetDir)}`);
console.log(`Profile: ${path.basename(profilePath)} (${stableSkills.length} skills)`);
console.log('');

if (plan.missingSource.length > 0) {
  console.warn(`! ${plan.missingSource.length} skills listed in profile but missing in source:`);
  for (const name of plan.missingSource) console.warn(`    - ${name}`);
  console.warn('');
}

console.log(`Will copy:  ${plan.copy.length} skills`);
for (const { name } of plan.copy) console.log(`    + ${name}`);
console.log('');

if (plan.removeStale.length > 0) {
  console.log(`Will remove (no longer in profile): ${plan.removeStale.length} skills`);
  for (const name of plan.removeStale) console.log(`    - ${name}`);
  console.log('');
}

if (dryRun) {
  console.log('[dry-run] no changes written');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

let copiedFiles = 0;

for (const stale of plan.removeStale) {
  fs.rmSync(path.join(targetDir, stale), { recursive: true, force: true });
}

for (const { name, src } of plan.copy) {
  const dst = path.join(targetDir, name);

  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });

  copiedFiles += copySkillFiles(src, dst);
}

console.log(`Done. ${plan.copy.length} skills synced (${copiedFiles} files written).`);
if (plan.removeStale.length > 0) {
  console.log(`Removed ${plan.removeStale.length} stale skill directories.`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function copySkillFiles(src, dst) {
  let count = 0;

  // Top-level files: SKILL.md (frontmatter stripped) and template*.md (verbatim)
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.isFile()) {
      if (entry.name === 'SKILL.md') {
        const raw = fs.readFileSync(path.join(src, entry.name), 'utf-8');
        const stripped = stripFrontmatter(raw, PUBLIC_KEYS);
        fs.writeFileSync(path.join(dst, entry.name), stripped, 'utf-8');
        count++;
      } else if (/^template.*\.md$/.test(entry.name)) {
        fs.copyFileSync(path.join(src, entry.name), path.join(dst, entry.name));
        count++;
      }
      continue;
    }

    if (!entry.isDirectory()) continue;

    // Bundled subdirectories: examples/, scripts/, references/, assets/
    if (['examples', 'scripts', 'references', 'assets'].includes(entry.name)) {
      const subSrc = path.join(src, entry.name);
      const subDst = path.join(dst, entry.name);
      count += copyDirRecursive(subSrc, subDst);
    }
  }

  return count;
}

/**
 * Strip a SKILL.md's YAML frontmatter to the keys in `allowedKeys`.
 *
 * Splits the frontmatter into top-level blocks using a column-0 key scan
 * (same pattern as space/packages/create-space/src/template.ts), filters
 * to allowed keys, and reassembles. Avoids a YAML library dependency.
 *
 * Files without frontmatter are returned unchanged.
 */
function stripFrontmatter(content, allowedKeys) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return content;

  const fmRaw = match[1];
  const body = content.slice(match[0].length);

  const blocks = [];
  let current = null;
  for (const line of fmRaw.split('\n')) {
    const keyMatch = /^([a-zA-Z_][\w-]*)\s*:/.exec(line);
    if (keyMatch) {
      if (current) blocks.push(current);
      current = { key: keyMatch[1], lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
    // Lines before the first key (e.g. comments) are dropped.
  }
  if (current) blocks.push(current);

  const kept = blocks.filter((b) => allowedKeys.has(b.key));
  const newFm = kept.map((b) => b.lines.join('\n').replace(/\s+$/, '')).join('\n');

  return `---\n${newFm}\n---\n${body}`;
}

function copyDirRecursive(src, dst) {
  let count = 0;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      count += copyDirRecursive(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
      count++;
    }
  }
  return count;
}

/**
 * Read skill names from a profile file. The profile YAML is intentionally
 * simple: a top-level `skills:` list of dash-prefixed kebab-case names.
 * Parsing inline avoids a runtime YAML dependency for this script.
 */
function readStableSkillNames(file) {
  const raw = fs.readFileSync(file, 'utf-8');
  const lines = raw.split('\n');
  const names = [];
  let inSkillsList = false;
  for (const line of lines) {
    if (/^skills\s*:/.test(line)) {
      inSkillsList = true;
      continue;
    }
    if (!inSkillsList) continue;
    if (/^\S/.test(line)) {
      // Top-level key starting after the skills list ends iteration.
      inSkillsList = false;
      continue;
    }
    const match = line.match(/^\s*-\s*([a-z0-9][a-z0-9-]*)\s*$/);
    if (match) names.push(match[1]);
  }
  return names;
}

function fail(msg) {
  console.error(`sync-public-skills: ${msg}`);
  process.exit(1);
}

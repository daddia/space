#!/usr/bin/env node
/**
 * generate CLI
 *
 * Replaces bin/generate-index.js and bin/generate-views.js.
 *
 * Subcommands:
 *   generate index   — regenerate space-index/SKILL.md
 *   generate views   — regenerate views/*.md
 *
 * When called without a subcommand, both are run in sequence.
 *
 * Exit codes:
 *   0 — all committed outputs are already up to date
 *   1 — one or more files were stale and have been updated (commit the diff)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadAllSkills, loadSkill } from '../skill.js';
import { generateSpaceIndexSkill } from '../generate/space-index-skill.js';
import { generateViews, ROLE_VIEWS } from '../generate/views.js';

const packageDir = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const skillsDir = path.join(packageDir, 'skills');

/**
 * Load all skills for the index generator. This includes the `space-index`
 * skill itself (so it appears in the routing table), which `loadAllSkills`
 * intentionally excludes to avoid circular loading during profile resolution.
 *
 * Skills are read from `packages/skills/skills/` (Vercel pattern); the
 * `space-index` output directory remains at `packages/skills/space-index/`.
 */
function loadAllSkillsForIndex(pkgDir: string) {
  const skills = loadAllSkills(path.join(pkgDir, 'skills'));
  const spaceIndexDir = path.join(pkgDir, 'space-index');
  if (fs.existsSync(path.join(spaceIndexDir, 'SKILL.md'))) {
    try {
      skills.push(loadSkill(spaceIndexDir));
    } catch {
      // space-index SKILL.md unreadable — skip silently
    }
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

const args = process.argv.slice(2);
const subcommand = args[0]; // 'index' | 'views' | undefined

const runIndex = !subcommand || subcommand === 'index';
const runViews = !subcommand || subcommand === 'views';

if (subcommand && subcommand !== 'index' && subcommand !== 'views') {
  process.stderr.write(`generate: unknown subcommand "${subcommand}". Use "index" or "views".\n`);
  process.exit(1);
}

let anyChanged = false;

// ─── Generate index ──────────────────────────────────────────────────────────

if (runIndex) {
  const targetPath = path.join(packageDir, 'space-index', 'SKILL.md');

  let skills;
  try {
    skills = loadAllSkillsForIndex(packageDir);
  } catch (err) {
    process.stderr.write(`generate index: error loading skills — ${(err as Error).message}\n`);
    process.exit(1);
  }

  const currentContent = fs.readFileSync(targetPath, 'utf8');
  let newContent: string;
  try {
    newContent = generateSpaceIndexSkill(currentContent, skills);
  } catch (err) {
    process.stderr.write(`generate index: error — ${(err as Error).message}\n`);
    process.exit(1);
  }

  const changed = newContent !== currentContent;
  if (changed) {
    fs.writeFileSync(targetPath, newContent, 'utf8');
    anyChanged = true;
  }

  const linesNote = changed ? 'updated' : 'already up to date';
  process.stdout.write(`generate index: space-index/SKILL.md (${skills.length} skills, ${linesNote})\n`);
  if (changed) {
    process.stderr.write('generate index: output was stale — commit the updated space-index/SKILL.md\n');
  }
}

// ─── Generate views ──────────────────────────────────────────────────────────

if (runViews) {
  let skills;
  try {
    skills = loadAllSkills(skillsDir);
  } catch (err) {
    process.stderr.write(`generate views: error loading skills — ${(err as Error).message}\n`);
    process.exit(1);
  }

  // Warn about stable skills absent from all role views
  const coveredNames = new Set<string>();
  for (const view of ROLE_VIEWS) {
    for (const skill of skills) {
      const role = skill.frontmatter.role;
      if (!role) continue;
      const roles = Array.isArray(role) ? (role as string[]) : [role as string];
      if (view.matches.some((m) => roles.includes(m))) coveredNames.add(skill.name);
    }
  }
  for (const skill of skills) {
    if (skill.frontmatter.stage !== 'deprecated' && !coveredNames.has(skill.name)) {
      process.stderr.write(
        `generate views: warning — "${skill.name}" has no recognized role value and is absent from all views\n`,
      );
    }
  }

  const viewsDir = path.join(packageDir, 'views');
  fs.mkdirSync(viewsDir, { recursive: true });

  const viewContents = generateViews(skills);
  const counts: Record<string, number> = {};

  for (const view of ROLE_VIEWS) {
    const newContent = viewContents[view.file]!;
    const filePath = path.join(viewsDir, view.file);
    const currentContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;

    if (currentContent !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      anyChanged = true;
    }

    const stable = skills.filter((s) => s.frontmatter.stage !== 'deprecated');
    const roleMatches = (role: unknown, matches: string[]): boolean => {
      if (!role) return false;
      const roles = Array.isArray(role) ? (role as string[]) : [role as string];
      return matches.some((m) => roles.includes(m));
    };
    counts[view.file] = stable.filter((s) => roleMatches(s.frontmatter.role, view.matches)).length;
  }

  const summary = ROLE_VIEWS.map(({ file }) => `${file}: ${counts[file]} skills`).join(', ');
  process.stdout.write(`generate views: views/ (${summary})\n`);
  if (anyChanged && runViews) {
    process.stderr.write('generate views: output was stale — commit the updated views/ files\n');
  }
}

process.exit(anyChanged ? 1 : 0);

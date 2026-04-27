#!/usr/bin/env node
/**
 * validate-public CLI
 *
 * Composite CI gate: runs all quality checks required before publishing
 * skills to the public daddia/skills mirror.
 *
 * Steps (all run regardless of earlier failures):
 *   1. Lint -- full typed lint engine against all skills
 *   2. Generate no-drift -- asserts space-index/SKILL.md and views/*.md
 *      match what the generators would produce (no uncommitted stale output)
 *   3. public-strip -- every stable skill's SKILL.md strips to a valid
 *      public SKILL.md with name + description preserved, body unchanged
 *   4. bundled-assets -- every markdown link to template-*.md or examples/
 *      in a skill body resolves to a file that exists on disk
 *   5. public-body-references -- no stable skill body links to a file that
 *      the public-asset policy would not ship (no broken refs after publish)
 *
 * Exit codes:
 *   0 -- all checks pass; safe to publish
 *   1 -- one or more checks failed; diagnostics printed to stdout
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadAllSkills, loadSkill } from '../skill.js';
import { lintSkills } from '../lint/index.js';
import { publicStrip } from '../lint/public-strip.js';
import { bundledAssets } from '../lint/bundled-assets.js';
import { publicBodyReferences } from '../lint/public-body-references.js';
import { generateSpaceIndexSkill } from '../generate/space-index-skill.js';
import { generateViews, ROLE_VIEWS } from '../generate/views.js';
import type { Diagnostic } from '../lint/types.js';

const packageDir = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');

let skills;
try {
  skills = loadAllSkills(packageDir);
} catch (err) {
  process.stderr.write(`validate-public: error loading skills — ${(err as Error).message}\n`);
  process.exit(1);
}

if (skills.length === 0) {
  process.stderr.write('validate-public: no skills found\n');
  process.exit(1);
}

const allDiagnostics: Diagnostic[] = [];

// ─── Step 1: full lint engine ────────────────────────────────────────────────

const lintDiags = lintSkills(skills);
allDiagnostics.push(...lintDiags);

// ─── Step 2: generate no-drift ───────────────────────────────────────────────

const driftDiags = checkGenerateDrift(packageDir, skills);
allDiagnostics.push(...driftDiags);

// ─── Steps 3-5: publish validators ──────────────────────────────────────────

for (const skill of skills) {
  allDiagnostics.push(...publicStrip(skill, skills));
  allDiagnostics.push(...bundledAssets(skill, skills));
  allDiagnostics.push(...publicBodyReferences(skill, skills));
}

// ─── Report ──────────────────────────────────────────────────────────────────

const errors = allDiagnostics.filter((d) => d.severity === 'error');

if (jsonOutput) {
  const summary = {
    skillsChecked: skills.length,
    errors: errors.length,
    findings: allDiagnostics,
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
} else {
  process.stdout.write(`validate-public: checked ${skills.length} skill(s)\n`);

  if (allDiagnostics.length === 0) {
    process.stdout.write('validate-public: all checks pass\n');
  } else {
    const grouped = new Map<string, Diagnostic[]>();
    for (const d of allDiagnostics) {
      if (!grouped.has(d.skill)) grouped.set(d.skill, []);
      grouped.get(d.skill)!.push(d);
    }
    for (const [skillName, items] of grouped) {
      process.stdout.write(`\n  ${skillName}\n`);
      for (const d of items) {
        const icon = d.severity === 'error' ? '\u2717' : '\u26a0';
        process.stdout.write(`    ${icon} [${d.rule}] ${d.message}\n`);
      }
    }
    process.stdout.write(`\nvalidate-public: ${errors.length} error(s)\n`);
  }
}

process.exit(errors.length > 0 ? 1 : 0);

// ─── Generate drift check ────────────────────────────────────────────────────

/**
 * Load all skills plus the `space-index` skill itself, mirroring what the
 * `generate index` command does. `space-index` is excluded from
 * `loadAllSkills` to avoid circular loading, but must be included when
 * generating or verifying the routing table.
 */
function loadAllSkillsForIndex(pkgDir: string): ReturnType<typeof loadAllSkills> {
  const skills = loadAllSkills(pkgDir);
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

function checkGenerateDrift(
  pkgDir: string,
  loadedSkills: ReturnType<typeof loadAllSkills>,
): Diagnostic[] {
  const diags: Diagnostic[] = [];

  // Check space-index/SKILL.md drift
  // Use the extended skill set that includes space-index itself (matching
  // what the generate:index command produces).
  const skillsForIndex = loadAllSkillsForIndex(pkgDir);
  const indexPath = path.join(pkgDir, 'space-index', 'SKILL.md');
  if (fs.existsSync(indexPath)) {
    const currentIndex = fs.readFileSync(indexPath, 'utf8');
    let generatedIndex: string;
    try {
      generatedIndex = generateSpaceIndexSkill(currentIndex, skillsForIndex);
    } catch (err) {
      diags.push({
        rule: 'generate-no-drift',
        severity: 'error',
        skill: 'space-index/SKILL.md',
        message: `generate index failed: ${(err as Error).message}`,
      });
      generatedIndex = currentIndex;
    }
    if (generatedIndex !== currentIndex) {
      diags.push({
        rule: 'generate-no-drift',
        severity: 'error',
        skill: 'space-index/SKILL.md',
        message: 'space-index/SKILL.md is stale — regenerate and commit before publishing',
        hint: 'Run pnpm generate:index and commit the result.',
      });
    }
  } else {
    diags.push({
      rule: 'generate-no-drift',
      severity: 'error',
      skill: 'space-index/SKILL.md',
      message: 'space-index/SKILL.md does not exist',
      hint: 'Run pnpm generate:index to create it.',
    });
  }

  // Check views/*.md drift
  let viewContents: Record<string, string>;
  try {
    viewContents = generateViews(loadedSkills);
  } catch (err) {
    diags.push({
      rule: 'generate-no-drift',
      severity: 'error',
      skill: 'views/',
      message: `generate views failed: ${(err as Error).message}`,
    });
    return diags;
  }

  const viewsDir = path.join(pkgDir, 'views');
  for (const view of ROLE_VIEWS) {
    const viewPath = path.join(viewsDir, view.file);
    const currentView = fs.existsSync(viewPath) ? fs.readFileSync(viewPath, 'utf8') : null;
    if (currentView !== viewContents[view.file]) {
      diags.push({
        rule: 'generate-no-drift',
        severity: 'error',
        skill: `views/${view.file}`,
        message: `views/${view.file} is stale — regenerate and commit before publishing`,
        hint: 'Run pnpm generate:views and commit the result.',
      });
    }
  }

  return diags;
}

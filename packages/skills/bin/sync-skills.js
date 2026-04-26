#!/usr/bin/env node
/**
 * sync-skills
 *
 * Run automatically on `pnpm add -D @tpw/skills` (via the package's own
 * postinstall) and on every subsequent `pnpm install` (via the consumer's
 * postinstall script, which this script adds on first run).
 *
 * What it does:
 *   1. Copies skills from @tpw/skills (and any extra configured sources) into
 *      a local `skills/` directory tracked in git. Project-local skills are
 *      never touched.
 *   2. Adds `"postinstall": "sync-skills"` to the consumer's package.json if
 *      it is not already present (chains with && if a script already exists).
 *   3. Creates `.cursor/skills` and `.claude/skills` symlinks when the IDE
 *      directory exists and the link is not already present.
 *
 * Usage:
 *   automatic: fires as postinstall of @tpw/skills and of the consumer repo
 *   manual:    pnpm exec sync-skills
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Project root resolution
// ---------------------------------------------------------------------------

// INIT_CWD is set by npm/pnpm/yarn to the directory where install was invoked.
// Fall back to process.cwd() for manual invocations.
const projectRoot = process.env.INIT_CWD ?? process.cwd();

// ---------------------------------------------------------------------------
// Consumer config (from their package.json "skills" field)
// ---------------------------------------------------------------------------

const consumerPkgPath = path.join(projectRoot, 'package.json');
const consumerConfig = fs.existsSync(consumerPkgPath)
  ? (JSON.parse(fs.readFileSync(consumerPkgPath, 'utf8')).skills ?? {})
  : {};

const destDir = path.join(projectRoot, consumerConfig.dest ?? 'skills');
const exclude = new Set(consumerConfig.exclude ?? []);
const manifestPath = path.join(destDir, '.sources.json');

// ---------------------------------------------------------------------------
// Skill filter (written by `space sync skills --profile X` when active)
// ---------------------------------------------------------------------------

const filterPath = path.join(projectRoot, '.space', '.skill-filter.json');
const skillFilter = fs.existsSync(filterPath)
  ? new Set(JSON.parse(fs.readFileSync(filterPath, 'utf8')).skills ?? [])
  : null; // null means "no filter; copy all skills"

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

// This package is always the primary source.
const thisPackageDir = path.resolve(fileURLToPath(import.meta.url), '..', '..');

const sources = [{ name: '@tpw/skills', dir: thisPackageDir }];

for (const sourceName of consumerConfig.sources ?? []) {
  if (sourceName === '@tpw/skills') continue; // already added
  sources.push({
    name: sourceName,
    dir: path.join(projectRoot, 'node_modules', sourceName),
  });
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

fs.mkdirSync(destDir, { recursive: true });

const priorManifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {};

const newManifest = {};

for (const { name: sourceName, dir: sourceDir } of sources) {
  if (!fs.existsSync(sourceDir)) {
    console.warn(`sync-skills: ${sourceName} not found, keeping prior copy in git`);
    if (priorManifest[sourceName]) newManifest[sourceName] = priorManifest[sourceName];
    continue;
  }

  const sourcePkg = JSON.parse(fs.readFileSync(path.join(sourceDir, 'package.json'), 'utf8'));

  // Discover skill directories (must contain SKILL.md)
  const skillNames = fs.readdirSync(sourceDir).filter((entry) => {
    if (exclude.has(entry)) return false;
    if (skillFilter !== null && !skillFilter.has(entry)) return false;
    const fullPath = path.join(sourceDir, entry);
    return fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'SKILL.md'));
  });

  const priorSkills = new Set(priorManifest[sourceName]?.skills ?? []);

  // Remove skills that were previously synced but are no longer in the source
  for (const removedSkill of priorSkills) {
    if (!skillNames.includes(removedSkill)) {
      const target = path.join(destDir, removedSkill);
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true });
        console.log(`sync-skills: removed ${removedSkill} (dropped from ${sourceName})`);
      }
    }
  }

  let copied = 0;
  let skipped = 0;

  for (const skillName of skillNames) {
    const sourceSkillDir = path.join(sourceDir, skillName);
    const targetSkillDir = path.join(destDir, skillName);

    // If the skill exists in dest AND was not previously managed by this
    // source, treat it as a project-local skill and leave it alone.
    if (fs.existsSync(targetSkillDir) && !priorSkills.has(skillName)) {
      skipped++;
      continue;
    }

    copyDir(sourceSkillDir, targetSkillDir);
    copied++;
  }

  newManifest[sourceName] = { version: sourcePkg.version, skills: skillNames };

  const parts = [];
  if (copied) parts.push(`${copied} synced`);
  if (skipped) parts.push(`${skipped} skipped (project-local)`);
  console.log(
    `sync-skills: ${sourceName}@${sourcePkg.version} — ${parts.join(', ') || 'nothing to do'}`,
  );
}

fs.writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2) + '\n');
console.log('sync-skills: wrote .sources.json');

// ---------------------------------------------------------------------------
// Patch consumer postinstall
// ---------------------------------------------------------------------------

if (fs.existsSync(consumerPkgPath)) {
  const consumerPkg = JSON.parse(fs.readFileSync(consumerPkgPath, 'utf8'));
  const existing = consumerPkg.scripts?.postinstall ?? '';

  if (!existing.includes('sync-skills')) {
    consumerPkg.scripts ??= {};
    consumerPkg.scripts.postinstall = existing ? `${existing} && sync-skills` : 'sync-skills';
    fs.writeFileSync(consumerPkgPath, JSON.stringify(consumerPkg, null, 2) + '\n');
    console.log('sync-skills: added postinstall script to package.json');
  }
}

// ---------------------------------------------------------------------------
// Create IDE symlinks (.cursor/skills, .claude/skills)
// ---------------------------------------------------------------------------

const ideLinks = [
  ['.cursor', 'skills'],
  ['.claude', 'skills'],
];

for (const [ideDir, linkName] of ideLinks) {
  const ideDirPath = path.join(projectRoot, ideDir);
  const linkPath = path.join(ideDirPath, linkName);

  if (!fs.existsSync(ideDirPath)) continue;

  // existsSync follows symlinks — treats a valid existing symlink as present
  if (fs.existsSync(linkPath)) continue;

  const relTarget = path.relative(ideDirPath, destDir);
  fs.symlinkSync(relTarget, linkPath);
  console.log(`sync-skills: created ${path.join(ideDir, linkName)} -> ${relTarget}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      const content = fs.readFileSync(srcPath);
      // Only write if content changed — avoids spurious git diffs on reinstall
      if (!fs.existsSync(destPath) || !content.equals(fs.readFileSync(destPath))) {
        fs.writeFileSync(destPath, content);
      }
    }
  }
}

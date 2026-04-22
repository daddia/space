#!/usr/bin/env node
/**
 * sync-skills
 *
 * Copies skills from @tpw/skills (and any additional configured sources) into
 * a local `skills/` directory that is tracked in git. Project-specific skills
 * that live in `skills/` but are not managed by any source are never touched.
 *
 * Usage:
 *   postinstall (automatic): "postinstall": "sync-skills" in package.json
 *   manual:                  pnpm exec sync-skills
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

  const sourcePkg = JSON.parse(
    fs.readFileSync(path.join(sourceDir, 'package.json'), 'utf8'),
  );

  // Discover skill directories (must contain SKILL.md)
  const skillNames = fs.readdirSync(sourceDir).filter((entry) => {
    if (exclude.has(entry)) return false;
    const fullPath = path.join(sourceDir, entry);
    return (
      fs.statSync(fullPath).isDirectory() &&
      fs.existsSync(path.join(fullPath, 'SKILL.md'))
    );
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

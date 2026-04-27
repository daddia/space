#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadAllSkills, loadSkill } from '../skill.js';
import { lintSkills } from '../lint/index.js';
import { loadProfile } from '../profile.js';
import type { Diagnostic } from '../lint/types.js';

const packageDir = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const skillFilter = args.filter((a) => !a.startsWith('--'));

let skills;
if (skillFilter.length > 0) {
  skills = skillFilter.map((name) => loadSkill(path.join(packageDir, name)));
} else {
  skills = loadAllSkills(packageDir);
}

if (skills.length === 0) {
  process.stderr.write('lint-skills: no skills found to lint\n');
  process.exit(1);
}

const diagnostics = lintSkills(skills);

// Profile validation when running on the full library
let profileDiagnostics: Diagnostic[] = [];
if (skillFilter.length === 0) {
  profileDiagnostics = validateProfiles(packageDir, skills);
}

const allDiagnostics = [...diagnostics, ...profileDiagnostics];
const errors = allDiagnostics.filter((d) => d.severity === 'error');

if (jsonOutput) {
  const summary = {
    skillsLinted: skills.length,
    errors: errors.length,
    findings: allDiagnostics,
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
} else {
  process.stdout.write(`lint-skills: linted ${skills.length} skill(s)\n`);
  if (errors.length === 0) {
    process.stdout.write('lint-skills: all checks pass\n');
  } else {
    const grouped = new Map<string, Diagnostic[]>();
    for (const d of allDiagnostics) {
      if (!grouped.has(d.skill)) grouped.set(d.skill, []);
      grouped.get(d.skill)!.push(d);
    }
    for (const [skillName, items] of grouped) {
      process.stdout.write(`\n  ${skillName}\n`);
      for (const d of items) {
        process.stdout.write(`    \u2717 [${d.rule}] ${d.message}\n`);
      }
    }
    process.stdout.write(`\nlint-skills: ${errors.length} error(s)\n`);
  }
}

process.exit(errors.length > 0 ? 1 : 0);

// ---------------------------------------------------------------------------
// Profile validation
// ---------------------------------------------------------------------------

function validateProfiles(pkgDir: string, loadedSkills: ReturnType<typeof loadAllSkills>): Diagnostic[] {
  const profilesDir = path.join(pkgDir, 'profiles');
  if (!fs.existsSync(profilesDir)) return [];

  const stageByName = new Map(loadedSkills.map((s) => [s.name, s.frontmatter.stage ?? 'unknown']));

  // Some skill directories are excluded from loadAllSkills (e.g. space-index).
  // Look them up directly from disk when they appear in profiles.
  const stageForSkill = (skillName: string): string => {
    if (stageByName.has(skillName)) return stageByName.get(skillName)!;
    const skillDir = path.join(pkgDir, skillName);
    if (!fs.existsSync(skillDir)) return 'unknown';
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) return 'unknown';
    const content = fs.readFileSync(skillMdPath, 'utf8');
    const match = content.match(/^stage:\s*(\S+)/m);
    return match ? match[1]!.replace(/['"]/g, '') : 'unknown';
  };
  const diagnostics: Diagnostic[] = [];

  const profileFiles = fs
    .readdirSync(profilesDir)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort();

  for (const file of profileFiles) {
    const profileId = `profiles/${file}`;
    const profileName = file.replace(/\.(ya?ml)$/, '');
    let profile;
    try {
      profile = loadProfile(profileName, pkgDir);
    } catch {
      diagnostics.push({
        rule: 'profile.parse-error',
        severity: 'error',
        skill: profileId,
        message: `failed to parse profile: ${file}`,
      });
      continue;
    }

    if (!profile.name) {
      diagnostics.push({
        rule: 'profile.missing-field',
        severity: 'error',
        skill: profileId,
        message: 'profile is missing required field: name',
      });
    }

    if (!Array.isArray(profile.skills)) {
      diagnostics.push({
        rule: 'profile.missing-field',
        severity: 'error',
        skill: profileId,
        message: 'profile is missing required field: skills (must be a list)',
      });
      continue;
    }

    if (profile.skills.length === 0) {
      diagnostics.push({
        rule: 'profile.empty-skills',
        severity: 'error',
        skill: profileId,
        message: 'profile skills list is empty',
      });
    }

    for (const skillName of profile.skills) {
      const skillDir = path.join(pkgDir, skillName);
      if (!fs.existsSync(skillDir) || !fs.existsSync(path.join(skillDir, 'SKILL.md'))) {
        diagnostics.push({
          rule: 'profile.unknown-skill',
          severity: 'error',
          skill: profileId,
          message: `skill "${skillName}" does not match any directory under packages/skills/`,
        });
        continue;
      }

      const stage = stageForSkill(skillName);
      if (stage !== 'stable') {
        diagnostics.push({
          rule: 'profile.non-stable',
          severity: 'error',
          skill: profileId,
          message: `skill "${skillName}" has stage: ${stage} — only stable skills may be listed in profiles`,
        });
      }
    }
  }

  return diagnostics;
}

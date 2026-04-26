/**
 * profile-utils
 *
 * Parses and validates @tpw/skills profile YAML files.
 * Imported by lint-skills.js; also used directly by tests.
 *
 * A profile YAML has the shape:
 *   name: <string>           required
 *   description: <string>    optional
 *   skills:                  required; one or more skill directory names
 *     - <skill-name>
 */

import fs from 'fs';
import path from 'path';

/**
 * Parse a profile YAML string into a plain object.
 *
 * Only handles the flat profile schema (name, description, skills list).
 * Does not use a full YAML library — keeps the bin/ self-contained.
 *
 * @param {string} content  Raw file content
 * @returns {{ name?: string, description?: string, skills?: string[] }}
 */
export function parseProfileYaml(content) {
  const out = {};
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    const match = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      i++;
      continue;
    }

    const key = match[1];
    let inline = match[2];

    // Folded / literal scalar (multi-line)
    if (inline === '' || inline === '>' || inline === '>-' || inline === '|-' || inline === '|') {
      // Check if next non-empty line is a list item
      const nextContent = lines
        .slice(i + 1)
        .find((l) => l.trim() !== '' && !l.trim().startsWith('#'));
      const isList = nextContent && /^\s+-\s+/.test(nextContent);
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

      const block = [];
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

    // Inline scalar
    out[key] = inline.trim().replace(/^['"]|['"]$/g, '');
    i++;
  }

  return out;
}

/**
 * Validate all profile YAML files found in `<packageDir>/profiles/`.
 *
 * Rules enforced:
 *   profile.missing-field   — `name` or `skills` is absent
 *   profile.empty-skills    — `skills` array is empty
 *   profile.unknown-skill   — skill name does not match any directory under packageDir
 *   profile.non-stable      — skill name resolves to a directory but is not stage: stable
 *
 * @param {string}   packageDir  Absolute path to the @tpw/skills package root
 * @param {Map<string, object>} stageBySkilName  Map of skill name → stage string (pre-loaded by caller)
 * @param {{ skill: string, severity: string, rule: string, message: string }[]} findings
 *   Mutable array; push errors here (does not return them).
 */
export function validateProfiles(packageDir, stageBySkillName, findings) {
  const profilesDir = path.join(packageDir, 'profiles');
  if (!fs.existsSync(profilesDir)) return;

  const profileFiles = fs
    .readdirSync(profilesDir)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort();

  for (const file of profileFiles) {
    const profileId = `profiles/${file}`;
    const content = fs.readFileSync(path.join(profilesDir, file), 'utf8');
    const profile = parseProfileYaml(content);

    if (!profile.name || profile.name === '') {
      findings.push({
        skill: profileId,
        severity: 'error',
        rule: 'profile.missing-field',
        message: 'profile is missing required field: name',
      });
    }

    if (!Array.isArray(profile.skills)) {
      findings.push({
        skill: profileId,
        severity: 'error',
        rule: 'profile.missing-field',
        message: 'profile is missing required field: skills (must be a list)',
      });
      continue;
    }

    if (profile.skills.length === 0) {
      findings.push({
        skill: profileId,
        severity: 'error',
        rule: 'profile.empty-skills',
        message: 'profile skills list is empty',
      });
    }

    for (const skillName of profile.skills) {
      const skillDir = path.join(packageDir, skillName);
      if (!fs.existsSync(skillDir) || !fs.existsSync(path.join(skillDir, 'SKILL.md'))) {
        findings.push({
          skill: profileId,
          severity: 'error',
          rule: 'profile.unknown-skill',
          message: `skill "${skillName}" does not match any directory under packages/skills/`,
        });
        continue;
      }

      const stage = stageBySkillName.get(skillName);
      if (stage !== 'stable') {
        findings.push({
          skill: profileId,
          severity: 'error',
          rule: 'profile.non-stable',
          message: `skill "${skillName}" has stage: ${stage ?? 'unknown'} — only stable skills may be listed in profiles`,
        });
      }
    }
  }
}

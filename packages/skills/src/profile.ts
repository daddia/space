import fs from 'fs';
import path from 'path';
import * as yaml from 'yaml';
import { loadSkill, type Skill } from './skill.js';

/** A skill profile grouping a named set of skills. */
export interface Profile {
  name: string;
  description: string;
  /** Skill directory names that belong to this profile */
  skills: string[];
}

/**
 * Load a profile by name from the `profiles/` directory under `rootDir`.
 *
 * Accepts both `.yaml` and `.yml` extensions.
 * Throws if no matching profile file is found.
 */
export function loadProfile(name: string, rootDir: string): Profile {
  const profilesDir = path.join(rootDir, 'profiles');
  const candidates = [`${name}.yaml`, `${name}.yml`];

  for (const candidate of candidates) {
    const filePath = path.join(profilesDir, candidate);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = yaml.parse(content) as {
        name?: string;
        description?: string;
        skills?: string[];
      };
      return {
        name: parsed.name ?? name,
        description: parsed.description ?? '',
        skills: parsed.skills ?? [],
      };
    }
  }

  const available = fs.existsSync(profilesDir)
    ? fs
        .readdirSync(profilesDir)
        .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
        .map((f) => f.replace(/\.(ya?ml)$/, ''))
        .join(', ')
    : '(profiles directory not found)';

  throw new Error(`Profile "${name}" not found. Available profiles: ${available}`);
}

/**
 * Resolve a profile by name: load the profile definition, then load each
 * listed skill from `rootDir`.
 *
 * Skills that cannot be found on disk are collected into `missing` rather than
 * causing an error, so callers can report them explicitly.
 */
export function resolveProfile(
  name: string,
  rootDir: string,
): { profile: Profile; skills: Skill[]; missing: string[] } {
  const profile = loadProfile(name, rootDir);
  const skills: Skill[] = [];
  const missing: string[] = [];

  for (const skillName of profile.skills) {
    const skillDir = path.join(rootDir, skillName);
    try {
      skills.push(loadSkill(skillDir));
    } catch {
      missing.push(skillName);
    }
  }

  return { profile, skills, missing };
}

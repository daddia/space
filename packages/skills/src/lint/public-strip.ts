import fs from 'fs';
import path from 'path';
import { stripFrontmatter, parseFrontmatter } from '../frontmatter.js';
import { PUBLIC_KEYS } from '../publish/strip-policy.js';
import type { Skill } from '../skill.js';
import type { Diagnostic, LintRule } from './types.js';

/**
 * Assert that stripping a stable skill's frontmatter to the public-spec keys
 * produces a valid public SKILL.md:
 *
 * - `name` and `description` are present and non-empty after stripping.
 * - The body is byte-identical to the source body (strip only touches
 *   frontmatter; the content section is preserved verbatim).
 *
 * Skips skills that are not stable (draft, deprecated, deferred).
 */
export const publicStrip: LintRule = (skill: Skill): Diagnostic[] => {
  if (skill.frontmatter.stage !== 'stable') return [];

  const skillMdPath = path.join(skill.path, 'SKILL.md');
  let raw: string;
  try {
    raw = fs.readFileSync(skillMdPath, 'utf8');
  } catch {
    return [
      {
        rule: 'public-strip',
        severity: 'error',
        skill: skill.name,
        message: `could not read SKILL.md at ${skillMdPath}`,
      },
    ];
  }

  const stripped = stripFrontmatter(raw, PUBLIC_KEYS);
  const { data: publicFm, body: strippedBody } = parseFrontmatter(stripped);

  const diagnostics: Diagnostic[] = [];

  if (!publicFm.name || publicFm.name.trim() === '') {
    diagnostics.push({
      rule: 'public-strip',
      severity: 'error',
      skill: skill.name,
      message: 'stripped frontmatter is missing a non-empty "name" field',
      hint: 'Ensure the skill frontmatter contains name: <value> using the correct YAML key.',
    });
  }

  if (!publicFm.description || publicFm.description.trim() === '') {
    diagnostics.push({
      rule: 'public-strip',
      severity: 'error',
      skill: skill.name,
      message: 'stripped frontmatter is missing a non-empty "description" field',
      hint: 'Ensure the skill frontmatter contains description: <value> using the correct YAML key.',
    });
  }

  if (strippedBody !== skill.body) {
    diagnostics.push({
      rule: 'public-strip',
      severity: 'error',
      skill: skill.name,
      message: 'body changed after frontmatter strip — strip must not modify the skill body',
      hint: 'Check that stripFrontmatter correctly handles the closing --- fence and does not consume body content.',
    });
  }

  return diagnostics;
};

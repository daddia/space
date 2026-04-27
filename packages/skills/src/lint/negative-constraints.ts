import fs from 'fs';
import path from 'path';
import type { Skill } from '../skill.js';
import type { Diagnostic, LintRule } from './types.js';

const ALIAS_MARKER_RE = /^<!--\s*Alias:/m;
const DRAFTING_AIDE_RE = /<!--[\s\S]*?(DRAFTING AIDE|DO NOT INCLUDE)[\s\S]*?-->/m;
const NEGATIVE_SECTION_RE = /^## Negative constraints\s*$/m;

/**
 * Each skill must document its negative constraints in one of two ways:
 *
 * - Skills with at least one non-alias `template*.md` file: every such template
 *   must contain a `DRAFTING AIDE / DO NOT INCLUDE` HTML comment block.
 * - Skills without real templates: `SKILL.md` body must have a
 *   `## Negative constraints` section.
 */
export const negativeConstraints: LintRule = (skill: Skill): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  const realTemplates = skill.templates.filter((filename) => {
    const filePath = path.join(skill.path, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    return !ALIAS_MARKER_RE.test(content);
  });

  if (realTemplates.length > 0) {
    for (const filename of realTemplates) {
      const filePath = path.join(skill.path, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      if (!DRAFTING_AIDE_RE.test(content)) {
        diagnostics.push({
          rule: 'negative-constraints',
          severity: 'error',
          skill: skill.name,
          message: `template ${filename} is missing a DRAFTING AIDE / DO NOT INCLUDE block`,
          hint: 'Add an HTML comment block with "DRAFTING AIDE" or "DO NOT INCLUDE" at the top of the template.',
        });
      }
    }
  } else {
    if (!NEGATIVE_SECTION_RE.test(skill.body)) {
      diagnostics.push({
        rule: 'negative-constraints',
        severity: 'error',
        skill: skill.name,
        message:
          'skill has no template*.md — SKILL.md must include a `## Negative constraints` section',
        hint: 'Add a `## Negative constraints` section explaining what this skill should NOT be used for.',
      });
    }
  }

  return diagnostics;
};

import type { Skill } from '../skill.js';
import type { Diagnostic, LintRule } from './types.js';

const REQUIRED: ReadonlyArray<string> = [
  'name',
  'description',
  'allowed-tools',
  'version',
  'artefact',
  'track',
  'role',
  'produces',
];

export const requiredFields: LintRule = (skill: Skill): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const fm = skill.frontmatter as unknown as Record<string, unknown>;

  for (const field of REQUIRED) {
    const value = fm[field];
    const missing =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);

    if (missing) {
      diagnostics.push({
        rule: 'required-fields',
        severity: 'error',
        skill: skill.name,
        message: `missing required frontmatter field: ${field}`,
        hint: `Add \`${field}:\` to the skill's YAML frontmatter.`,
      });
    }
  }

  return diagnostics;
};

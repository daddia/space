import type { Skill } from '../skill.js';
import type { Diagnostic, LintRule } from './types.js';

const MIN = 200;
const MAX = 500;

export const descriptionLength: LintRule = (skill: Skill): Diagnostic[] => {
  const desc = skill.frontmatter.description ?? '';
  if (desc.length >= MIN && desc.length <= MAX) return [];
  return [
    {
      rule: 'description-length',
      severity: 'error',
      skill: skill.name,
      message: `description is ${desc.length} chars (expected ${MIN}–${MAX})`,
      hint: `Adjust the description to be between ${MIN} and ${MAX} characters.`,
    },
  ];
};

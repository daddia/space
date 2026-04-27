import type { Skill } from '../skill.js';
import type { Diagnostic, LintRule } from './types.js';

export const descriptionDoNot: LintRule = (skill: Skill): Diagnostic[] => {
  const desc = skill.frontmatter.description ?? '';
  if (/Do NOT\b/.test(desc)) return [];
  return [
    {
      rule: 'description-do-not',
      severity: 'error',
      skill: skill.name,
      message: 'description must contain at least one `Do NOT` neighbour disambiguation clause',
      hint: 'Add a "Do NOT use for X — use Y instead" clause to the description.',
    },
  ];
};

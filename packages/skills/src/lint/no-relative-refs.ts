import type { Skill } from '../skill.js';
import type { Diagnostic, LintRule } from './types.js';

export const noRelativeRefs: LintRule = (skill: Skill): Diagnostic[] => {
  if (!skill.body.includes('../')) return [];
  return [
    {
      rule: 'no-relative-refs',
      severity: 'error',
      skill: skill.name,
      message:
        'skill body contains ../ relative path — use {source}:{path} URI scheme for cross-repo references',
      hint: 'Replace ../path/to/file with source:path/to/file (e.g. space:architecture/solution.md).',
    },
  ];
};

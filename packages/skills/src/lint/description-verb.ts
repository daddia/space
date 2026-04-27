import type { Skill } from '../skill.js';
import type { Diagnostic, LintRule } from './types.js';

const VERB_RE =
  /^(Drafts|Creates|Implements|Reviews|Performs|Documents|Produces|Identifies|Refines)\b/;

export const descriptionVerb: LintRule = (skill: Skill): Diagnostic[] => {
  const desc = skill.frontmatter.description ?? '';
  if (VERB_RE.test(desc)) return [];
  return [
    {
      rule: 'description-verb',
      severity: 'error',
      skill: skill.name,
      message:
        'description must open with a third-person verb-ing form (Drafts|Creates|Implements|Reviews|Performs|Documents|Produces|Identifies|Refines)',
      hint: 'Start the description with one of the allowed verbs.',
    },
  ];
};

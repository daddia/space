import type { Skill } from '../skill.js';
import type { Diagnostic } from './types.js';
import { descriptionLength } from './description-length.js';
import { descriptionVerb } from './description-verb.js';
import { descriptionDoNot } from './description-do-not.js';
import { descriptionUniqueness } from './description-uniqueness.js';
import { requiredFields } from './required-fields.js';
import { noRelativeRefs } from './no-relative-refs.js';
import { handoffGraph } from './handoff-graph.js';
import { negativeConstraints } from './negative-constraints.js';

/** Rules applied to every skill that is not an alias/deprecated. */
const FULL_RULES = [
  requiredFields,
  descriptionLength,
  descriptionVerb,
  descriptionDoNot,
  descriptionUniqueness,
  handoffGraph,
  noRelativeRefs,
  negativeConstraints,
];

/**
 * Rules applied to deprecated alias skills.
 * Aliases are exempt from description, required-field, relative-ref, and
 * negative-constraint checks — they are backward-compat shims, not full skills.
 */
const ALIAS_RULES: typeof FULL_RULES = [];

const ALIAS_MARKER_RE = /^<!--\s*Alias:/m;

/**
 * Run all lint rules against `skills` and return the full list of diagnostics.
 *
 * Skills with `stage: deprecated` or an `<!-- Alias: -->` marker are exempt
 * from the full rule set and checked only against the alias rule subset.
 */
export function lintSkills(skills: Skill[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const skill of skills) {
    const isAlias = skill.frontmatter.stage === 'deprecated' || ALIAS_MARKER_RE.test(skill.body);
    const rules = isAlias ? ALIAS_RULES : FULL_RULES;
    for (const rule of rules) {
      diagnostics.push(...rule(skill, skills));
    }
  }

  return diagnostics;
}

export type { Diagnostic } from './types.js';
export type { LintRule } from './types.js';

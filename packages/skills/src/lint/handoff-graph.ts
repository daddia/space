import type { Skill } from '../skill.js';
import type { Diagnostic, LintRule } from './types.js';

/**
 * Verifies that every entry in a skill's `consumes` list is produced by at
 * least one other skill in the library.
 */
export const handoffGraph: LintRule = (skill: Skill, allSkills: Skill[]): Diagnostic[] => {
  const consumes = skill.frontmatter.consumes ?? [];
  if (consumes.length === 0) return [];

  const produced = new Set<string>();
  for (const other of allSkills) {
    if (other.name === skill.name) continue;
    for (const item of other.frontmatter.produces ?? []) {
      produced.add(item);
    }
  }

  const diagnostics: Diagnostic[] = [];
  for (const item of consumes) {
    if (!produced.has(item)) {
      diagnostics.push({
        rule: 'handoff-graph',
        severity: 'error',
        skill: skill.name,
        message: `consumes "${item}" but no other skill produces it`,
        hint: `Add \`${item}\` to the \`produces\` list of the skill that outputs it.`,
      });
    }
  }

  return diagnostics;
};

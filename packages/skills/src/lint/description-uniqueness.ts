import type { Skill } from '../skill.js';
import type { Diagnostic, LintRule } from './types.js';

/**
 * Checks that no two skills share a normalised (collapsed-whitespace) description.
 * Because this rule needs awareness of all skills, `allSkills` is used to build
 * the collision map. Emits an error on the second (and any subsequent) skill that
 * reuses a description already claimed by an earlier skill.
 */
export const descriptionUniqueness: LintRule = (skill: Skill, allSkills: Skill[]): Diagnostic[] => {
  const normalised = (skill.frontmatter.description ?? '').replace(/\s+/g, ' ').trim();

  for (const other of allSkills) {
    if (other.name === skill.name) break;
    const otherNormalised = (other.frontmatter.description ?? '').replace(/\s+/g, ' ').trim();
    if (otherNormalised === normalised) {
      return [
        {
          rule: 'description-uniqueness',
          severity: 'error',
          skill: skill.name,
          message: `description collides with ${other.name}`,
          hint: 'Each skill must have a unique description.',
        },
      ];
    }
  }

  return [];
};

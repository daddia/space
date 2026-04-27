import type { Skill } from '../skill.js';
import { generateIndexTable } from './index-table.js';

const BEGIN_SENTINEL = '<!-- BEGIN GENERATED';
const END_SENTINEL = '<!-- END GENERATED -->';

/**
 * Replace the content between the BEGIN/END GENERATED sentinels in the
 * `space-index/SKILL.md` file string with a freshly generated table.
 *
 * Throws if either sentinel is missing from `fileContent`.
 */
export function replaceGeneratedSection(fileContent: string, newTable: string): string {
  const beginIdx = fileContent.indexOf(BEGIN_SENTINEL);
  if (beginIdx === -1) {
    throw new Error('space-index/SKILL.md is missing the <!-- BEGIN GENERATED --> sentinel');
  }

  const endIdx = fileContent.indexOf(END_SENTINEL);
  if (endIdx === -1) {
    throw new Error('space-index/SKILL.md is missing the <!-- END GENERATED --> sentinel');
  }

  const beginLineEnd = fileContent.indexOf('\n', beginIdx);
  if (beginLineEnd === -1) {
    throw new Error('<!-- BEGIN GENERATED --> sentinel has no trailing newline');
  }

  const before = fileContent.slice(0, beginLineEnd + 1);
  const after = fileContent.slice(endIdx);

  return before + newTable + '\n' + after;
}

/**
 * Generate the updated `space-index/SKILL.md` content.
 *
 * Filters out deprecated skills, builds the index table, and splices it into
 * the sentinel-bounded section of the current file content.
 *
 * @param currentContent  Current content of `space-index/SKILL.md`
 * @param allSkills       All skills loaded from the package root
 * @returns The updated file content string
 */
export function generateSpaceIndexSkill(currentContent: string, allSkills: Skill[]): string {
  const stable = allSkills.filter((s) => s.frontmatter.stage !== 'deprecated');
  const table = generateIndexTable(stable);
  return replaceGeneratedSection(currentContent, table);
}

import fs from 'fs';
import path from 'path';
import type { Skill } from '../skill.js';
import type { Diagnostic, LintRule } from './types.js';

/**
 * Regex that matches a standard Markdown link whose target is a local relative
 * path to a template or example file.
 *
 * Matches `[label](target)` where `target` is one of:
 *  - `template*.md`
 *  - `examples/*.md`
 *
 * The target must not start with `http`, `https`, or a `{source}:` URI scheme
 * to avoid false-positives on cross-repo references.
 */
const LOCAL_ASSET_LINK_RE = /\[(?:[^\]]*)\]\(((?:template[^)]*\.md|examples\/[^)]+\.md))\)/g;

/**
 * Assert that every `template-*.md` and `examples/*.md` file referenced by a
 * SKILL.md body via a Markdown link `[text](path.md)` exists on disk relative
 * to the skill directory.
 *
 * This rule catches broken asset references that would produce 404s when the
 * public mirror is consumed.
 */
export const bundledAssets: LintRule = (skill: Skill): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const { body } = skill;

  let match: RegExpExecArray | null;
  LOCAL_ASSET_LINK_RE.lastIndex = 0;

  while ((match = LOCAL_ASSET_LINK_RE.exec(body)) !== null) {
    const target = match[1]!;
    const absolutePath = path.join(skill.path, target);

    if (!fs.existsSync(absolutePath)) {
      diagnostics.push({
        rule: 'bundled-assets',
        severity: 'error',
        skill: skill.name,
        message: `body references "${target}" but the file does not exist on disk`,
        hint: `Create ${target} in the skill directory or update the link.`,
      });
    }
  }

  return diagnostics;
};

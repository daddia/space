import type { Skill } from '../skill.js';
import { shouldShipFile } from '../publish/strip-policy.js';
import type { Diagnostic, LintRule } from './types.js';

/**
 * Regex that matches any standard Markdown link `[label](target)` where
 * `target` is a relative local path (does not start with http/https or
 * a {source}: URI scheme).
 *
 * Captures the target path in group 1.
 */
const LOCAL_LINK_RE = /\[(?:[^\]]*)\]\(((?!https?:\/\/|[a-zA-Z][a-zA-Z0-9+\-.]*:)[^)]+)\)/g;

/**
 * Assert that a stable skill's SKILL.md body contains no Markdown link to a
 * local file that the public mirror would NOT ship.
 *
 * For each `[text](target)` link whose target is a local relative path, this
 * rule calls `shouldShipFile(target)`. If the public-asset policy would drop
 * the file, the link would be broken in the published mirror.
 *
 * Skips skills that are not stable (draft, deprecated, deferred).
 */
export const publicBodyReferences: LintRule = (skill: Skill): Diagnostic[] => {
  if (skill.frontmatter.stage !== 'stable') return [];

  const diagnostics: Diagnostic[] = [];
  const { body } = skill;

  let match: RegExpExecArray | null;
  LOCAL_LINK_RE.lastIndex = 0;

  while ((match = LOCAL_LINK_RE.exec(body)) !== null) {
    const target = match[1]!.trim();
    if (!shouldShipFile(target)) {
      diagnostics.push({
        rule: 'public-body-references',
        severity: 'error',
        skill: skill.name,
        message: `body links to "${target}" which the public mirror would not ship`,
        hint: `Remove the link, replace it with a generic example, or update to point at a file that will be published.`,
      });
    }
  }

  return diagnostics;
};

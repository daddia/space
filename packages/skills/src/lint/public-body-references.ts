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
 * Regex that matches inline-backtick references to local Markdown files,
 * e.g. `` `examples/cart-product.md` `` or `` `template-domain.md` ``.
 *
 * Constrained to paths ending in `.md` to avoid false positives on code
 * identifiers and shell snippets. Excludes absolute paths and URL/source
 * schemes the same way the markdown-link regex does.
 *
 * Captures the path in group 1.
 */
const LOCAL_BACKTICK_RE = /`((?!https?:\/\/|[a-zA-Z][a-zA-Z0-9+\-.]*:|\/)[A-Za-z0-9._/-]+\.md)`/g;

/**
 * Assert that a stable skill's SKILL.md body contains no reference (Markdown
 * link or inline-backtick path) to a local file that the public mirror would
 * NOT ship.
 *
 * For each candidate path -- whether `[text](target)` or `` `target` `` -- this
 * rule calls `shouldShipFile(target)`. If the public-asset policy would drop
 * the file, the reference would be broken in the published mirror.
 *
 * Skips skills that are not stable (draft, deprecated, deferred).
 */
export const publicBodyReferences: LintRule = (skill: Skill): Diagnostic[] => {
  if (skill.frontmatter.stage !== 'stable') return [];

  const diagnostics: Diagnostic[] = [];
  const { body } = skill;

  for (const re of [LOCAL_LINK_RE, LOCAL_BACKTICK_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(body)) !== null) {
      const target = match[1]!.trim();
      if (!shouldShipFile(target)) {
        diagnostics.push({
          rule: 'public-body-references',
          severity: 'error',
          skill: skill.name,
          message: `body references "${target}" which the public mirror would not ship`,
          hint: `Remove the reference, replace it with a generic example, or update to point at a file that will be published.`,
        });
      }
    }
  }

  return diagnostics;
};

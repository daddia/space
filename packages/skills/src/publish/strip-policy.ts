export { PUBLIC_KEYS } from '../frontmatter.js';

/**
 * Filename prefix segments whose matching example files stay in source and
 * are NOT shipped to the public mirror.
 *
 * A file `examples/cart-product.md` is excluded because its base name starts
 * with the prefix "cart". Comparison is case-sensitive.
 */
export const INTERNAL_EXAMPLE_PREFIXES: ReadonlyArray<string> = [
  'cart',
  'space',
  'workflow-engine',
];

/**
 * Directory names that are excluded from the public mirror entirely.
 *
 * Any path segment matching one of these names causes the file to be treated
 * as internal-only and omitted from the published tree.
 */
export const INTERNAL_DIRS: ReadonlyArray<string> = ['.internal', '.private'];

/**
 * Returns `true` when a skill-relative file path should be included in the
 * public mirror shipped to `daddia/skills`.
 *
 * Rules (applied in order; first match wins):
 *
 * 1. `SKILL.md` always ships.
 * 2. Any path segment equal to an entry in `INTERNAL_DIRS` is excluded.
 * 3. A `template-*.md` (mode-specific variant) is excluded; `template.md`
 *    ships.
 * 4. An `examples/{name}.md` file is excluded when `name` starts with any
 *    entry in `INTERNAL_EXAMPLE_PREFIXES`.
 * 5. All other files ship.
 *
 * @param relPath - Path relative to the skill directory (e.g. `SKILL.md`,
 *   `template.md`, `examples/cart-product.md`).
 */
export function shouldShipFile(relPath: string): boolean {
  const segments = relPath.split('/');

  if (segments.length === 1 && relPath === 'SKILL.md') return true;

  for (const segment of segments) {
    if ((INTERNAL_DIRS as string[]).includes(segment)) return false;
  }

  const filename = segments[segments.length - 1]!;

  if (/^template-.+\.md$/.test(filename)) return false;

  if (segments.length >= 2 && segments[segments.length - 2] === 'examples') {
    const baseName = filename.replace(/\.md$/, '');
    for (const prefix of INTERNAL_EXAMPLE_PREFIXES) {
      if (baseName.startsWith(prefix)) return false;
    }
  }

  return true;
}

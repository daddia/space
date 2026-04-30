import fs from 'node:fs/promises';
import path from 'node:path';
import type { UpdateCache } from './version-check.js';

/**
 * Filters the cache to packages with compatible (non-breaking) updates and
 * returns a map of package name to latest version, ready to pass to
 * applyVersionBumps.
 */
export function selectCompatibleBumps(cache: UpdateCache): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, info] of Object.entries(cache.packages)) {
    if (!info.breaking) {
      result[name] = info.latest;
    }
  }
  return result;
}

/**
 * Rewrites @daddia/* specifiers in the workspace package.json for each entry
 * in the bumps map. Applies the policy below to both `dependencies` and
 * `devDependencies`. Unknown specifier forms are skipped with a warning.
 *
 * Policy:
 *   "*"          → "^<version>"
 *   "^x.y.z"     → "^<version>"
 *   "~x.y.z"     → "~<version>"
 *   "x.y.z"      → unchanged unless force is true (then "^<version>")
 *   "workspace:*" → always unchanged (monorepo-internal reference)
 */
export async function applyVersionBumps(
  cwd: string,
  bumps: Record<string, string>,
  force = false,
): Promise<void> {
  if (Object.keys(bumps).length === 0) return;

  const pkgPath = path.join(cwd, 'package.json');
  const raw = await fs.readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(raw) as Record<string, unknown>;

  let changed = false;

  for (const section of ['dependencies', 'devDependencies'] as const) {
    const deps = pkg[section] as Record<string, string> | undefined;
    if (!deps) continue;

    for (const [name, targetVersion] of Object.entries(bumps)) {
      const current = deps[name];
      if (current === undefined) continue;

      const next = rewriteSpecifier(current, targetVersion, force, name);
      if (next !== null && next !== current) {
        deps[name] = next;
        changed = true;
      }
    }
  }

  if (!changed) return;
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

/**
 * Applies the specifier rewrite policy for a single package version.
 * Returns the new specifier, or null when the current specifier should be left
 * unchanged.
 */
function rewriteSpecifier(
  current: string,
  version: string,
  force: boolean,
  packageName: string,
): string | null {
  // Monorepo-internal references are never touched.
  if (current.startsWith('workspace:')) return null;

  // Wildcard: always upgrade to a pinned caret range.
  if (current === '*') return `^${version}`;

  // Caret range.
  if (current.startsWith('^')) return `^${version}`;

  // Tilde range.
  if (current.startsWith('~')) return `~${version}`;

  // Exact semver (e.g. "0.4.0", "v0.4.0", "1.2.3-rc.1"). The pattern is
  // anchored so "0.4.0.foo" falls through to the unrecognised-form warning
  // rather than being silently treated as an exact pin.
  if (/^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(current)) {
    return force ? `^${version}` : null;
  }

  // Unrecognised form — skip rather than corrupt the specifier.
  console.warn(`  Warning: unrecognised specifier "${current}" for ${packageName} — skipping`);
  return null;
}

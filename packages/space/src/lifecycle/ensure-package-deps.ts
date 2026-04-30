import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Adds @daddia/space and @daddia/skills to devDependencies when not present.
 * Creates a minimal package.json if none exists. Used for sibling-mode init
 * and workspace upgrade.
 */
export async function ensurePackageJsonDeps(targetDir: string): Promise<void> {
  const pkgPath = path.join(targetDir, 'package.json');

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    pkg = { private: true };
  }

  const devDeps = (pkg['devDependencies'] as Record<string, string> | undefined) ?? {};
  let changed = false;

  if (!('@daddia/space' in devDeps)) {
    devDeps['@daddia/space'] = '*';
    changed = true;
  }
  if (!('@daddia/skills' in devDeps)) {
    devDeps['@daddia/skills'] = '*';
    changed = true;
  }

  if (!changed) return;

  pkg['devDependencies'] = devDeps;
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

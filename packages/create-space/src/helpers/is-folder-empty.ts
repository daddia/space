import { readdir, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import pc from 'picocolors';

const IGNORABLE_FILES = new Set([
  '.DS_Store',
  '.git',
  '.gitattributes',
  '.gitignore',
  '.gitlab-ci.yml',
  '.hg',
  '.hgcheck',
  '.hgignore',
  '.idea',
  '.npmignore',
  '.travis.yml',
  '.vscode',
  'LICENSE',
  'LICENSE.md',
  'Thumbs.db',
  'npm-debug.log',
  'pnpm-debug.log',
  'yarn-debug.log',
  'yarn-error.log',
]);

function isIgnorable(name: string): boolean {
  return IGNORABLE_FILES.has(name) || name.endsWith('.iml');
}

/**
 * Returns `true` when the directory is empty or contains only files that
 * are safe to overwrite (editor configs, VCS metadata, OS detritus, etc.).
 * Prints a conflict list and returns `false` when real files are present.
 */
export async function isFolderEmpty(root: string, name: string): Promise<boolean> {
  const conflicts: string[] = [];

  for (const entry of await readdir(root)) {
    if (isIgnorable(entry)) continue;

    try {
      const stat = await lstat(join(root, entry));
      if (stat.isDirectory()) {
        conflicts.push(pc.blue(entry) + '/');
      } else {
        conflicts.push(entry);
      }
    } catch {
      conflicts.push(entry);
    }
  }

  if (conflicts.length === 0) return true;

  console.log(`The directory ${pc.green(name)} contains files that could conflict:\n`);
  for (const conflict of conflicts) {
    console.log(`  ${conflict}`);
  }
  console.log('\nEither use a new directory, or remove the files listed above.\n');

  return false;
}

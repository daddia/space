import fs from 'node:fs/promises';
import path from 'node:path';
import pc from 'picocolors';

import type { WorkspaceLayout } from './helpers/workspace-layout.js';

export type TemplateVars = Record<string, string>;
export type RenderMode = 'greenfield' | 'idempotent';

export interface RenderOptions {
  /** Whether to skip existing files or overwrite them. Defaults to 'greenfield'. */
  mode?: RenderMode;
  /** Selects the template variant. Defaults to 'sibling'. */
  layout?: WorkspaceLayout;
}

const TEMPLATE_PATTERN = /\{([a-z][a-zA-Z]*)\}/g;
const SPACE_CONFIG_RELATIVE = path.join('.space', 'config');

// Lines that Space manages inside the .gitignore marker block.
//
// These constants are intentionally duplicated in @daddia/space/src/commands/init.ts.
// The two packages may not import from each other (dependency rules). Keep both
// copies identical; if the managed lines change, update both files together.
const GITIGNORE_MARKER_START = '# >>> @daddia/space — managed block, do not edit between markers';
const GITIGNORE_MARKER_END = '# <<< @daddia/space';
const GITIGNORE_MANAGED_LINES = [
  '.space/sources/',
  '.space/cache/',
  'runs/',
  'node_modules/',
  '.cursor/skills',
  '.claude/skills',
];

// The postinstall command Space writes when none exists in embedded repos.
const SPACE_POSTINSTALL = 'space skills sync';

function substitute(content: string, vars: TemplateVars): string {
  return content.replace(TEMPLATE_PATTERN, (_match, key: string) => {
    return vars[key] ?? _match;
  });
}

/**
 * Copies the appropriate template variant into targetDir, substituting
 * variables and respecting render mode.
 *
 * Resolves the variant directory from templateDir:
 *   layout === 'embedded' → templateDir/embedded/
 *   otherwise             → templateDir/default/
 */
export async function renderTemplate(
  templateDir: string,
  targetDir: string,
  vars: TemplateVars,
  options?: RenderOptions,
): Promise<string[]> {
  const layout = options?.layout ?? 'sibling';
  const mode = options?.mode ?? 'greenfield';
  const variantDir = path.join(templateDir, layout === 'embedded' ? 'embedded' : 'default');
  const created: string[] = [];
  await copyDir(variantDir, targetDir, targetDir, vars, mode, created);
  return created;
}

async function copyDir(
  src: string,
  dest: string,
  rootDest: string,
  vars: TemplateVars,
  mode: RenderMode,
  created: string[],
): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destName = substituteFilename(entry.name, vars);
    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, rootDest, vars, mode, created);
    } else {
      const raw = await fs.readFile(srcPath, 'utf-8');
      const content = substitute(raw, vars);
      const relPath = path.relative(rootDest, destPath);

      if (mode === 'idempotent') {
        const isSpaceConfig = relPath === SPACE_CONFIG_RELATIVE;

        if (isSpaceConfig) {
          const written = await mergeSpaceConfig(destPath, content);
          if (written) created.push(relPath);
        } else {
          const exists = await fileExists(destPath);
          if (!exists) {
            await fs.writeFile(destPath, content);
            created.push(relPath);
          }
        }
      } else {
        await fs.writeFile(destPath, content);
        created.push(path.relative(rootDest, destPath));
      }
    }
  }
}

/**
 * Merges top-level keys from templateContent into the existing config file.
 * Keys already present in the existing file are preserved as-is; only absent
 * top-level blocks are appended. No YAML library is used — detection is done
 * by scanning for lines that start at column 0 with `key:`.
 * Returns true when the file was written, false when it was unchanged.
 */
async function mergeSpaceConfig(destPath: string, templateContent: string): Promise<boolean> {
  let existing: string;
  try {
    existing = await fs.readFile(destPath, 'utf-8');
  } catch {
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, templateContent);
    return true;
  }

  const existingKeys = extractTopLevelKeys(existing);
  const templateBlocks = splitIntoTopLevelBlocks(templateContent);

  const blocksToAppend = templateBlocks.filter(({ key }) => !existingKeys.has(key));
  if (blocksToAppend.length === 0) return false;

  const suffix = blocksToAppend.map(({ block }) => block).join('\n');
  const separator = existing.endsWith('\n') ? '\n' : '\n\n';
  await fs.writeFile(destPath, existing + separator + suffix);
  return true;
}

/** Returns the set of top-level YAML key names found in content.
 * Uses a line scan so that comments and block scalars are never re-parsed
 * as structure. Trade-off: a key that literally appears at column 0 inside
 * a quoted or block scalar value would be misclassified, but the .space/config
 * shape never has such values.
 */
function extractTopLevelKeys(content: string): Set<string> {
  const keys = new Set<string>();
  for (const line of content.split('\n')) {
    const match = /^([a-zA-Z_][\w-]*):/.exec(line);
    if (match) keys.add(match[1]!);
  }
  return keys;
}

/**
 * Splits YAML content into top-level blocks. Each block starts at a line
 * whose first character is a key identifier and runs until the next such
 * line. Comment and blank lines that precede the first top-level key are
 * discarded; those that follow a key belong to that key's block.
 */
function splitIntoTopLevelBlocks(content: string): Array<{ key: string; block: string }> {
  const lines = content.split('\n');
  const blocks: Array<{ key: string; lines: string[] }> = [];
  let current: { key: string; lines: string[] } | null = null;

  for (const line of lines) {
    const match = /^([a-zA-Z_][\w-]*):/.exec(line);
    if (match) {
      if (current) blocks.push(current);
      current = { key: match[1]!, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  return blocks.map(({ key, lines }) => ({ key, block: lines.join('\n') }));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function substituteFilename(name: string, vars: TemplateVars): string {
  const project = vars['project'] ?? '';
  return name.replace(/\{project\}/g, project);
}

// ---------------------------------------------------------------------------
// Embedded-mode helpers
// ---------------------------------------------------------------------------

function buildManagedBlock(): string {
  return [GITIGNORE_MARKER_START, ...GITIGNORE_MANAGED_LINES, GITIGNORE_MARKER_END, ''].join('\n');
}

/**
 * Ensures that the host .gitignore in targetDir contains a Space-managed
 * marker block. Appends the block if absent; updates the block in-place on
 * reinit; backs up and replaces on unreadable file.
 */
export async function ensureGitignoreManagedBlock(targetDir: string): Promise<void> {
  const gitignorePath = path.join(targetDir, '.gitignore');

  let existing: string;
  try {
    existing = await fs.readFile(gitignorePath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.writeFile(gitignorePath, buildManagedBlock());
      return;
    }
    // Unreadable (e.g. permissions) — attempt backup then write fresh.
    const backupPath = path.join(path.dirname(gitignorePath), '.gitignore.bak');
    try {
      await fs.copyFile(gitignorePath, backupPath);
    } catch {
      // Best-effort; if the file cannot be copied it cannot be read either.
    }
    console.warn(
      `  ${pc.yellow('Warning:')} .gitignore is unreadable; backed up to .gitignore.bak and replaced.`,
    );
    await fs.writeFile(gitignorePath, buildManagedBlock());
    return;
  }

  const startIdx = existing.indexOf(GITIGNORE_MARKER_START);
  const endIdx = existing.indexOf(GITIGNORE_MARKER_END);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // Managed block already present — refresh the content between the markers.
    const before = existing.slice(0, startIdx);
    const afterMarker = existing.slice(endIdx + GITIGNORE_MARKER_END.length);
    // Trim any trailing newline that belongs to the old block end marker.
    await fs.writeFile(
      gitignorePath,
      before + buildManagedBlock() + afterMarker.replace(/^\n/, ''),
    );
  } else {
    // No managed block — append.
    const separator = existing.endsWith('\n') ? '\n' : '\n\n';
    await fs.writeFile(gitignorePath, existing + separator + buildManagedBlock());
  }
}

/**
 * Merges Space devDependencies into the host package.json in embedded mode.
 * Adds @daddia/space and @daddia/skills to devDependencies; adds a
 * scripts.postinstall for skills sync if no postinstall is present; warns
 * when a non-Space postinstall already exists. Throws on invalid JSON so the
 * caller surfaces it as a non-zero exit.
 *
 * If package.json does not exist, creates a minimal one.
 */
export async function ensureEmbeddedPackageJsonDeps(targetDir: string): Promise<void> {
  const pkgPath = path.join(targetDir, 'package.json');

  let raw: string | null = null;
  try {
    raw = await fs.readFile(pkgPath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  if (raw === null) {
    // No package.json — create a minimal one.
    const minimal = {
      private: true,
      scripts: { postinstall: SPACE_POSTINSTALL },
      devDependencies: { '@daddia/space': '*', '@daddia/skills': '*' },
    };
    await fs.writeFile(pkgPath, JSON.stringify(minimal, null, 2) + '\n');
    return;
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      `package.json at ${pkgPath} contains invalid JSON. ` +
        `Fix it before running embedded Space init.`,
    );
  }

  let changed = false;

  // devDependencies — merge; never touch other fields.
  const devDeps = { ...((pkg['devDependencies'] as Record<string, string> | undefined) ?? {}) };
  if (!('@daddia/space' in devDeps)) {
    devDeps['@daddia/space'] = '*';
    changed = true;
  }
  if (!('@daddia/skills' in devDeps)) {
    devDeps['@daddia/skills'] = '*';
    changed = true;
  }
  pkg['devDependencies'] = devDeps;

  // scripts.postinstall — add if absent; warn and preserve if pointing elsewhere.
  const scripts = { ...((pkg['scripts'] as Record<string, string> | undefined) ?? {}) };
  const existingPostinstall = scripts['postinstall'];
  if (!existingPostinstall) {
    scripts['postinstall'] = SPACE_POSTINSTALL;
    pkg['scripts'] = scripts;
    changed = true;
  } else if (existingPostinstall !== SPACE_POSTINSTALL) {
    console.warn(
      `  ${pc.yellow('Warning:')} scripts.postinstall is already set to "${existingPostinstall}". ` +
        `Add "${SPACE_POSTINSTALL}" manually if skills auto-sync is needed.`,
    );
  }

  if (!changed) return;
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

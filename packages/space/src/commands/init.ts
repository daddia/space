import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Command } from 'commander';
import pc from 'picocolors';
import {
  detectWorkspaceState,
  readExistingLayout,
  mergeOrCreateConfig,
  ensurePackageJsonDeps,
  ensureAgentDirs,
  runInstall,
} from '../lifecycle/index.js';
import { detectWorkspaceLayout } from '../helpers/workspace-layout.js';
import type { WorkspaceLayout } from '../helpers/workspace-layout.js';
import type { WorkspaceState } from '../lifecycle/detect-workspace-state.js';

export { detectPackageManager } from '../lifecycle/run-install.js';

export interface InitOptions {
  targetDir?: string;
  skipInstall?: boolean;
  mode?: WorkspaceLayout;
}

export async function runInit(options: InitOptions = {}): Promise<void> {
  const targetDir = path.resolve(options.targetDir ?? process.cwd());
  const templateDir = path.join(import.meta.dirname, '..', '..', 'template');

  const state = await detectWorkspaceState(targetDir);
  const layout = await resolveLayout(state, targetDir, options.mode);

  if (layout === 'embedded' && state !== 'complete') {
    assertGitClean(targetDir);
  }

  const configTemplatePath =
    layout === 'embedded'
      ? path.join(templateDir, 'embedded', '.space', 'config')
      : path.join(templateDir, 'default', '.space', 'config');

  await mergeOrCreateConfig(targetDir, configTemplatePath);

  if (layout === 'embedded') {
    await ensureEmbeddedPackageJsonDeps(targetDir);
    await ensureGitignoreManagedBlock(targetDir);
  } else {
    await ensurePackageJsonDeps(targetDir);
  }

  await ensureAgentDirs(targetDir);

  if (!options.skipInstall) {
    await runInstall(targetDir);
  }

  const spaceStatusPath = `${path.join(targetDir, '.space')}/`;

  if (layout === 'embedded') {
    if (state === 'greenfield') {
      console.log(`Initialized embedded Space workspace in ${spaceStatusPath}`);
    } else {
      console.log(`Reinitialized existing Space workspace (embedded) in ${spaceStatusPath}`);
    }
  } else {
    if (state === 'greenfield') {
      console.log(`Initialized empty Space workspace (sibling) in ${spaceStatusPath}`);
    } else {
      console.log(`Reinitialized existing Space workspace (sibling) in ${spaceStatusPath}`);
    }
  }
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialise or reinitialise the Space workspace in the current directory')
    .option('--skip-install', 'Skip package manager install after init')
    .option(
      '--mode <layout>',
      'Workspace layout: sibling (dedicated repo) or embedded (inside host repo)',
    )
    .action(async (opts: { skipInstall?: boolean; mode?: string }) => {
      if (opts.mode !== undefined && opts.mode !== 'embedded' && opts.mode !== 'sibling') {
        console.error(pc.red(`space: --mode must be "sibling" or "embedded", got "${opts.mode}"`));
        process.exit(1);
      }
      const mode = opts.mode as WorkspaceLayout | undefined;
      try {
        await runInit({ skipInstall: opts.skipInstall, mode });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(pc.red(`space: ${msg}`));
        process.exit(1);
      }
    });
}

// ---------------------------------------------------------------------------
// Layout resolution
// ---------------------------------------------------------------------------

/**
 * Determines the workspace layout from state, --mode flag, and detection.
 * For complete workspaces the existing layout from .space/config always wins
 * and a warning is emitted when the flag conflicts. For partial/greenfield,
 * the flag takes precedence; otherwise layout is auto-detected.
 */
async function resolveLayout(
  state: WorkspaceState,
  targetDir: string,
  flagMode: WorkspaceLayout | undefined,
): Promise<WorkspaceLayout> {
  if (state === 'complete') {
    const existingLayout = (await readExistingLayout(targetDir)) ?? 'sibling';
    if (flagMode !== undefined && flagMode !== existingLayout) {
      console.warn(
        `  ${pc.yellow('Warning:')} Workspace is already ${existingLayout}; --mode flag ignored`,
      );
    }
    return existingLayout;
  }

  if (flagMode !== undefined) {
    return flagMode;
  }

  return await detectWorkspaceLayout(targetDir);
}

// ---------------------------------------------------------------------------
// Git clean check (embedded-mode only)
// ---------------------------------------------------------------------------

/**
 * Throws when the target directory is a git repo with uncommitted changes.
 * Silent when git is unavailable, the dir is not a repo, or the tree is clean.
 *
 * This function always throws — there is no interactive "continue?" prompt —
 * because this package does not depend on @inquirer/prompts. The interactive
 * warn-and-continue path is only implemented in the create-space package,
 * which does have an interactive runtime.
 */
function assertGitClean(targetDir: string): void {
  const result = spawnSync('git', ['status', '--porcelain'], {
    cwd: targetDir,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.error || result.status !== 0) return;
  const dirty = (result.stdout as Buffer).toString().trim().length > 0;
  if (dirty) {
    throw new Error(
      'Target directory has uncommitted git changes. ' +
        'Commit or stash them before running embedded init.',
    );
  }
}

// ---------------------------------------------------------------------------
// Embedded-mode package.json helpers (not shared with upgrade; stay here)
// ---------------------------------------------------------------------------

const SPACE_POSTINSTALL = 'space skills sync';

/**
 * Merges Space devDependencies into the host package.json in embedded mode.
 * Adds @daddia/space and @daddia/skills; adds a postinstall for skills sync
 * if absent; warns when a non-Space postinstall already exists. Creates a
 * minimal package.json when none exists. Throws on invalid JSON.
 */
async function ensureEmbeddedPackageJsonDeps(targetDir: string): Promise<void> {
  const pkgPath = path.join(targetDir, 'package.json');

  let raw: string | null = null;
  try {
    raw = await fs.readFile(pkgPath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  if (raw === null) {
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

  const scripts = { ...((pkg['scripts'] as Record<string, string> | undefined) ?? {}) };
  const existingPostinstall = scripts['postinstall'];
  if (!existingPostinstall) {
    scripts['postinstall'] = SPACE_POSTINSTALL;
    pkg['scripts'] = scripts;
    changed = true;
  } else if (existingPostinstall !== SPACE_POSTINSTALL) {
    console.warn(
      `  ${pc.yellow('Warning:')} scripts.postinstall is already "${existingPostinstall}". ` +
        `Add "${SPACE_POSTINSTALL}" manually if skills auto-sync is needed.`,
    );
  }

  if (!changed) return;
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Embedded-mode .gitignore managed block (not shared with upgrade; stay here)
// ---------------------------------------------------------------------------

// These constants are intentionally duplicated in the create-space package (template.ts).
// The two packages may not import from each other (dependency rules). Keep both
// copies identical; if the managed lines change, update both files together.
const GITIGNORE_MARKER_START = '# >>> @daddia/space — managed block, do not edit between markers';
const GITIGNORE_MARKER_END = '# <<< @daddia/space';
const GITIGNORE_MANAGED_LINES = [
  '.space/sources/',
  '.space/cache/',
  '.space/.update-cache.json',
  'runs/',
  'node_modules/',
  '.cursor/skills',
  '.claude/skills',
];

function buildManagedBlock(): string {
  return [GITIGNORE_MARKER_START, ...GITIGNORE_MANAGED_LINES, GITIGNORE_MARKER_END, ''].join('\n');
}

/**
 * Ensures that the host .gitignore contains a Space-managed marker block.
 * Appends when absent; updates in-place on reinit; backs up and replaces on
 * unreadable file.
 */
async function ensureGitignoreManagedBlock(targetDir: string): Promise<void> {
  const gitignorePath = path.join(targetDir, '.gitignore');

  let existing: string;
  try {
    existing = await fs.readFile(gitignorePath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.writeFile(gitignorePath, buildManagedBlock());
      return;
    }
    const backupPath = path.join(path.dirname(gitignorePath), '.gitignore.bak');
    try {
      await fs.copyFile(gitignorePath, backupPath);
    } catch {
      // best-effort backup
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
    const before = existing.slice(0, startIdx);
    const afterMarker = existing.slice(endIdx + GITIGNORE_MARKER_END.length);
    await fs.writeFile(
      gitignorePath,
      before + buildManagedBlock() + afterMarker.replace(/^\n/, ''),
    );
  } else {
    const separator = existing.endsWith('\n') ? '\n' : '\n\n';
    await fs.writeFile(gitignorePath, existing + separator + buildManagedBlock());
  }
}

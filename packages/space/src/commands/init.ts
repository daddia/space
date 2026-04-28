import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Command } from 'commander';
import pc from 'picocolors';
import { detectWorkspaceState, readExistingLayout } from '../helpers/workspace-state.js';
import { detectWorkspaceLayout } from '../helpers/workspace-layout.js';
import type { WorkspaceLayout } from '../helpers/workspace-layout.js';
import type { WorkspaceState } from '../helpers/workspace-state.js';

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

  const configTemplatePath = layout === 'embedded'
    ? path.join(templateDir, 'embedded', '.space', 'config')
    : path.join(templateDir, '.space', 'config');

  await mergeOrCreateConfig(targetDir, configTemplatePath);

  if (layout === 'embedded') {
    await ensureEmbeddedPackageJsonDeps(targetDir);
    await ensureGitignoreManagedBlock(targetDir);
  } else {
    await ensurePackageJsonDeps(targetDir);
  }

  await createAgentSymlinks(targetDir);

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
    .option('--mode <layout>', 'Workspace layout: sibling (dedicated repo) or embedded (inside host repo)')
    .action(async (opts: { skipInstall?: boolean; mode?: string }) => {
      const mode = opts.mode === 'embedded' || opts.mode === 'sibling'
        ? (opts.mode as WorkspaceLayout)
        : undefined;
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
// Git clean check
// ---------------------------------------------------------------------------

/**
 * Throws when the target directory is a git repo with uncommitted changes.
 * Silent when git is unavailable, the dir is not a repo, or the tree is clean.
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
// Config merge
// ---------------------------------------------------------------------------

/**
 * Creates .space/config from the template when it does not exist.
 * When it does exist, merges any top-level keys that are absent from the
 * existing file by appending the missing blocks. The existing file content
 * is preserved byte-for-byte — no YAML round-trip, so comments and key
 * ordering are never lost.
 */
async function mergeOrCreateConfig(targetDir: string, templateConfigPath: string): Promise<void> {
  const configPath = path.join(targetDir, '.space', 'config');
  const templateContent = await fs.readFile(templateConfigPath, 'utf-8');

  let existing: string;
  try {
    existing = await fs.readFile(configPath, 'utf-8');
  } catch {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, templateContent);
    return;
  }

  const existingKeys = extractTopLevelKeys(existing);
  const templateBlocks = splitIntoTopLevelBlocks(templateContent);

  const blocksToAppend = templateBlocks.filter(({ key }) => !existingKeys.has(key));
  if (blocksToAppend.length === 0) return;

  const suffix = blocksToAppend.map(({ block }) => block).join('\n');
  const separator = existing.endsWith('\n') ? '\n' : '\n\n';
  await fs.writeFile(configPath, existing + separator + suffix);
}

/**
 * Returns the set of top-level YAML key names found in content.
 * Uses a line scan rather than a YAML parser so that comments and block
 * scalars are never misread as structure. The trade-off: a key name that
 * appears inside a quoted scalar or block scalar value at column 0 would
 * be misclassified, but the .space/config shape never has such values.
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

// ---------------------------------------------------------------------------
// Package.json helpers
// ---------------------------------------------------------------------------

/**
 * Adds @daddia/space and @daddia/skills to devDependencies when not present.
 * Creates a minimal package.json if none exists. Used for sibling-mode init.
 */
async function ensurePackageJsonDeps(targetDir: string): Promise<void> {
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
// .gitignore managed block
// ---------------------------------------------------------------------------

const GITIGNORE_MARKER_START =
  '# >>> @daddia/space — managed block, do not edit between markers';
const GITIGNORE_MARKER_END = '# <<< @daddia/space';
const GITIGNORE_MANAGED_LINES = [
  '.space/sources/',
  '.space/cache/',
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
    try {
      await fs.copyFile(gitignorePath, gitignorePath + '.bak');
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

// ---------------------------------------------------------------------------
// Agent symlinks, install
// ---------------------------------------------------------------------------

async function createAgentSymlinks(targetDir: string): Promise<void> {
  for (const agentDir of ['.cursor', '.claude']) {
    const dir = path.join(targetDir, agentDir);
    await fs.mkdir(dir, { recursive: true });
    await forceSymlink('../node_modules/@daddia/skills', path.join(dir, 'skills'));
  }
}

async function forceSymlink(target: string, linkPath: string): Promise<void> {
  try {
    await fs.symlink(target, linkPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    await fs.rm(linkPath, { force: true });
    await fs.symlink(target, linkPath);
  }
}

/**
 * Detects the package manager in use by checking for lockfiles. Prefers
 * pnpm, then yarn, then bun; falls back to npm when no lockfile is found.
 */
export async function detectPackageManager(
  targetDir: string,
): Promise<'npm' | 'pnpm' | 'yarn' | 'bun'> {
  const candidates: Array<[string, 'npm' | 'pnpm' | 'yarn' | 'bun']> = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm'],
  ];
  for (const [lockfile, pm] of candidates) {
    try {
      await fs.access(path.join(targetDir, lockfile));
      return pm;
    } catch {
      // lockfile not present, try next
    }
  }
  return 'npm';
}

async function runInstall(targetDir: string): Promise<void> {
  const pm = await detectPackageManager(targetDir);
  const result = spawnSync(pm, ['install'], {
    cwd: targetDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development', ADBLOCK: '1', DISABLE_OPENCOLLECTIVE: '1' },
  });

  if (result.status !== 0) {
    console.log(`  ${pc.yellow('Skipped')} install (${pm} install failed)`);
    console.log(`  Run ${pc.cyan(`${pm} install`)} manually to install dependencies.`);
  }
}

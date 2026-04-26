import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Command } from 'commander';
import pc from 'picocolors';
import { detectWorkspaceState } from '../helpers/workspace-state.js';

export interface InitOptions {
  targetDir?: string;
  skipInstall?: boolean;
}

export async function runInit(options: InitOptions = {}): Promise<void> {
  const targetDir = path.resolve(options.targetDir ?? process.cwd());
  const templateDir = path.join(import.meta.dirname, '..', '..', 'template');

  const state = await detectWorkspaceState(targetDir);

  await mergeOrCreateConfig(targetDir, path.join(templateDir, '.space', 'config'));
  await ensurePackageJsonDeps(targetDir);
  await createAgentSymlinks(targetDir);

  if (!options.skipInstall) {
    await runInstall(targetDir);
  }

  const spaceStatusPath = `${path.join(targetDir, '.space')}/`;

  if (state === 'greenfield') {
    console.log(`Initialized empty Space workspace in ${spaceStatusPath}`);
  } else {
    console.log(`Reinitialized existing Space workspace in ${spaceStatusPath}`);
  }
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialise or reinitialise the Space workspace in the current directory')
    .option('--skip-install', 'Skip package manager install after init')
    .action(async (opts: { skipInstall?: boolean }) => {
      try {
        await runInit({ skipInstall: opts.skipInstall });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(pc.red(`space: ${msg}`));
        process.exit(1);
      }
    });
}

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

/**
 * Adds @tpw/space and @tpw/skills to devDependencies in the target
 * package.json if they are not already present. Creates a minimal
 * package.json if none exists.
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

  if (!('@tpw/space' in devDeps)) {
    devDeps['@tpw/space'] = '*';
    changed = true;
  }
  if (!('@tpw/skills' in devDeps)) {
    devDeps['@tpw/skills'] = '*';
    changed = true;
  }

  if (!changed) return;

  pkg['devDependencies'] = devDeps;
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

async function createAgentSymlinks(targetDir: string): Promise<void> {
  for (const agentDir of ['.cursor', '.claude']) {
    const dir = path.join(targetDir, agentDir);
    await fs.mkdir(dir, { recursive: true });
    await forceSymlink('../node_modules/@tpw/skills', path.join(dir, 'skills'));
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

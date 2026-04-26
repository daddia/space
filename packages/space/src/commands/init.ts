import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Command } from 'commander';
import pc from 'picocolors';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
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
    runInstall(targetDir);
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
    .action(async () => {
      try {
        await runInit();
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
 * existing file without touching existing values.
 */
async function mergeOrCreateConfig(targetDir: string, templateConfigPath: string): Promise<void> {
  const configPath = path.join(targetDir, '.space', 'config');
  const templateContent = await fs.readFile(templateConfigPath, 'utf-8');

  let existing: string;
  try {
    existing = await fs.readFile(configPath, 'utf-8');
  } catch {
    // Config does not exist — write fresh from template
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, templateContent);
    return;
  }

  let existingData: Record<string, unknown>;
  try {
    const parsed = parseYaml(existing);
    existingData =
      parsed != null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    // Unparseable YAML — leave untouched to avoid data loss
    return;
  }

  let templateData: Record<string, unknown>;
  try {
    const parsed = parseYaml(templateContent);
    templateData =
      parsed != null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return;
  }

  let changed = false;
  for (const [key, value] of Object.entries(templateData)) {
    if (!(key in existingData)) {
      existingData[key] = value;
      changed = true;
    }
  }

  if (changed) {
    await fs.writeFile(configPath, stringifyYaml(existingData));
  }
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

function runInstall(targetDir: string): void {
  const result = spawnSync('npm', ['install'], {
    cwd: targetDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development', ADBLOCK: '1', DISABLE_OPENCOLLECTIVE: '1' },
  });

  if (result.status !== 0) {
    console.log(`  ${pc.yellow('Skipped')} install (npm install failed)`);
    console.log(`  Run ${pc.cyan('npm install')} manually to install dependencies.`);
  }
}

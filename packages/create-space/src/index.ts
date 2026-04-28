#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';
import { resolveConfig, type CliOptions } from './config.js';
import { createSpace } from './create-space.js';

const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf-8')) as {
  name: string;
  version: string;
};

const handleSignal = () => {
  process.stdout.write('\x1B[?25h');
  process.stdout.write('\n');
  process.exit(1);
};

process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);

async function checkForUpdate(): Promise<{ latest: string } | null> {
  try {
    const mod = await import('update-check');
    const check = (mod.default ?? mod) as unknown as (
      pkg: object,
    ) => Promise<{ latest: string } | null>;
    return await check(pkg);
  } catch {
    return null;
  }
}

const update = checkForUpdate();

async function notifyUpdate(): Promise<void> {
  try {
    const result = await update;
    if (result?.latest) {
      console.log(
        pc.yellow(pc.bold(`A new version of \`${pkg.name}\` is available!`)) +
          '\n' +
          'You can update by running: ' +
          pc.cyan(`npx ${pkg.name}@latest`) +
          '\n',
      );
    }
  } catch {
    // silently ignore
  }
}

const program = new Command();

program
  .name(pkg.name)
  .description('Scaffold a new daddia delivery workspace')
  .version(pkg.version, '-V, --version', 'Output the current version.')
  .argument('[project-name]', 'Name of the project')
  .usage('[project-name] [options]')
  .helpOption('-h, --help', 'Display this help message.')
  .option('--dir <path>', 'Target directory (defaults to ./<project-name>-space)')
  .option('--key <key>', 'Project key override')
  .option('-y, --yes', 'Use defaults for all prompts')
  .option('--use-npm', 'Use npm for installation')
  .option('--use-pnpm', 'Use pnpm for installation')
  .option('--use-yarn', 'Use Yarn for installation')
  .option('--use-bun', 'Use Bun for installation')
  .option('--skip-install', 'Skip dependency installation')
  .option('--disable-git', 'Skip git repository initialisation')
  .option('--profile <name>', 'Skill profile to activate (minimal, domain-team, platform, full)')
  .option(
    '--mode <layout>',
    'Workspace layout: sibling (dedicated repo) or embedded (inside host repo)',
  )
  .action(async (projectName: string | undefined, options: CliOptions) => {
    if (options.mode !== undefined && options.mode !== 'embedded' && options.mode !== 'sibling') {
      console.error(
        pc.red(`--mode must be "sibling" or "embedded", got "${String(options.mode)}"`),
      );
      process.exit(1);
    }
    try {
      const config = await resolveConfig(projectName, options);
      await createSpace(config, options);
    } catch (err) {
      console.error(pc.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

await program.parseAsync();

await notifyUpdate();

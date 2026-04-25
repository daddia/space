import fs from 'node:fs/promises';
import path from 'node:path';
import { confirm } from '@inquirer/prompts';
import pc from 'picocolors';
import type { SpaceConfig, LlmProvider } from './config.js';
import { getLlmConfig, buildSourceRepo, shouldSkipPrompts, type CliOptions } from './config.js';
import { renderTemplate, type TemplateVars } from './template.js';
import { validateProjectName, validateTargetDir } from './helpers/validate.js';
import { tryGitInit } from './helpers/git.js';
import { tryInstall } from './helpers/install.js';
import { getOnline } from './helpers/is-online.js';

interface SourceInfo {
  sourcePath: string;
  sourceExists: boolean;
  gitRemote: string | null;
}

async function detectSource(
  project: string,
  targetDir: string,
  skipPrompts: boolean,
): Promise<SourceInfo> {
  const absTarget = path.resolve(targetDir);
  const parentDir = path.dirname(absTarget);
  const sourcePath = path.join(parentDir, project);
  const relPath = `../${project}`;

  let sourceExists = false;
  try {
    const stat = await fs.stat(sourcePath);
    sourceExists = stat.isDirectory();
  } catch {
    // does not exist
  }

  let gitRemote: string | null = null;
  if (sourceExists) {
    try {
      const gitConfigPath = path.join(sourcePath, '.git', 'config');
      const gitConfig = await fs.readFile(gitConfigPath, 'utf-8');
      const match = gitConfig.match(/url\s*=\s*(.+)/);
      if (match) {
        gitRemote = match[1]!.trim();
      }
    } catch {
      // no .git or unreadable
    }
  }

  if (!sourceExists) {
    if (skipPrompts) {
      await fs.mkdir(sourcePath, { recursive: true });
      console.log(`${pc.cyan('>>>')} Created source directory at ${pc.bold(relPath)}`);
      sourceExists = true;
    } else {
      const create = await confirm({
        message: `Source repo ${pc.bold(relPath)} not found. Create it?`,
        default: true,
      });
      if (create) {
        await fs.mkdir(sourcePath, { recursive: true });
        console.log(`${pc.cyan('>>>')} Created source directory at ${pc.bold(relPath)}`);
        sourceExists = true;
      }
    }
  } else {
    console.log(`${pc.cyan('>>>')} Found source directory at ${pc.bold(relPath)}`);
  }

  return { sourcePath: relPath, sourceExists, gitRemote };
}

function getAgentDirs(llmProvider: LlmProvider): string[] {
  switch (llmProvider) {
    case 'anthropic':
      return ['.cursor', '.claude'];
    case 'openai':
    case 'cursor':
      return ['.cursor'];
    case 'other':
    default:
      return ['.cursor', '.claude'];
  }
}

export async function createSpace(config: SpaceConfig, options: CliOptions = {}): Promise<void> {
  const nameResult = validateProjectName(config.projectName);
  if (!nameResult.valid) {
    throw new Error(nameResult.reason);
  }

  const absTarget = path.resolve(config.targetDir);

  const dirResult = await validateTargetDir(config.targetDir);
  if (!dirResult.valid) {
    throw new Error(dirResult.reason);
  }

  const skipPrompts = shouldSkipPrompts(options);

  console.log();
  console.log(`${pc.cyan('>>>')} Creating a space workspace at ${pc.bold(config.targetDir)} ...`);
  console.log();
  console.log(`  Project name:  ${pc.cyan(config.projectName)}`);
  console.log(`  Project key:   ${pc.cyan(config.projectKey)}`);
  console.log();

  const source = await detectSource(config.project, config.targetDir, skipPrompts);

  const llmConfig = getLlmConfig(config.llmProvider);
  const sourceRepo = buildSourceRepo(config.sourceProvider, config.project);

  const vars: TemplateVars = {
    projectName: config.projectName,
    projectKey: config.projectKey,
    project: config.project,
    sourceRepo: sourceRepo,
    sourcePath: source.sourcePath,
    llmDefaultModel: llmConfig.defaultModel,
    llmProviders: llmConfig.providers,
  };

  console.log(`Initializing workspace with template: ${pc.cyan('default')}`);
  console.log();

  const templateDir = path.join(import.meta.dirname, '..', 'template');
  await renderTemplate(templateDir, absTarget, vars);

  console.log('Creating product artifacts');
  console.log(`  - ${pc.bold('product/product.md')}`);
  console.log(`  - ${pc.bold('product/roadmap.md')}`);
  console.log(`  - ${pc.bold('product/backlog.md')}`);
  console.log();

  console.log('Creating architecture artifacts');
  console.log(`  - ${pc.bold('architecture/solution.md')}`);
  console.log(`  - ${pc.bold('architecture/decisions/register.md')}`);
  console.log();

  if (config.skipInstall) {
    console.log(`${pc.yellow('Skipped')} install (--skip-install)`);
  } else {
    console.log(`Installing dependencies (using ${pc.cyan(config.packageManager)})`);
    console.log(`  - ${pc.bold('@daddia/skills')}`);
    const isOnline = await getOnline();
    tryInstall(absTarget, config.packageManager, isOnline);
  }
  console.log();

  const agentDirs = getAgentDirs(config.llmProvider);
  console.log('Creating agent resources');
  console.log(`  - ${pc.bold('AGENTS.md')}`);
  for (const dir of agentDirs) {
    await createAgentDir(absTarget, dir);
    console.log(`  - ${pc.bold(`${dir}/skills`)} -> @daddia/skills`);
  }
  console.log();

  if (config.disableGit) {
    console.log(`${pc.yellow('Skipped')} git init (--disable-git)`);
  } else {
    const didInit = tryGitInit(absTarget);
    if (didInit) {
      console.log(`${pc.cyan('>>>')} Initialized a git repository.`);
    }
  }
  console.log();

  console.log(
    `${pc.cyan('>>>')} ${pc.bold(pc.green('Success!'))} Created ${pc.bold(config.targetDir)} at ${pc.green(absTarget)}`,
  );
  console.log();

  const needsSourceSetup = !source.gitRemote;
  const needsWorkspaceSetup = config.skipInstall || config.disableGit || !source.gitRemote;

  if (needsSourceSetup || needsWorkspaceSetup) {
    console.log(pc.bold('To get started:'));
    console.log();
  }

  let step = 1;

  if (needsSourceSetup) {
    console.log(pc.bold(`  ${step}. Set up your source code repository`));
    console.log(`     ${pc.cyan(`cd ${source.sourcePath}`)}`);
    console.log(`     ${pc.cyan('git init')} or ${pc.cyan('git clone <url>')}`);
    console.log();
    step++;
  }

  if (needsWorkspaceSetup) {
    console.log(pc.bold(`  ${step}. Configure your workspace`));
    console.log(`     ${pc.cyan(`cd ${config.targetDir}`)}`);

    if (config.skipInstall) {
      console.log(`     ${pc.cyan(`${config.packageManager} install`)}`);
    }

    if (config.disableGit) {
      console.log(`     ${pc.cyan('git init')}`);
    }

    if (!source.gitRemote) {
      console.log(`     ${pc.cyan('git remote add origin <url>')}`);
      if (config.sourceProvider !== 'none') {
        console.log(
          `     Edit ${pc.cyan('.space/config')} -- update source.repo with your ${config.sourceProvider} org`,
        );
      }
    }
    console.log();
  }

  if (!needsSourceSetup && !needsWorkspaceSetup) {
    console.log(`  ${pc.cyan(`cd ${config.targetDir}`)}`);
    console.log();
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

async function createAgentDir(targetDir: string, dirName: string): Promise<void> {
  const dir = path.join(targetDir, dirName);
  await fs.mkdir(dir, { recursive: true });
  const skillsTarget = '../node_modules/@daddia/skills';
  await forceSymlink(skillsTarget, path.join(dir, 'skills'));
}

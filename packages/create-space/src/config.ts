import { input, select, confirm } from '@inquirer/prompts';
import { isCI } from 'ci-info';
import pc from 'picocolors';
import { resolvePackageManager, type PackageManager } from './helpers/pkg-manager.js';
import type { WorkspaceLayout } from './helpers/workspace-layout.js';

export type { PackageManager } from './helpers/pkg-manager.js';
export type { WorkspaceLayout } from './helpers/workspace-layout.js';

export type SourceProvider = 'github' | 'gitlab' | 'bitbucket' | 'none';
export type LlmProvider = 'anthropic' | 'openai' | 'cursor' | 'other';

export const VALID_PROFILES = ['minimal', 'domain-team', 'platform', 'full'] as const;
export type ValidProfile = (typeof VALID_PROFILES)[number];

export const PROFILE_DESCRIPTIONS: Record<ValidProfile, string> = {
  minimal: 'minimal      — essential skills only',
  'domain-team': 'domain-team  — delivery team defaults',
  platform: 'platform    — platform engineering',
  full: 'full        — all available skills',
};

export interface SpaceConfig {
  projectName: string;
  projectKey: string;
  project: string;
  targetDir: string;
  sourceProvider: SourceProvider;
  llmProvider: LlmProvider;
  packageManager: PackageManager;
  skipInstall: boolean;
  disableGit: boolean;
  profile?: string;
  layout?: WorkspaceLayout;
}

export interface CliOptions {
  dir?: string;
  key?: string;
  yes?: boolean;
  useNpm?: boolean;
  usePnpm?: boolean;
  useYarn?: boolean;
  useBun?: boolean;
  skipInstall?: boolean;
  disableGit?: boolean;
  profile?: string;
  mode?: WorkspaceLayout;
}

export function deriveDefaults(projectName: string) {
  return {
    projectKey: projectName.toUpperCase().replace(/[^A-Z0-9]/g, '-'),
    project: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    targetDir: `${projectName}-space`,
  };
}

export function shouldSkipPrompts(options: CliOptions): boolean {
  return !!options.yes || isCI || options.key !== undefined;
}

const LLM_CONFIGS: Record<LlmProvider, { defaultModel: string; providers: string }> = {
  anthropic: {
    defaultModel: 'claude-sonnet',
    providers: [
      '    anthropic:',
      '      api_key_env: ANTHROPIC_API_KEY',
      '      models:',
      '        claude-sonnet: claude-sonnet-4-20250514',
    ].join('\n'),
  },
  openai: {
    defaultModel: 'gpt-4o',
    providers: [
      '    openai:',
      '      api_key_env: OPENAI_API_KEY',
      '      models:',
      '        gpt-4o: gpt-4o',
    ].join('\n'),
  },
  cursor: {
    defaultModel: 'cursor',
    providers: [
      '    cursor:',
      '      api_key_env: CURSOR_API_KEY',
      '      models:',
      '        cursor: cursor',
    ].join('\n'),
  },
  other: {
    defaultModel: 'default',
    providers: [
      '    # Configure your LLM provider:',
      '    # provider-name:',
      '    #   api_key_env: YOUR_API_KEY',
      '    #   models:',
      '    #     model-alias: provider-model-id',
    ].join('\n'),
  },
};

export function getLlmConfig(provider: LlmProvider) {
  return LLM_CONFIGS[provider];
}

export function buildSourceRepo(provider: SourceProvider, project: string): string {
  if (provider === 'none') return project;
  return `${provider}:${project}`;
}

export async function resolveConfig(
  projectName: string | undefined,
  options: CliOptions,
): Promise<SpaceConfig> {
  const skipPrompts = shouldSkipPrompts(options);

  if (!projectName && skipPrompts) {
    throw new Error(
      'Project name is required when using --yes or running in CI.\n\n' +
        `  Usage: create-space <project-name> --yes\n`,
    );
  }

  const name =
    projectName ??
    (await input({
      message: 'Project name',
      required: true,
      validate: (v) => (v.trim() ? true : 'Project name is required'),
    }));

  const defaults = deriveDefaults(name);

  let projectKey: string;
  if (options.key) {
    projectKey = options.key;
  } else if (skipPrompts) {
    projectKey = defaults.projectKey;
  } else {
    const customizeKey = await confirm({
      message: `Would you like to customize the project key? (${pc.cyan(defaults.projectKey)})`,
      default: false,
    });
    projectKey = customizeKey
      ? await input({
          message: 'Project key',
          default: defaults.projectKey,
          validate: (v) => (v.trim() ? true : 'Project key is required'),
        })
      : defaults.projectKey;
  }

  let sourceProvider: SourceProvider;
  if (skipPrompts) {
    sourceProvider = 'github';
  } else {
    const useGithub = await confirm({
      message: `Would you like to use ${pc.bold('GitHub')} for source code?`,
      default: true,
    });
    if (useGithub) {
      sourceProvider = 'github';
    } else {
      sourceProvider = await select({
        message: 'Which source code provider would you like to use?',
        choices: [
          { value: 'gitlab' as const, name: 'GitLab' },
          { value: 'bitbucket' as const, name: 'Bitbucket' },
          { value: 'none' as const, name: 'None (local only)' },
        ],
      });
    }
  }

  let llmProvider: LlmProvider;
  if (skipPrompts) {
    llmProvider = 'anthropic';
  } else {
    const useAnthropic = await confirm({
      message: `Would you like to use ${pc.bold('Anthropic (Claude)')} as your AI provider?`,
      default: true,
    });
    if (useAnthropic) {
      llmProvider = 'anthropic';
    } else {
      llmProvider = await select({
        message: 'Which AI/LLM provider would you like to use?',
        choices: [
          { value: 'openai' as const, name: 'OpenAI (GPT-4o)' },
          { value: 'cursor' as const, name: 'Cursor' },
          { value: 'other' as const, name: 'Other (configure later)' },
        ],
      });
    }
  }

  const targetDir = options.dir ?? defaults.targetDir;
  const packageManager = resolvePackageManager(options);

  let profile: string | undefined;
  if (options.profile) {
    profile = options.profile;
  } else if (!skipPrompts) {
    profile = await select<string>({
      message: 'Which skill profile would you like to use?',
      choices: VALID_PROFILES.map((p) => ({ value: p, name: PROFILE_DESCRIPTIONS[p] })),
      default: 'full',
    });
  }

  return {
    projectName: name,
    projectKey,
    project: defaults.project,
    targetDir,
    sourceProvider,
    llmProvider,
    packageManager,
    skipInstall: !!options.skipInstall,
    disableGit: !!options.disableGit,
    profile,
  };
}

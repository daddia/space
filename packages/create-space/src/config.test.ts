import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { select, confirm } from '@inquirer/prompts';
import { deriveDefaults, shouldSkipPrompts, getLlmConfig, buildSourceRepo } from './config.js';

vi.mock('ci-info', () => ({ isCI: false }));
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
}));

describe('deriveDefaults', () => {
  it('derives project key as uppercase with non-alphanumeric replaced by hyphens', () => {
    const defaults = deriveDefaults('my-cool-app');
    expect(defaults.projectKey).toBe('MY-COOL-APP');
  });

  it('derives project slug as lowercase hyphenated', () => {
    const defaults = deriveDefaults('My.Project_V2');
    expect(defaults.project).toBe('my-project-v2');
  });

  it('derives target directory as {name}-space', () => {
    const defaults = deriveDefaults('acme');
    expect(defaults.targetDir).toBe('acme-space');
  });

  it('handles single-word names', () => {
    const defaults = deriveDefaults('helm');
    expect(defaults.projectKey).toBe('HELM');
    expect(defaults.project).toBe('helm');
    expect(defaults.targetDir).toBe('helm-space');
  });
});

describe('shouldSkipPrompts', () => {
  let originalIsCI: boolean;

  beforeEach(async () => {
    const ciInfo = await import('ci-info');
    originalIsCI = ciInfo.isCI;
  });

  afterEach(async () => {
    const ciInfo = await import('ci-info');
    (ciInfo as { isCI: boolean }).isCI = originalIsCI;
  });

  it('returns true when --yes is set', () => {
    expect(shouldSkipPrompts({ yes: true })).toBe(true);
  });

  it('returns false when no flags set and not in CI', () => {
    expect(shouldSkipPrompts({})).toBe(false);
  });

  it('returns true when --key is provided', () => {
    expect(shouldSkipPrompts({ key: 'ACME' })).toBe(true);
  });

  it('returns false when only --dir is provided', () => {
    expect(shouldSkipPrompts({ dir: './custom-path' })).toBe(false);
  });

  it('returns false when only --skip-install is provided', () => {
    expect(shouldSkipPrompts({ skipInstall: true })).toBe(false);
  });

  it('returns true in CI environments', async () => {
    const ciInfo = await import('ci-info');
    (ciInfo as { isCI: boolean }).isCI = true;
    expect(shouldSkipPrompts({})).toBe(true);
  });
});

describe('getLlmConfig', () => {
  it('returns anthropic config with claude-sonnet', () => {
    const config = getLlmConfig('anthropic');
    expect(config.defaultModel).toBe('claude-sonnet');
    expect(config.providers).toContain('anthropic:');
    expect(config.providers).toContain('ANTHROPIC_API_KEY');
  });

  it('returns openai config with gpt-4o', () => {
    const config = getLlmConfig('openai');
    expect(config.defaultModel).toBe('gpt-4o');
    expect(config.providers).toContain('openai:');
  });

  it('returns cursor config', () => {
    const config = getLlmConfig('cursor');
    expect(config.defaultModel).toBe('cursor');
  });

  it('returns placeholder for other', () => {
    const config = getLlmConfig('other');
    expect(config.defaultModel).toBe('default');
    expect(config.providers).toContain('# Configure your LLM provider');
  });
});

describe('buildSourceRepo', () => {
  it('builds github repo string', () => {
    expect(buildSourceRepo('github', 'my-project')).toBe('github:my-project');
  });

  it('builds gitlab repo string', () => {
    expect(buildSourceRepo('gitlab', 'my-project')).toBe('gitlab:my-project');
  });

  it('returns just project name for none', () => {
    expect(buildSourceRepo('none', 'my-project')).toBe('my-project');
  });
});

describe('resolveConfig', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when --yes is set but no project name is provided', async () => {
    const { resolveConfig } = await import('./config.js');
    await expect(resolveConfig(undefined, { yes: true })).rejects.toThrow(
      'Project name is required',
    );
  });

  it('resolves config with defaults in --yes mode', async () => {
    const { resolveConfig } = await import('./config.js');
    const config = await resolveConfig('acme', { yes: true });
    expect(config.projectName).toBe('acme');
    expect(config.projectKey).toBe('ACME');
    expect(config.project).toBe('acme');
    expect(config.targetDir).toBe('acme-space');
    expect(config.sourceProvider).toBe('github');
    expect(config.llmProvider).toBe('anthropic');
    expect(config.skipInstall).toBe(false);
    expect(config.disableGit).toBe(false);
  });

  it('passes skipInstall and disableGit through', async () => {
    const { resolveConfig } = await import('./config.js');
    const config = await resolveConfig('acme', {
      yes: true,
      skipInstall: true,
      disableGit: true,
    });
    expect(config.skipInstall).toBe(true);
    expect(config.disableGit).toBe(true);
  });

  it('records the --profile flag value on SpaceConfig.profile', async () => {
    const { resolveConfig } = await import('./config.js');
    const config = await resolveConfig('acme', { yes: true, profile: 'minimal' });
    expect(config.profile).toBe('minimal');
  });

  it('sets profile to undefined when --profile is not provided', async () => {
    const { resolveConfig } = await import('./config.js');
    const config = await resolveConfig('acme', { yes: true });
    expect(config.profile).toBeUndefined();
  });

  it('sets profile to undefined when --profile is an empty string', async () => {
    const { resolveConfig } = await import('./config.js');
    const config = await resolveConfig('acme', { yes: true, profile: '' });
    expect(config.profile).toBeUndefined();
  });
});

describe('interactive profile prompt', () => {
  beforeEach(() => {
    vi.mocked(confirm).mockReset();
    vi.mocked(select).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('presents select prompt and stores the chosen profile', async () => {
    const { resolveConfig } = await import('./config.js');
    // confirm: "customize key?" → false; "use GitHub?" → true; "use Anthropic?" → true
    vi.mocked(confirm)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    vi.mocked(select).mockResolvedValueOnce('domain-team');

    const config = await resolveConfig('acme', {});

    expect(vi.mocked(select)).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('skill profile') }),
    );
    expect(config.profile).toBe('domain-team');
  });

  it('defaults to full when the user accepts the default at the prompt', async () => {
    const { resolveConfig } = await import('./config.js');
    vi.mocked(confirm)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    vi.mocked(select).mockResolvedValueOnce('full');

    const config = await resolveConfig('acme', {});

    expect(config.profile).toBe('full');
  });

  it('skips profile prompt when --yes is provided', async () => {
    const { resolveConfig } = await import('./config.js');

    const config = await resolveConfig('acme', { yes: true });

    expect(vi.mocked(select)).not.toHaveBeenCalled();
    expect(config.profile).toBeUndefined();
  });

  it('skips profile prompt when --profile flag is explicitly provided', async () => {
    const { resolveConfig } = await import('./config.js');
    vi.mocked(confirm)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    const config = await resolveConfig('acme', { profile: 'minimal' });

    expect(vi.mocked(select)).not.toHaveBeenCalled();
    expect(config.profile).toBe('minimal');
  });
});

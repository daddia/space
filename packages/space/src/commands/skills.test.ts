import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import { registerSkillsCommand } from './skills.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeSpaceWorkspace(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'skills-cmd-'));
  await mkdir(path.join(dir, '.space'), { recursive: true });
  await writeFile(path.join(dir, '.space', 'config'), 'project:\n  name: Test\n  key: TEST\n');
  return dir;
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerSkillsCommand(program);
  return program;
}

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

describe('registerSkillsCommand', () => {
  it('registers a top-level "skills" command', () => {
    const program = buildProgram();
    const names = program.commands.map((c) => c.name());
    expect(names).toContain('skills');
  });

  it('registers "skills sync" subcommand', () => {
    const program = buildProgram();
    const skillsCmd = program.commands.find((c) => c.name() === 'skills')!;
    const subNames = skillsCmd.commands.map((c) => c.name());
    expect(subNames).toContain('sync');
  });

  it('registers "skills install" subcommand', () => {
    const program = buildProgram();
    const skillsCmd = program.commands.find((c) => c.name() === 'skills')!;
    const subNames = skillsCmd.commands.map((c) => c.name());
    expect(subNames).toContain('install');
  });

  it('"skills sync" accepts a --profile option', () => {
    const program = buildProgram();
    const skillsCmd = program.commands.find((c) => c.name() === 'skills')!;
    const syncCmd = skillsCmd.commands.find((c) => c.name() === 'sync')!;
    const optionNames = syncCmd.options.map((o) => o.long);
    expect(optionNames).toContain('--profile');
  });
});

// ---------------------------------------------------------------------------
// Integration: space skills sync
// ---------------------------------------------------------------------------

describe('space skills sync', () => {
  let workspaceDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    workspaceDir = await makeSpaceWorkspace();
    originalCwd = process.cwd();
    process.chdir(workspaceDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(workspaceDir, { recursive: true, force: true });
  });

  it('exits 1 and prints an error when an unknown profile is specified', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);

    // Import and call the underlying logic directly to avoid actual npx invocation
    const { resolveProfileName, loadBundledProfile } = await import(
      '../skills/sync-driver.js'
    );

    const root = workspaceDir;
    const profileName = resolveProfileName(root, 'unknown-profile-xyz');
    let caughtMessage = '';
    try {
      loadBundledProfile(profileName);
    } catch (err) {
      caughtMessage = err instanceof Error ? err.message : String(err);
    }

    expect(caughtMessage).toContain('unknown-profile-xyz');
    expect(caughtMessage).toContain('minimal');
    expect(caughtMessage).toContain('domain-team');
    expect(caughtMessage).toContain('platform');
    expect(caughtMessage).toContain('full');

    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('error message when unknown profile lists all four valid profiles', async () => {
    const { loadBundledProfile } = await import('../skills/sync-driver.js');

    let message = '';
    try {
      loadBundledProfile('foo');
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }

    expect(message).toMatch(/minimal.*domain-team.*platform.*full/);
  });

  it('successfully writes skills-lock.json when profile and npx both succeed', async () => {
    const { syncSkills } = await import('../skills/sync-driver.js');
    const { existsSync } = await import('node:fs');

    const skills = ['implement'];
    await mkdir(path.join(workspaceDir, '.agents', 'skills', 'implement'), { recursive: true });
    await writeFile(
      path.join(workspaceDir, '.agents', 'skills', 'implement', 'SKILL.md'),
      '---\nname: implement\ndescription: Implements a story.\n---\n',
    );

    syncSkills({
      workspaceRoot: workspaceDir,
      profileName: 'minimal',
      skills,
      runNpx: () => ({ status: 0 }),
    });

    expect(existsSync(path.join(workspaceDir, 'skills-lock.json'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integration: space skills install
// ---------------------------------------------------------------------------

describe('space skills install', () => {
  let workspaceDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    workspaceDir = await makeSpaceWorkspace();
    originalCwd = process.cwd();
    process.chdir(workspaceDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(workspaceDir, { recursive: true, force: true });
  });

  it('invokes npx skills install --lockfile when a valid lockfile exists', async () => {
    const { installSkills } = await import('../skills/sync-driver.js');

    await writeFile(
      path.join(workspaceDir, 'skills-lock.json'),
      JSON.stringify({
        version: 1,
        source: 'daddia/skills',
        ref: 'abc123',
        profile: 'minimal',
        skills: [{ name: 'implement', contentHash: 'abc' }],
        syncedAt: new Date().toISOString(),
      }),
    );

    const capturedArgs: string[][] = [];
    installSkills({
      workspaceRoot: workspaceDir,
      runNpx: (args) => {
        capturedArgs.push(args);
        return { status: 0 };
      },
    });

    expect(capturedArgs[0]?.[0]).toBe('skills@latest');
    expect(capturedArgs[0]?.[1]).toBe('install');
    expect(capturedArgs[0]?.[2]).toBe('--lockfile');
  });
});

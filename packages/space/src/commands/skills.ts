import type { Command } from 'commander';
import pc from 'picocolors';
import { findWorkspaceRoot } from '../config.js';
import {
  resolveProfileName,
  loadBundledProfile,
  syncSkills,
  installSkills,
  UnknownProfileError,
  MalformedProfileFileError,
} from '../skills/sync-driver.js';

export function registerSkillsCommand(program: Command): void {
  const skillsCmd = program
    .command('skills')
    .description('Manage skills in the workspace');

  skillsCmd
    .command('sync')
    .description('Sync skills into the workspace using a profile')
    .option('--profile <name>', 'Profile to use (overrides .space/profile.yaml)')
    .action((opts: { profile?: string }) => {
      try {
        const root = findWorkspaceRoot();
        const profileName = resolveProfileName(root, opts.profile);
        const skillNames = loadBundledProfile(profileName);
        syncSkills({ workspaceRoot: root, profileName, skills: skillNames });
      } catch (err) {
        if (err instanceof UnknownProfileError || err instanceof MalformedProfileFileError) {
          process.stderr.write(pc.red(`space: ${err.message}\n`));
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          process.stderr.write(pc.red(`space: ${msg}\n`));
        }
        process.exit(1);
      }
    });

  skillsCmd
    .command('install')
    .description('Restore skills from skills-lock.json')
    .action(() => {
      try {
        const root = findWorkspaceRoot();
        installSkills({ workspaceRoot: root });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(pc.red(`space: ${msg}\n`));
        process.exit(1);
      }
    });
}

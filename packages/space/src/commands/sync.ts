import type { Command } from 'commander';
import pc from 'picocolors';
import { findWorkspaceRoot, loadConfig, ConfigError } from '../config.js';
import { loadCredentials } from '../credentials.js';
import { syncJira } from '../providers/jira/sync.js';
import {
  resolveProfileName,
  loadSkillsProfile,
  syncSkillsWithProfile,
  SkillsProfileNotFoundError,
} from '../skills/sync.js';

export function registerSyncCommand(program: Command): void {
  const sync = program.command('sync').description('Sync external sources into .space/sources/');

  sync
    .command('skills')
    .description('Sync @tpw/skills into the workspace, filtered to a profile')
    .option('--profile <name>', 'Profile to activate (overrides .space/profile.yaml)')
    .action(async (opts: { profile?: string }) => {
      try {
        const root = findWorkspaceRoot();
        const profileName = resolveProfileName(root, opts.profile);
        const skills = loadSkillsProfile(root, profileName);
        await syncSkillsWithProfile(root, profileName, skills);
      } catch (err) {
        if (err instanceof SkillsProfileNotFoundError) {
          process.stderr.write(pc.red(`space: ${err.message}\n`));
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          process.stderr.write(pc.red(`space: ${msg}\n`));
        }
        process.exit(1);
      }
    });

  sync
    .command('jira')
    .description('Sync Jira project into .space/sources/jira/')
    .action(async () => {
      try {
        const root = findWorkspaceRoot();
        const config = loadConfig(root);
        const credentials = loadCredentials(root);

        if (!config.sources?.issues) {
          throw new ConfigError(
            'sources.issues is not configured in .space/config -- ' +
              'add a sources.issues block with provider, base_url, and project',
          );
        }

        console.log(pc.cyan('syncing jira...'));
        await syncJira({
          sourceConfig: config.sources.issues,
          credentials,
          workspaceRoot: root,
        });
        console.log(pc.green('jira synced'));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(pc.red(`space: ${msg}`));
        process.exit(1);
      }
    });

  sync
    .command('confluence')
    .description('Sync Confluence space into .space/sources/confluence/')
    .action(() => {
      console.log(pc.yellow('space sync confluence -- not yet implemented'));
    });

  sync.action(() => {
    console.log(pc.yellow('space sync -- not yet implemented'));
  });
}

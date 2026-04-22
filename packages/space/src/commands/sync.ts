import type { Command } from 'commander';
import pc from 'picocolors';
import { findWorkspaceRoot, loadConfig } from '../config.js';
import { loadCredentials } from '../credentials.js';
import { syncJira } from '../providers/jira/sync.js';

export function registerSyncCommand(program: Command): void {
  const sync = program
    .command('sync')
    .description('Sync external sources into .space/sources/');

  sync
    .command('jira')
    .description('Sync Jira project into .space/sources/jira/')
    .action(async () => {
      try {
        const root = findWorkspaceRoot();
        const config = loadConfig(root);
        const credentials = loadCredentials(root);

        if (!config.sources?.issues) {
          console.error(
            pc.red('space: sources.issues is not configured in .space/config'),
          );
          process.exit(1);
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

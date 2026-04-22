import { Command } from 'commander';
import pc from 'picocolors';

const program = new Command();

program
  .name('space')
  .description('Operate a Horizon delivery space')
  .version('0.1.0');

const sync = program
  .command('sync')
  .description('Sync external sources into .space/sources/');

sync
  .command('jira')
  .description('Sync Jira project into .space/sources/jira/')
  .action(() => {
    console.log(pc.yellow('space sync jira -- not yet implemented'));
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

program.parse();

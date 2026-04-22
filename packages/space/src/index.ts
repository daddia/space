import { Command } from 'commander';
import { registerSyncCommand } from './commands/sync.js';

const program = new Command();

program
  .name('space')
  .description('Operate a Horizon delivery space')
  .version('0.1.0');

registerSyncCommand(program);

program.parse();

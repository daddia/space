import { Command } from 'commander';
import { registerSyncCommand } from './commands/sync.js';
import { registerInitCommand } from './commands/init.js';
import { registerSkillsCommand } from './commands/skills.js';

const program = new Command();

program.name('space').description('Operate a Horizon delivery space').version('0.1.0');

registerInitCommand(program);
registerSyncCommand(program);
registerSkillsCommand(program);

program.parse();

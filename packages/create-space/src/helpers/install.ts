import spawn from 'cross-spawn';
import pc from 'picocolors';
import type { PackageManager } from './pkg-manager.js';

export function tryInstall(targetDir: string, pm: PackageManager, isOnline: boolean): void {
  const args = ['install'];
  if (!isOnline) {
    console.log(`  ${pc.yellow('You appear to be offline.')}`);
    if (pm === 'yarn') {
      args.push('--offline');
    }
  }

  const result = spawn.sync(pm, args, {
    cwd: targetDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ADBLOCK: '1',
      DISABLE_OPENCOLLECTIVE: '1',
    },
  });

  if (result.status === 0) {
    console.log(`  ${pc.green('Installed')} dependencies`);
  } else if (result.error && 'code' in result.error && result.error.code === 'ENOENT') {
    console.log(`  ${pc.yellow('Skipped')} install (${pm} not found)`);
    console.log(`  Run ${pc.cyan(`${pm} install`)} manually to install dependencies.`);
  } else {
    console.log(`  ${pc.yellow('Skipped')} install (${pm} install failed)`);
    console.log(`  Run ${pc.cyan(`${pm} install`)} manually to install dependencies.`);
  }
}

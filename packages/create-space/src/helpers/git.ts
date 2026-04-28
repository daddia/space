import { join } from 'node:path';
import { rmSync } from 'node:fs';
import spawn from 'cross-spawn';
import pc from 'picocolors';

function run(cmd: string, args: string[], cwd: string): boolean {
  const result = spawn.sync(cmd, args, { cwd, stdio: 'ignore' });
  return result.status === 0;
}

function isInGitRepository(cwd: string): boolean {
  const result = spawn.sync('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd,
    stdio: 'ignore',
  });
  return result.status === 0;
}

function isDefaultBranchSet(): boolean {
  const result = spawn.sync('git', ['config', 'init.defaultBranch'], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

/**
 * Returns true when the directory is inside a git repository that has
 * uncommitted changes (staged or unstaged). Returns false when git is
 * unavailable, the directory is not a git repo, or the tree is clean.
 */
export function hasUncommittedGitChanges(targetDir: string): boolean {
  const result = spawn.sync('git', ['status', '--porcelain'], {
    cwd: targetDir,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.error || result.status !== 0) return false;
  return (result.stdout as Buffer).toString().trim().length > 0;
}

export function tryGitInit(targetDir: string): boolean {
  let didInit = false;

  try {
    if (!run('git', ['--version'], targetDir)) {
      console.log(`  ${pc.yellow('Skipped')} git init (git not installed)`);
      return false;
    }

    if (isInGitRepository(targetDir)) {
      return false;
    }

    if (!run('git', ['init'], targetDir)) {
      console.log(`  ${pc.yellow('Skipped')} git init`);
      return false;
    }

    didInit = true;

    if (!isDefaultBranchSet()) {
      run('git', ['checkout', '-b', 'main'], targetDir);
    }

    run('git', ['add', '-A'], targetDir);
    run('git', ['commit', '-m', 'Initial commit from create-space'], targetDir);

    console.log(`  ${pc.green('Initialized')} git repository`);
    return true;
  } catch {
    if (didInit) {
      try {
        rmSync(join(targetDir, '.git'), { recursive: true, force: true });
      } catch {
        /* best-effort cleanup */
      }
    }
    console.log(`  ${pc.yellow('Skipped')} git init`);
    return false;
  }
}

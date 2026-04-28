import fs from 'node:fs/promises';
import path from 'node:path';

export type WorkspaceLayout = 'sibling' | 'embedded';

/**
 * File and directory names at a repo root that indicate the target is an
 * existing code repository rather than an empty or dedicated Space workspace.
 */
const CODE_REPO_MARKERS = [
  '.git',
  'package.json',
  'Cargo.toml',
  'pyproject.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'Gemfile',
  'requirements.txt',
] as const;

export interface DetectWorkspaceLayoutOptions {
  /**
   * Layout read from an existing .space/config. When provided, it is returned
   * immediately — layout is sticky and survives reinit runs.
   */
  existingLayout?: WorkspaceLayout;
}

/**
 * Classifies a target directory as 'sibling' (a dedicated Space repo) or
 * 'embedded' (Space as a subtree inside an existing code repository).
 *
 * Resolution order:
 *   1. existingLayout (from .space/config) — always wins; preserves layout across reinit.
 *   2. Code-repo marker scan — returns 'embedded' if any marker is found at
 *      the directory root AND the directory is not already a Space workspace.
 *   3. Default — 'sibling'.
 */
export async function detectWorkspaceLayout(
  targetDir: string,
  options?: DetectWorkspaceLayoutOptions,
): Promise<WorkspaceLayout> {
  if (options?.existingLayout !== undefined) {
    return options.existingLayout;
  }

  const absTarget = path.resolve(targetDir);

  // A complete Space workspace passed without existingLayout means the caller
  // did not read the config first. Return 'sibling' as a safe fallback rather
  // than re-detecting (detection on a complete workspace is ambiguous).
  if (await hasSpaceConfig(absTarget)) {
    return 'sibling';
  }

  for (const marker of CODE_REPO_MARKERS) {
    try {
      await fs.access(path.join(absTarget, marker));
      return 'embedded';
    } catch {
      // marker absent — check the next one
    }
  }

  return 'sibling';
}

async function hasSpaceConfig(absDir: string): Promise<boolean> {
  try {
    await fs.access(path.join(absDir, '.space', 'config'), fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

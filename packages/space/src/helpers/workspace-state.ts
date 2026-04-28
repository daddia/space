import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

import type { WorkspaceLayout } from './workspace-layout.js';

export type WorkspaceState = 'greenfield' | 'partial' | 'complete';

export type { WorkspaceLayout } from './workspace-layout.js';

/**
 * Classifies a target directory so the caller can decide whether to do a
 * fresh scaffold, an idempotent reinit, or a no-op.
 *
 * greenfield -- dir does not exist, or exists and is empty.
 * partial    -- dir exists with files, but no .space/config present.
 * complete   -- dir exists and contains a readable .space/config.
 */
export async function detectWorkspaceState(targetDir: string): Promise<WorkspaceState> {
  const absTarget = path.resolve(targetDir);

  let entries: string[];
  try {
    entries = await fs.readdir(absTarget);
  } catch {
    return 'greenfield';
  }

  if (entries.length === 0) {
    return 'greenfield';
  }

  const configPath = path.join(absTarget, '.space', 'config');
  try {
    await fs.access(configPath, fs.constants.R_OK);
    return 'complete';
  } catch {
    return 'partial';
  }
}

/**
 * Reads workspace.layout from an existing .space/config file.
 * Returns undefined when the file is absent, unreadable, or has no layout key.
 * Should only be called when detectWorkspaceState returns 'complete'.
 */
export async function readExistingLayout(targetDir: string): Promise<WorkspaceLayout | undefined> {
  const configPath = path.join(path.resolve(targetDir), '.space', 'config');
  let raw: string;
  try {
    raw = await fs.readFile(configPath, 'utf-8');
  } catch {
    return undefined;
  }
  try {
    const parsed = parse(raw) as Record<string, unknown>;
    const workspace = parsed?.['workspace'];
    if (typeof workspace === 'object' && workspace !== null && !Array.isArray(workspace)) {
      const layout = (workspace as Record<string, unknown>)['layout'];
      if (layout === 'sibling' || layout === 'embedded') return layout;
    }
  } catch {
    // malformed YAML — treat as absent layout
  }
  return undefined;
}

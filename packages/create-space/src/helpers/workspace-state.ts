import fs from 'node:fs/promises';
import path from 'node:path';

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
    // Dir does not exist
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
 * Reads workspace.layout from an existing .space/config without a full YAML
 * parser. The config format is under our control; we only ever write
 * 'sibling' or 'embedded' as the layout value.
 *
 * Returns undefined when the file is absent, unreadable, or has no layout key.
 * Should only be called when detectWorkspaceState returns 'complete'.
 */
export async function readExistingLayout(targetDir: string): Promise<WorkspaceLayout | undefined> {
  const configPath = path.join(path.resolve(targetDir), '.space', 'config');
  let content: string;
  try {
    content = await fs.readFile(configPath, 'utf-8');
  } catch {
    return undefined;
  }
  return parseLayoutFromConfig(content);
}

/**
 * Extracts workspace.layout from a raw .space/config string by walking lines.
 * Handles the indented-YAML structure we write; does not handle anchors,
 * aliases, or multi-line values — none of which we produce.
 */
function parseLayoutFromConfig(content: string): WorkspaceLayout | undefined {
  let inWorkspaceBlock = false;
  for (const line of content.split('\n')) {
    if (/^workspace:/.test(line)) {
      inWorkspaceBlock = true;
      continue;
    }
    if (inWorkspaceBlock) {
      // Any non-blank top-level key exits the workspace block
      if (line.length > 0 && !/^\s/.test(line)) {
        inWorkspaceBlock = false;
        continue;
      }
      const m = /^\s+layout:\s*(sibling|embedded)\s*$/.exec(line);
      if (m) return m[1] as WorkspaceLayout;
    }
  }
  return undefined;
}

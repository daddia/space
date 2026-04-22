import fs from 'node:fs/promises';
import path from 'node:path';
import { isFolderEmpty } from './is-folder-empty.js';

const WINDOWS_RESERVED = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

const MAX_NAME_LENGTH = 255;

export type ValidationResult = { valid: true } | { valid: false; reason: string };

export function validateProjectName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { valid: false, reason: 'Project name cannot be empty.' };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return { valid: false, reason: `Project name exceeds ${MAX_NAME_LENGTH} characters.` };
  }

  if (name.includes('/') || name.includes('\\')) {
    return { valid: false, reason: 'Project name cannot contain path separators (/ or \\).' };
  }

  if (name.includes('\0')) {
    return { valid: false, reason: 'Project name contains invalid characters.' };
  }

  if (/^\.+$/.test(name)) {
    return { valid: false, reason: 'Project name cannot be "." or "..".' };
  }

  if (WINDOWS_RESERVED.has(name.toUpperCase())) {
    return {
      valid: false,
      reason: `"${name}" is a reserved name on Windows.`,
    };
  }

  return { valid: true };
}

export async function validateTargetDir(targetDir: string): Promise<ValidationResult> {
  const absTarget = path.resolve(targetDir);
  const parentDir = path.dirname(absTarget);

  try {
    await fs.access(parentDir, fs.constants.W_OK);
  } catch {
    return {
      valid: false,
      reason: `Parent directory is not writable: ${parentDir}`,
    };
  }

  let stat;
  try {
    stat = await fs.stat(absTarget);
  } catch {
    return { valid: true };
  }

  if (!stat.isDirectory()) {
    return {
      valid: false,
      reason: `Path exists but is not a directory: ${absTarget}`,
    };
  }

  if (!(await isFolderEmpty(absTarget, path.basename(absTarget)))) {
    return {
      valid: false,
      reason: `Directory contains conflicting files: ${absTarget}`,
    };
  }

  return { valid: true };
}

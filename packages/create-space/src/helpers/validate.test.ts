import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateProjectName, validateTargetDir } from './validate.js';

describe('validateProjectName', () => {
  it('accepts a simple name', () => {
    expect(validateProjectName('acme')).toEqual({ valid: true });
  });

  it('accepts a hyphenated name', () => {
    expect(validateProjectName('my-cool-app')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    const result = validateProjectName('');
    expect(result.valid).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    const result = validateProjectName('   ');
    expect(result.valid).toBe(false);
  });

  it('rejects name with forward slash', () => {
    const result = validateProjectName('my/app');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('path separators');
  });

  it('rejects name with backslash', () => {
    const result = validateProjectName('my\\app');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('path separators');
  });

  it('rejects name with null byte', () => {
    const result = validateProjectName('my\0app');
    expect(result.valid).toBe(false);
  });

  it('rejects name exceeding 255 characters', () => {
    const result = validateProjectName('a'.repeat(256));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('255');
  });

  it('accepts name at exactly 255 characters', () => {
    expect(validateProjectName('a'.repeat(255))).toEqual({ valid: true });
  });

  it('rejects "." as a name', () => {
    const result = validateProjectName('.');
    expect(result.valid).toBe(false);
  });

  it('rejects ".." as a name', () => {
    const result = validateProjectName('..');
    expect(result.valid).toBe(false);
  });

  it('rejects Windows reserved name CON', () => {
    const result = validateProjectName('CON');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('reserved');
  });

  it('rejects Windows reserved name NUL (case-insensitive)', () => {
    const result = validateProjectName('nul');
    expect(result.valid).toBe(false);
  });

  it('accepts a name that starts with a dot', () => {
    expect(validateProjectName('.hidden')).toEqual({ valid: true });
  });
});

describe('validateTargetDir', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'cs-test-'));
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('accepts a non-existent target directory', async () => {
    const target = join(tempBase, 'new-project-space');
    const result = await validateTargetDir(target);
    expect(result).toEqual({ valid: true });
  });

  it('accepts an existing empty directory', async () => {
    const target = join(tempBase, 'empty-dir');
    await mkdir(target);
    const result = await validateTargetDir(target);
    expect(result).toEqual({ valid: true });
  });

  it('accepts a non-empty directory (non-empty dirs are no longer rejected)', async () => {
    const target = join(tempBase, 'non-empty');
    await mkdir(target);
    await writeFile(join(target, 'file.txt'), 'content');
    const result = await validateTargetDir(target);
    expect(result).toEqual({ valid: true });
  });

  it('accepts an existing directory with ignorable files', async () => {
    const target = join(tempBase, 'ignorable');
    await mkdir(target);
    await writeFile(join(target, '.DS_Store'), '');
    await writeFile(join(target, '.gitignore'), 'node_modules/\n');
    const result = await validateTargetDir(target);
    expect(result).toEqual({ valid: true });
  });

  it('rejects when parent directory does not exist', async () => {
    const target = join(tempBase, 'nonexistent-parent', 'project');
    const result = await validateTargetDir(target);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('not writable');
  });
});

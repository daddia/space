import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mergeOrCreateConfig } from './merge-config.js';

const TEMPLATE_CONTENT = 'project:\n  name: my-project\n  key: MY-PROJECT\nworkspace:\n  path: .\n';

describe('mergeOrCreateConfig', () => {
  let tempBase: string;
  let templatePath: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'mc-'));
    templatePath = join(tempBase, 'template-config');
    await writeFile(templatePath, TEMPLATE_CONTENT);
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('creates .space/config from the template when absent', async () => {
    const targetDir = join(tempBase, 'workspace');
    await mkdir(targetDir);

    await mergeOrCreateConfig(targetDir, templatePath);

    const content = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
    expect(content).toBe(TEMPLATE_CONTENT);
  });

  it('creates .space/ directory when missing', async () => {
    const targetDir = join(tempBase, 'workspace');
    await mkdir(targetDir);

    await mergeOrCreateConfig(targetDir, templatePath);

    const content = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
    expect(content).toContain('project:');
  });

  it('merges missing top-level keys into an existing config', async () => {
    const targetDir = join(tempBase, 'workspace');
    await mkdir(join(targetDir, '.space'), { recursive: true });
    const existing = 'project:\n  name: existing\n  key: EXIST\n';
    await writeFile(join(targetDir, '.space', 'config'), existing);

    await mergeOrCreateConfig(targetDir, templatePath);

    const after = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
    expect(after).toContain('workspace:');
    expect(after).toContain('name: existing');
  });

  it('does not overwrite existing key values', async () => {
    const targetDir = join(tempBase, 'workspace');
    await mkdir(join(targetDir, '.space'), { recursive: true });
    const existing = 'project:\n  name: kept\n  key: KEPT\nworkspace:\n  path: custom\n';
    await writeFile(join(targetDir, '.space', 'config'), existing);

    await mergeOrCreateConfig(targetDir, templatePath);

    const after = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
    expect(after).toBe(existing);
  });

  it('preserves comments when merging a new key', async () => {
    const targetDir = join(tempBase, 'workspace');
    await mkdir(join(targetDir, '.space'), { recursive: true });
    const existing = 'project:\n  name: test\n  key: TEST\n# important comment\n';
    await writeFile(join(targetDir, '.space', 'config'), existing);

    await mergeOrCreateConfig(targetDir, templatePath);

    const after = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
    expect(after).toContain('# important comment');
    expect(after).toContain('workspace:');
    expect(after.startsWith(existing)).toBe(true);
  });

  it('is a no-op when all template keys are already present', async () => {
    const targetDir = join(tempBase, 'workspace');
    await mkdir(join(targetDir, '.space'), { recursive: true });
    await writeFile(join(targetDir, '.space', 'config'), TEMPLATE_CONTENT);

    await mergeOrCreateConfig(targetDir, templatePath);

    const after = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
    expect(after).toBe(TEMPLATE_CONTENT);
  });
});

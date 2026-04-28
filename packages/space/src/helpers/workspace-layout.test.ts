import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectWorkspaceLayout } from './workspace-layout.js';
import { readExistingLayout } from './workspace-state.js';

describe('detectWorkspaceLayout', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'ws-layout-space-test-'));
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('returns sibling for an empty directory', async () => {
    const target = join(tempBase, 'empty');
    await mkdir(target);
    expect(await detectWorkspaceLayout(target)).toBe('sibling');
  });

  it('returns sibling for a non-existent directory', async () => {
    const target = join(tempBase, 'nonexistent');
    expect(await detectWorkspaceLayout(target)).toBe('sibling');
  });

  it('returns embedded when package.json is present at root', async () => {
    const target = join(tempBase, 'node-repo');
    await mkdir(target);
    await writeFile(join(target, 'package.json'), '{"name":"acme"}');
    expect(await detectWorkspaceLayout(target)).toBe('embedded');
  });

  it('returns embedded when .git directory is present', async () => {
    const target = join(tempBase, 'git-repo');
    await mkdir(join(target, '.git'), { recursive: true });
    expect(await detectWorkspaceLayout(target)).toBe('embedded');
  });

  it('returns embedded when Cargo.toml is present', async () => {
    const target = join(tempBase, 'rust-repo');
    await mkdir(target);
    await writeFile(join(target, 'Cargo.toml'), '[package]\nname = "acme"');
    expect(await detectWorkspaceLayout(target)).toBe('embedded');
  });

  it('returns embedded when pyproject.toml is present', async () => {
    const target = join(tempBase, 'python-repo');
    await mkdir(target);
    await writeFile(join(target, 'pyproject.toml'), '[project]');
    expect(await detectWorkspaceLayout(target)).toBe('embedded');
  });

  it('returns embedded when go.mod is present', async () => {
    const target = join(tempBase, 'go-repo');
    await mkdir(target);
    await writeFile(join(target, 'go.mod'), 'module acme');
    expect(await detectWorkspaceLayout(target)).toBe('embedded');
  });

  it('returns sibling for a complete Space workspace passed without existingLayout', async () => {
    const target = join(tempBase, 'complete-space');
    await mkdir(join(target, '.space'), { recursive: true });
    await writeFile(join(target, '.space', 'config'), 'project:\n  name: acme\n  key: ACME\n');
    expect(await detectWorkspaceLayout(target)).toBe('sibling');
  });

  it('returns existingLayout immediately when set to embedded', async () => {
    const target = join(tempBase, 'sticky-embedded');
    await mkdir(target);
    expect(await detectWorkspaceLayout(target, { existingLayout: 'embedded' })).toBe('embedded');
  });

  it('returns existingLayout immediately when set to sibling', async () => {
    const target = join(tempBase, 'sticky-sibling');
    await mkdir(target);
    await writeFile(join(target, 'package.json'), '{"name":"acme"}');
    expect(await detectWorkspaceLayout(target, { existingLayout: 'sibling' })).toBe('sibling');
  });
});

describe('readExistingLayout', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'ws-layout-read-space-test-'));
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('returns undefined when .space/config does not exist', async () => {
    const target = join(tempBase, 'no-config');
    await mkdir(target);
    expect(await readExistingLayout(target)).toBeUndefined();
  });

  it('returns embedded when workspace.layout is embedded', async () => {
    const target = join(tempBase, 'embedded-config');
    await mkdir(join(target, '.space'), { recursive: true });
    await writeFile(
      join(target, '.space', 'config'),
      'project:\n  name: acme\n  key: ACME\nworkspace:\n  path: .\n  layout: embedded\n',
    );
    expect(await readExistingLayout(target)).toBe('embedded');
  });

  it('returns sibling when workspace.layout is sibling', async () => {
    const target = join(tempBase, 'sibling-config');
    await mkdir(join(target, '.space'), { recursive: true });
    await writeFile(
      join(target, '.space', 'config'),
      'project:\n  name: acme\n  key: ACME\nworkspace:\n  path: .\n  layout: sibling\n',
    );
    expect(await readExistingLayout(target)).toBe('sibling');
  });

  it('returns undefined when workspace block has no layout key', async () => {
    const target = join(tempBase, 'no-layout-key');
    await mkdir(join(target, '.space'), { recursive: true });
    await writeFile(
      join(target, '.space', 'config'),
      'project:\n  name: acme\n  key: ACME\nworkspace:\n  path: .\n  work: work/{TASK_ID}/\n',
    );
    expect(await readExistingLayout(target)).toBeUndefined();
  });

  it('returns undefined when there is no workspace block', async () => {
    const target = join(tempBase, 'no-workspace-block');
    await mkdir(join(target, '.space'), { recursive: true });
    await writeFile(join(target, '.space', 'config'), 'project:\n  name: acme\n  key: ACME\n');
    expect(await readExistingLayout(target)).toBeUndefined();
  });

  it('returns undefined for malformed YAML', async () => {
    const target = join(tempBase, 'bad-yaml');
    await mkdir(join(target, '.space'), { recursive: true });
    await writeFile(join(target, '.space', 'config'), '{ not: valid: yaml: at: all');
    expect(await readExistingLayout(target)).toBeUndefined();
  });
});

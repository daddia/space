import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// vi is used for console.warn spy in package.json tests
import { mkdtemp, rm, writeFile, readFile, mkdir, readdir, stat, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  renderTemplate,
  ensureGitignoreManagedBlock,
  ensureEmbeddedPackageJsonDeps,
  type TemplateVars,
} from './template.js';

const VARS: TemplateVars = {
  projectName: 'My Cool App',
  projectKey: 'MY-COOL-APP',
  project: 'my-cool-app',
  sourceRepo: 'github:my-cool-app',
  sourcePath: '../my-cool-app',
  llmDefaultModel: 'claude-sonnet',
  llmProviders: '    anthropic:\n      api_key_env: ANTHROPIC_API_KEY',
};

describe('renderTemplate', () => {
  let templateRoot: string;
  let defaultDir: string;
  let targetDir: string;

  beforeEach(async () => {
    templateRoot = await mkdtemp(join(tmpdir(), 'cs-tpl-'));
    defaultDir = join(templateRoot, 'default');
    await mkdir(defaultDir);
    targetDir = await mkdtemp(join(tmpdir(), 'cs-out-'));
  });

  afterEach(async () => {
    await rm(templateRoot, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  });

  describe('content substitution', () => {
    it('substitutes all template variables in file content', async () => {
      await writeFile(
        join(defaultDir, 'README.md'),
        '# {projectName}\n\nKey: {projectKey}\nRepo: {sourceRepo}\nSlug: {project}\n',
      );

      await renderTemplate(templateRoot, targetDir, VARS);

      const content = await readFile(join(targetDir, 'README.md'), 'utf-8');
      expect(content).toBe(
        '# My Cool App\n\nKey: MY-COOL-APP\nRepo: github:my-cool-app\nSlug: my-cool-app\n',
      );
    });

    it('handles multiple occurrences of the same variable', async () => {
      await writeFile(join(defaultDir, 'config'), 'name: {projectName}\nlabel: {projectName}\n');

      await renderTemplate(templateRoot, targetDir, VARS);

      const content = await readFile(join(targetDir, 'config'), 'utf-8');
      expect(content).toBe('name: My Cool App\nlabel: My Cool App\n');
    });

    it('preserves content with no template variables', async () => {
      const raw = '# Static content\n\nNo variables here.\n';
      await writeFile(join(defaultDir, 'static.md'), raw);

      await renderTemplate(templateRoot, targetDir, VARS);

      const content = await readFile(join(targetDir, 'static.md'), 'utf-8');
      expect(content).toBe(raw);
    });

    it('leaves unrecognised template tokens intact', async () => {
      await writeFile(join(defaultDir, 'unknown.md'), 'value: {unknownVar}\n');

      await renderTemplate(templateRoot, targetDir, VARS);

      const content = await readFile(join(targetDir, 'unknown.md'), 'utf-8');
      expect(content).toBe('value: {unknownVar}\n');
    });

    it('substitutes multi-line template variables', async () => {
      await writeFile(join(defaultDir, 'config'), 'providers:\n{llmProviders}\n');

      await renderTemplate(templateRoot, targetDir, VARS);

      const content = await readFile(join(targetDir, 'config'), 'utf-8');
      expect(content).toContain('anthropic:');
      expect(content).toContain('ANTHROPIC_API_KEY');
    });
  });

  describe('filename substitution', () => {
    it('substitutes {project} in filenames', async () => {
      await writeFile(join(defaultDir, '{project}.code-workspace'), '{}');

      await renderTemplate(templateRoot, targetDir, VARS);

      const entries = await readdir(targetDir);
      expect(entries).toContain('my-cool-app.code-workspace');
    });

    it('substitutes {project} in directory names', async () => {
      await mkdir(join(defaultDir, '{project}-config'));
      await writeFile(join(defaultDir, '{project}-config', 'settings.json'), '{}');

      await renderTemplate(templateRoot, targetDir, VARS);

      const entries = await readdir(targetDir);
      expect(entries).toContain('my-cool-app-config');
    });
  });

  describe('directory traversal', () => {
    it('recursively copies nested directory structures', async () => {
      await mkdir(join(defaultDir, 'a', 'b'), { recursive: true });
      await writeFile(join(defaultDir, 'a', 'b', 'deep.txt'), '{projectName}');

      await renderTemplate(templateRoot, targetDir, VARS);

      const content = await readFile(join(targetDir, 'a', 'b', 'deep.txt'), 'utf-8');
      expect(content).toBe('My Cool App');
    });

    it('returns a list of all created file paths', async () => {
      await writeFile(join(defaultDir, 'root.txt'), 'r');
      await mkdir(join(defaultDir, 'sub'));
      await writeFile(join(defaultDir, 'sub', 'child.txt'), 'c');

      const files = await renderTemplate(templateRoot, targetDir, VARS);

      expect(files).toHaveLength(2);
      expect(files).toContain('root.txt');
      expect(files).toContain('sub/child.txt');
    });

    it('returns empty array for an empty template directory', async () => {
      const files = await renderTemplate(templateRoot, targetDir, VARS);
      expect(files).toEqual([]);
    });
  });

  describe('idempotent mode', () => {
    it('does not overwrite a file that already exists at the destination', async () => {
      const customContent = '# custom authored content\n';
      await writeFile(join(defaultDir, 'README.md'), '# {projectName}\n');
      await mkdir(join(targetDir, 'docs', 'conventions'), { recursive: true });
      await writeFile(join(targetDir, 'README.md'), customContent);

      await renderTemplate(templateRoot, targetDir, VARS, { mode: 'idempotent' });

      const content = await readFile(join(targetDir, 'README.md'), 'utf-8');
      expect(content).toBe(customContent);
    });

    it('does not include skipped files in the returned list', async () => {
      await writeFile(join(defaultDir, 'README.md'), '# {projectName}\n');
      await writeFile(join(targetDir, 'README.md'), 'existing');

      const files = await renderTemplate(templateRoot, targetDir, VARS, { mode: 'idempotent' });

      expect(files).not.toContain('README.md');
    });

    it('does not change the mtime of a skipped file', async () => {
      await writeFile(join(defaultDir, 'README.md'), '# {projectName}\n');
      await writeFile(join(targetDir, 'README.md'), 'existing');

      const before = (await stat(join(targetDir, 'README.md'))).mtimeMs;
      await renderTemplate(templateRoot, targetDir, VARS, { mode: 'idempotent' });
      const after = (await stat(join(targetDir, 'README.md'))).mtimeMs;

      expect(after).toBe(before);
    });

    it('writes a file that does not yet exist at the destination', async () => {
      await writeFile(join(defaultDir, 'new-file.md'), 'hello {projectName}');

      const files = await renderTemplate(templateRoot, targetDir, VARS, { mode: 'idempotent' });

      const content = await readFile(join(targetDir, 'new-file.md'), 'utf-8');
      expect(content).toBe('hello My Cool App');
      expect(files).toContain('new-file.md');
    });

    it('merges new top-level keys into an existing .space/config without changing existing values', async () => {
      await mkdir(join(defaultDir, '.space'), { recursive: true });
      await writeFile(
        join(defaultDir, '.space', 'config'),
        'project:\n  name: {projectName}\nnewkey:\n  value: from-template\n',
      );

      await mkdir(join(targetDir, '.space'), { recursive: true });
      await writeFile(join(targetDir, '.space', 'config'), 'project:\n  name: Existing Project\n');

      await renderTemplate(templateRoot, targetDir, VARS, { mode: 'idempotent' });

      const content = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
      expect(content).toContain('Existing Project');
      expect(content).toContain('newkey');
    });

    it('does not change .space/config when no new keys are introduced', async () => {
      await mkdir(join(defaultDir, '.space'), { recursive: true });
      await writeFile(join(defaultDir, '.space', 'config'), 'project:\n  name: {projectName}\n');

      await mkdir(join(targetDir, '.space'), { recursive: true });
      const existingConfig = 'project:\n  name: Existing Project\n';
      await writeFile(join(targetDir, '.space', 'config'), existingConfig);

      const before = (await stat(join(targetDir, '.space', 'config'))).mtimeMs;
      await renderTemplate(templateRoot, targetDir, VARS, { mode: 'idempotent' });
      const after = (await stat(join(targetDir, '.space', 'config'))).mtimeMs;

      expect(after).toBe(before);
    });

    it('creates .space/config when it does not exist', async () => {
      await mkdir(join(defaultDir, '.space'), { recursive: true });
      await writeFile(join(defaultDir, '.space', 'config'), 'project:\n  name: {projectName}\n');

      await renderTemplate(templateRoot, targetDir, VARS, { mode: 'idempotent' });

      const content = await readFile(join(targetDir, '.space', 'config'), 'utf-8');
      expect(content).toContain('My Cool App');
    });

    it('greenfield mode writes all files unconditionally', async () => {
      await writeFile(join(defaultDir, 'README.md'), '# {projectName}\n');
      await writeFile(join(targetDir, 'README.md'), 'existing content');

      await renderTemplate(templateRoot, targetDir, VARS, { mode: 'greenfield' });

      const content = await readFile(join(targetDir, 'README.md'), 'utf-8');
      expect(content).toBe('# My Cool App\n');
    });
  });

  describe('embedded layout', () => {
    let embeddedDir: string;

    beforeEach(async () => {
      embeddedDir = join(templateRoot, 'embedded');
      await mkdir(embeddedDir);
    });

    it('uses the embedded template directory when layout is embedded', async () => {
      await writeFile(join(embeddedDir, 'AGENTS.md'), 'embedded agents');
      await writeFile(join(defaultDir, 'README.md'), 'default readme');

      const files = await renderTemplate(templateRoot, targetDir, VARS, { layout: 'embedded' });

      expect(files).toContain('AGENTS.md');
      expect(files).not.toContain('README.md');
      const content = await readFile(join(targetDir, 'AGENTS.md'), 'utf-8');
      expect(content).toBe('embedded agents');
    });

    it('does not render files from the default template when layout is embedded', async () => {
      await writeFile(join(defaultDir, 'README.md'), 'default readme');
      await writeFile(join(embeddedDir, 'AGENTS.md'), 'embedded agents');

      await renderTemplate(templateRoot, targetDir, VARS, { layout: 'embedded' });

      const entries = await readdir(targetDir);
      expect(entries).not.toContain('README.md');
      expect(entries).toContain('AGENTS.md');
    });

    it('uses the default template when layout is sibling', async () => {
      await writeFile(join(defaultDir, 'README.md'), 'default readme');
      await writeFile(join(embeddedDir, 'AGENTS.md'), 'embedded agents');

      const files = await renderTemplate(templateRoot, targetDir, VARS, { layout: 'sibling' });

      expect(files).toContain('README.md');
      expect(files).not.toContain('AGENTS.md');
    });

    it('uses the default template when no layout option is given', async () => {
      await writeFile(join(defaultDir, 'README.md'), 'default readme');
      await writeFile(join(embeddedDir, 'AGENTS.md'), 'embedded agents');

      const files = await renderTemplate(templateRoot, targetDir, VARS);

      expect(files).toContain('README.md');
      expect(files).not.toContain('AGENTS.md');
    });
  });
});

describe('ensureGitignoreManagedBlock', () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'cs-gi-'));
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('creates a fresh .gitignore with the managed block when none exists', async () => {
    await ensureGitignoreManagedBlock(targetDir);

    const content = await readFile(join(targetDir, '.gitignore'), 'utf-8');
    expect(content).toContain('# >>> @daddia/space');
    expect(content).toContain('.space/sources/');
    expect(content).toContain('.cursor/skills');
    expect(content).toContain('# <<< @daddia/space');
  });

  it('appends the managed block after existing host content', async () => {
    await writeFile(join(targetDir, '.gitignore'), 'node_modules/\ndist/\n');

    await ensureGitignoreManagedBlock(targetDir);

    const content = await readFile(join(targetDir, '.gitignore'), 'utf-8');
    expect(content).toMatch(/^node_modules\//);
    expect(content).toContain('dist/');
    expect(content).toContain('# >>> @daddia/space');
    expect(content).toContain('.space/sources/');
    expect(content).toContain('# <<< @daddia/space');
    // Host content must come before the marker
    const hostEnd = content.indexOf('dist/');
    const markerStart = content.indexOf('# >>> @daddia/space');
    expect(hostEnd).toBeLessThan(markerStart);
  });

  it('updates only the managed block on reinit, leaving host content unchanged', async () => {
    const original =
      'node_modules/\ndist/\n\n# >>> @daddia/space — managed block, do not edit between markers\n.old-entry/\n# <<< @daddia/space\n';
    await writeFile(join(targetDir, '.gitignore'), original);

    await ensureGitignoreManagedBlock(targetDir);

    const content = await readFile(join(targetDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules/');
    expect(content).toContain('dist/');
    expect(content).not.toContain('.old-entry/');
    expect(content).toContain('.space/sources/');
    expect(content).toContain('.cursor/skills');
    // Only one copy of each marker
    expect(content.split('# >>> @daddia/space').length - 1).toBe(1);
    expect(content.split('# <<< @daddia/space').length - 1).toBe(1);
  });

  it('backs up and replaces an unreadable .gitignore', async () => {
    const gitignorePath = join(targetDir, '.gitignore');
    await writeFile(gitignorePath, 'original content\n');
    // Make the file write-only so readFile throws EACCES but writeFile succeeds.
    await chmod(gitignorePath, 0o222);

    await ensureGitignoreManagedBlock(targetDir);

    // Restore so readFile and rm can run in afterEach / assertions.
    await chmod(gitignorePath, 0o644);
    const content = await readFile(gitignorePath, 'utf-8');
    expect(content).toContain('# >>> @daddia/space');
    expect(content).toContain('.space/sources/');
  });
});

describe('ensureEmbeddedPackageJsonDeps', () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'cs-epkg-'));
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('creates a minimal package.json when none exists', async () => {
    await ensureEmbeddedPackageJsonDeps(targetDir);

    const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf-8')) as Record<
      string,
      unknown
    >;
    expect((pkg['devDependencies'] as Record<string, string>)['@daddia/space']).toBe('*');
    expect((pkg['devDependencies'] as Record<string, string>)['@daddia/skills']).toBe('*');
  });

  it('adds only devDependencies for @daddia/space and @daddia/skills to an existing package.json', async () => {
    const initial = {
      name: 'acme',
      scripts: { build: 'tsc' },
      devDependencies: { eslint: '^9' },
    };
    await writeFile(join(targetDir, 'package.json'), JSON.stringify(initial, null, 2) + '\n');

    await ensureEmbeddedPackageJsonDeps(targetDir);

    const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf-8')) as Record<
      string,
      unknown
    >;
    expect(pkg['name']).toBe('acme');
    const scripts = pkg['scripts'] as Record<string, string>;
    expect(scripts['build']).toBe('tsc');
    const devDeps = pkg['devDependencies'] as Record<string, string>;
    expect(devDeps['eslint']).toBe('^9');
    expect(devDeps['@daddia/space']).toBe('*');
    expect(devDeps['@daddia/skills']).toBe('*');
  });

  it('adds scripts.postinstall when none exists', async () => {
    await writeFile(
      join(targetDir, 'package.json'),
      JSON.stringify({ name: 'acme', devDependencies: {} }, null, 2) + '\n',
    );

    await ensureEmbeddedPackageJsonDeps(targetDir);

    const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf-8')) as Record<
      string,
      unknown
    >;
    expect((pkg['scripts'] as Record<string, string>)['postinstall']).toBe('space skills sync');
  });

  it('preserves a non-Space postinstall and emits a warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const initial = {
      name: 'acme',
      scripts: { postinstall: 'husky install' },
      devDependencies: {},
    };
    await writeFile(join(targetDir, 'package.json'), JSON.stringify(initial, null, 2) + '\n');

    await ensureEmbeddedPackageJsonDeps(targetDir);

    const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf-8')) as Record<
      string,
      unknown
    >;
    expect((pkg['scripts'] as Record<string, string>)['postinstall']).toBe('husky install');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('husky install'));
  });

  it('throws on invalid JSON so the caller can surface a non-zero exit', async () => {
    await writeFile(join(targetDir, 'package.json'), '{ not valid json }');

    await expect(ensureEmbeddedPackageJsonDeps(targetDir)).rejects.toThrow(/invalid JSON/i);
  });

  it('is idempotent — does not write the file when deps are already present', async () => {
    const initial = {
      name: 'acme',
      scripts: { postinstall: 'space skills sync' },
      devDependencies: { '@daddia/space': '*', '@daddia/skills': '*' },
    };
    await writeFile(join(targetDir, 'package.json'), JSON.stringify(initial, null, 2) + '\n');

    const beforeMtime = (await stat(join(targetDir, 'package.json'))).mtimeMs;
    await ensureEmbeddedPackageJsonDeps(targetDir);
    const afterMtime = (await stat(join(targetDir, 'package.json'))).mtimeMs;

    expect(afterMtime).toBe(beforeMtime);
  });
});

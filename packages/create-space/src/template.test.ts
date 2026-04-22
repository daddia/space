import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderTemplate, type TemplateVars } from './template.js';

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
      expect(files).toContain('child.txt');
    });

    it('returns empty array for an empty template directory', async () => {
      const files = await renderTemplate(templateRoot, targetDir, VARS);
      expect(files).toEqual([]);
    });
  });
});

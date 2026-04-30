import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ensurePackageJsonDeps } from './ensure-package-deps.js';

describe('ensurePackageJsonDeps', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'epd-'));
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('creates a minimal package.json when none exists', async () => {
    const dir = join(tempBase, 'workspace');
    await mkdir(dir);

    await ensurePackageJsonDeps(dir);

    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
      devDependencies?: Record<string, string>;
    };
    expect(pkg.devDependencies?.['@daddia/space']).toBeDefined();
    expect(pkg.devDependencies?.['@daddia/skills']).toBeDefined();
  });

  it('adds @daddia/space when missing from existing package.json', async () => {
    const dir = join(tempBase, 'workspace');
    await mkdir(dir);
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ private: true, devDependencies: { '@daddia/skills': '*' } }, null, 2) + '\n',
    );

    await ensurePackageJsonDeps(dir);

    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
      devDependencies?: Record<string, string>;
    };
    expect(pkg.devDependencies?.['@daddia/space']).toBeDefined();
    expect(pkg.devDependencies?.['@daddia/skills']).toBeDefined();
  });

  it('adds @daddia/skills when missing from existing package.json', async () => {
    const dir = join(tempBase, 'workspace');
    await mkdir(dir);
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ private: true, devDependencies: { '@daddia/space': '*' } }, null, 2) + '\n',
    );

    await ensurePackageJsonDeps(dir);

    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
      devDependencies?: Record<string, string>;
    };
    expect(pkg.devDependencies?.['@daddia/skills']).toBeDefined();
  });

  it('is a no-op when both deps are already present', async () => {
    const dir = join(tempBase, 'workspace');
    await mkdir(dir);
    const original = JSON.stringify(
      {
        private: true,
        devDependencies: { '@daddia/space': '^0.4.0', '@daddia/skills': '^1.0.0' },
      },
      null,
      2,
    ) + '\n';
    await writeFile(join(dir, 'package.json'), original);

    await ensurePackageJsonDeps(dir);

    const after = await readFile(join(dir, 'package.json'), 'utf-8');
    expect(after).toBe(original);
  });

  it('preserves existing keys in package.json', async () => {
    const dir = join(tempBase, 'workspace');
    await mkdir(dir);
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'my-workspace', private: true }, null, 2) + '\n',
    );

    await ensurePackageJsonDeps(dir);

    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
      name?: string;
      private?: boolean;
    };
    expect(pkg.name).toBe('my-workspace');
    expect(pkg.private).toBe(true);
  });
});

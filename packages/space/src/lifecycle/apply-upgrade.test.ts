import { describe, it, expect, beforeEach, afterEach, vi, afterAll } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { selectCompatibleBumps, applyVersionBumps } from './apply-upgrade.js';
import type { UpdateCache } from './version-check.js';

afterAll(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'au-'));
}

async function writePackageJson(
  dir: string,
  deps: Record<string, string>,
  section: 'dependencies' | 'devDependencies' = 'devDependencies',
): Promise<void> {
  await mkdir(dir, { recursive: true });
  const pkg = { private: true, [section]: deps };
  await writeFile(join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}

async function readDeps(dir: string): Promise<Record<string, string>> {
  const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
    devDependencies?: Record<string, string>;
    dependencies?: Record<string, string>;
  };
  return { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
}

function makeCache(
  packages: Record<string, { latest: string; breaking: boolean }>,
): UpdateCache {
  return {
    checked_at: new Date().toISOString(),
    packages: Object.fromEntries(
      Object.entries(packages).map(([name, { latest, breaking }]) => [
        name,
        { declared: '*', installed: '0.0.0', latest, breaking },
      ]),
    ),
  };
}

// ---------------------------------------------------------------------------
// selectCompatibleBumps
// ---------------------------------------------------------------------------

describe('selectCompatibleBumps', () => {
  it('returns only non-breaking packages', () => {
    const cache = makeCache({
      '@daddia/space': { latest: '0.5.2', breaking: false },
      '@daddia/skills': { latest: '1.0.0', breaking: true },
    });

    const bumps = selectCompatibleBumps(cache);

    expect(bumps['@daddia/space']).toBe('0.5.2');
    expect('@daddia/skills' in bumps).toBe(false);
  });

  it('returns all packages when none are breaking', () => {
    const cache = makeCache({
      '@daddia/space': { latest: '0.5.2', breaking: false },
      '@daddia/skills': { latest: '0.5.3', breaking: false },
    });

    const bumps = selectCompatibleBumps(cache);

    expect(Object.keys(bumps)).toHaveLength(2);
  });

  it('returns an empty map when all packages are breaking', () => {
    const cache = makeCache({
      '@daddia/space': { latest: '1.0.0', breaking: true },
    });

    expect(selectCompatibleBumps(cache)).toEqual({});
  });

  it('returns an empty map for an empty cache', () => {
    const cache: UpdateCache = { checked_at: new Date().toISOString(), packages: {} };
    expect(selectCompatibleBumps(cache)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// applyVersionBumps — specifier rewrite policy
// ---------------------------------------------------------------------------

describe('applyVersionBumps', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await makeTempDir();
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('rewrites a caret specifier to the new caret range', async () => {
    await writePackageJson(tempBase, { '@daddia/space': '^0.4.0' });

    await applyVersionBumps(tempBase, { '@daddia/space': '0.5.2' });

    const deps = await readDeps(tempBase);
    expect(deps['@daddia/space']).toBe('^0.5.2');
  });

  it('rewrites a tilde specifier to the new tilde range', async () => {
    await writePackageJson(tempBase, { '@daddia/space': '~0.4.0' });

    await applyVersionBumps(tempBase, { '@daddia/space': '0.5.2' });

    const deps = await readDeps(tempBase);
    expect(deps['@daddia/space']).toBe('~0.5.2');
  });

  it('rewrites a wildcard specifier to a caret range', async () => {
    await writePackageJson(tempBase, { '@daddia/space': '*' });

    await applyVersionBumps(tempBase, { '@daddia/space': '0.5.2' });

    const deps = await readDeps(tempBase);
    expect(deps['@daddia/space']).toBe('^0.5.2');
  });

  it('leaves an exact-pinned specifier unchanged when force is false', async () => {
    await writePackageJson(tempBase, { '@daddia/space': '0.4.0' });

    await applyVersionBumps(tempBase, { '@daddia/space': '0.5.2' }, false);

    const deps = await readDeps(tempBase);
    expect(deps['@daddia/space']).toBe('0.4.0');
  });

  it('rewrites an exact-pinned specifier to a caret range when force is true', async () => {
    await writePackageJson(tempBase, { '@daddia/space': '0.4.0' });

    await applyVersionBumps(tempBase, { '@daddia/space': '0.5.2' }, true);

    const deps = await readDeps(tempBase);
    expect(deps['@daddia/space']).toBe('^0.5.2');
  });

  it('never touches a workspace:* specifier', async () => {
    await writePackageJson(tempBase, { '@daddia/space': 'workspace:*' });

    await applyVersionBumps(tempBase, { '@daddia/space': '0.5.2' });

    const deps = await readDeps(tempBase);
    expect(deps['@daddia/space']).toBe('workspace:*');
  });

  it('updates packages in devDependencies', async () => {
    await writePackageJson(tempBase, { '@daddia/space': '^0.4.0' }, 'devDependencies');

    await applyVersionBumps(tempBase, { '@daddia/space': '0.5.2' });

    const deps = await readDeps(tempBase);
    expect(deps['@daddia/space']).toBe('^0.5.2');
  });

  it('updates packages in dependencies', async () => {
    await writePackageJson(tempBase, { '@daddia/space': '^0.4.0' }, 'dependencies');

    await applyVersionBumps(tempBase, { '@daddia/space': '0.5.2' });

    const deps = await readDeps(tempBase);
    expect(deps['@daddia/space']).toBe('^0.5.2');
  });

  it('does not rewrite when already at the target version', async () => {
    await writePackageJson(tempBase, { '@daddia/space': '^0.5.2' });
    const originalContent = await readFile(join(tempBase, 'package.json'), 'utf-8');

    await applyVersionBumps(tempBase, { '@daddia/space': '0.5.2' });

    const afterContent = await readFile(join(tempBase, 'package.json'), 'utf-8');
    expect(afterContent).toBe(originalContent);
  });

  it('is a no-op when bumps is empty', async () => {
    await writePackageJson(tempBase, { '@daddia/space': '^0.4.0' });
    const originalContent = await readFile(join(tempBase, 'package.json'), 'utf-8');

    await applyVersionBumps(tempBase, {});

    const afterContent = await readFile(join(tempBase, 'package.json'), 'utf-8');
    expect(afterContent).toBe(originalContent);
  });

  it('skips a package not found in package.json without error', async () => {
    await writePackageJson(tempBase, { '@daddia/space': '^0.4.0' });

    await expect(
      applyVersionBumps(tempBase, { '@daddia/space': '0.5.2', '@daddia/unknown': '1.0.0' }),
    ).resolves.toBeUndefined();

    const deps = await readDeps(tempBase);
    expect(deps['@daddia/space']).toBe('^0.5.2');
  });

  it('emits a warning and skips an unrecognised specifier form', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await writePackageJson(tempBase, { '@daddia/space': '>=0.4.0' });

    await applyVersionBumps(tempBase, { '@daddia/space': '0.5.2' });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unrecognised specifier'));
    const deps = await readDeps(tempBase);
    expect(deps['@daddia/space']).toBe('>=0.4.0');
    warnSpy.mockRestore();
  });

  it('preserves unrelated keys in package.json', async () => {
    await mkdir(tempBase, { recursive: true });
    await writeFile(
      join(tempBase, 'package.json'),
      JSON.stringify(
        { name: 'my-ws', private: true, devDependencies: { '@daddia/space': '^0.4.0' } },
        null,
        2,
      ) + '\n',
    );

    await applyVersionBumps(tempBase, { '@daddia/space': '0.5.2' });

    const pkg = JSON.parse(await readFile(join(tempBase, 'package.json'), 'utf-8')) as {
      name?: string;
    };
    expect(pkg.name).toBe('my-ws');
  });
});

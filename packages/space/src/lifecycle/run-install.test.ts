import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectPackageManager } from './run-install.js';

describe('detectPackageManager', () => {
  let tempBase: string;

  beforeEach(async () => {
    tempBase = await mkdtemp(join(tmpdir(), 'pm-'));
  });

  afterEach(async () => {
    await rm(tempBase, { recursive: true, force: true });
  });

  it('returns npm when no lockfile is present', async () => {
    expect(await detectPackageManager(tempBase)).toBe('npm');
  });

  it('returns pnpm when pnpm-lock.yaml is present', async () => {
    await writeFile(join(tempBase, 'pnpm-lock.yaml'), '');
    expect(await detectPackageManager(tempBase)).toBe('pnpm');
  });

  it('returns yarn when yarn.lock is present', async () => {
    await writeFile(join(tempBase, 'yarn.lock'), '');
    expect(await detectPackageManager(tempBase)).toBe('yarn');
  });

  it('returns bun when bun.lockb is present', async () => {
    await writeFile(join(tempBase, 'bun.lockb'), '');
    expect(await detectPackageManager(tempBase)).toBe('bun');
  });

  it('returns npm when package-lock.json is present', async () => {
    await writeFile(join(tempBase, 'package-lock.json'), '{}');
    expect(await detectPackageManager(tempBase)).toBe('npm');
  });

  it('prefers pnpm over npm when both lockfiles are present', async () => {
    await writeFile(join(tempBase, 'pnpm-lock.yaml'), '');
    await writeFile(join(tempBase, 'package-lock.json'), '{}');
    expect(await detectPackageManager(tempBase)).toBe('pnpm');
  });

  it('prefers yarn over npm when both lockfiles are present', async () => {
    await writeFile(join(tempBase, 'yarn.lock'), '');
    await writeFile(join(tempBase, 'package-lock.json'), '{}');
    expect(await detectPackageManager(tempBase)).toBe('yarn');
  });

  it('prefers pnpm over yarn when both lockfiles are present', async () => {
    await writeFile(join(tempBase, 'pnpm-lock.yaml'), '');
    await writeFile(join(tempBase, 'yarn.lock'), '');
    expect(await detectPackageManager(tempBase)).toBe('pnpm');
  });
});

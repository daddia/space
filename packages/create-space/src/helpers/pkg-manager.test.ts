import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPkgManager, resolvePackageManager } from './pkg-manager.js';

describe('getPkgManager', () => {
  let originalUA: string | undefined;

  beforeEach(() => {
    originalUA = process.env.npm_config_user_agent;
  });

  afterEach(() => {
    if (originalUA === undefined) {
      delete process.env.npm_config_user_agent;
    } else {
      process.env.npm_config_user_agent = originalUA;
    }
  });

  it('detects pnpm from user agent', () => {
    process.env.npm_config_user_agent = 'pnpm/10.32.1 npm/? node/v22.0.0 darwin arm64';
    expect(getPkgManager()).toBe('pnpm');
  });

  it('detects yarn from user agent', () => {
    process.env.npm_config_user_agent = 'yarn/4.1.0 npm/? node/v22.0.0 darwin arm64';
    expect(getPkgManager()).toBe('yarn');
  });

  it('detects bun from user agent', () => {
    process.env.npm_config_user_agent = 'bun/1.1.0 npm/? node/v22.0.0 darwin arm64';
    expect(getPkgManager()).toBe('bun');
  });

  it('detects npm from user agent', () => {
    process.env.npm_config_user_agent = 'npm/10.5.0 node/v22.0.0 darwin arm64';
    expect(getPkgManager()).toBe('npm');
  });

  it('falls back to npm when user agent is empty', () => {
    process.env.npm_config_user_agent = '';
    expect(getPkgManager()).toBe('npm');
  });

  it('falls back to npm when user agent is not set', () => {
    delete process.env.npm_config_user_agent;
    expect(getPkgManager()).toBe('npm');
  });
});

describe('resolvePackageManager', () => {
  it('returns npm when --use-npm is set', () => {
    expect(resolvePackageManager({ useNpm: true })).toBe('npm');
  });

  it('returns pnpm when --use-pnpm is set', () => {
    expect(resolvePackageManager({ usePnpm: true })).toBe('pnpm');
  });

  it('returns yarn when --use-yarn is set', () => {
    expect(resolvePackageManager({ useYarn: true })).toBe('yarn');
  });

  it('returns bun when --use-bun is set', () => {
    expect(resolvePackageManager({ useBun: true })).toBe('bun');
  });

  it('falls back to detection when no override is set', () => {
    expect(resolvePackageManager({})).toBe(getPkgManager());
  });

  it('prefers --use-npm over detection', () => {
    expect(resolvePackageManager({ useNpm: true })).toBe('npm');
  });
});

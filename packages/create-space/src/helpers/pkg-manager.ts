export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export function getPkgManager(): PackageManager {
  const ua = process.env.npm_config_user_agent ?? '';
  if (ua.startsWith('yarn')) return 'yarn';
  if (ua.startsWith('pnpm')) return 'pnpm';
  if (ua.startsWith('bun')) return 'bun';
  return 'npm';
}

export interface PmOverrides {
  useNpm?: boolean;
  usePnpm?: boolean;
  useYarn?: boolean;
  useBun?: boolean;
}

export function resolvePackageManager(overrides: PmOverrides): PackageManager {
  if (overrides.useNpm) return 'npm';
  if (overrides.usePnpm) return 'pnpm';
  if (overrides.useYarn) return 'yarn';
  if (overrides.useBun) return 'bun';
  return getPkgManager();
}

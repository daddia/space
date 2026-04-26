import { libraryConfig } from '@tpw/eslint-config/library';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...libraryConfig,
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/template/**',
      'packages/skills/bin/**',
      'skills/**',
    ],
  },
];

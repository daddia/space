# `@daddia/eslint-config`

Shared ESLint flat configurations for daddia repositories.

## Available configs

| Export                                 | Use case                                    |
| -------------------------------------- | ------------------------------------------- |
| `@daddia/eslint-config/base`           | Base config (TypeScript + Prettier + Turbo) |
| `@daddia/eslint-config/library`        | Node.js library packages (`packages/*`)     |
| `@daddia/eslint-config/nest-js`        | NestJS applications (`apps/api`)            |
| `@daddia/eslint-config/next-js`        | Next.js applications (`apps/web`)           |
| `@daddia/eslint-config/react-internal` | Shared React component libraries            |

Project-level `eslint.config.mjs` files import a config and add overrides.

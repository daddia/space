# `@tpw/eslint-config`

Shared ESLint flat configurations for Horizon repositories.

## Available configs

| Export                              | Use case                                    |
| ----------------------------------- | ------------------------------------------- |
| `@tpw/eslint-config/base`           | Base config (TypeScript + Prettier + Turbo) |
| `@tpw/eslint-config/library`        | Node.js library packages (`packages/*`)     |
| `@tpw/eslint-config/nest-js`        | NestJS applications (`apps/api`)            |
| `@tpw/eslint-config/next-js`        | Next.js applications (`apps/web`)           |
| `@tpw/eslint-config/react-internal` | Shared React component libraries            |

Project-level `eslint.config.mjs` files import a config and add overrides.

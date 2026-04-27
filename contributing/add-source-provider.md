# Add a Source Provider

How to add a new sync source to `@daddia/space`.

Source providers implement the `space sync {provider}` command. Each provider pulls data from an upstream system and writes an atomic mirror to `.space/sources/{provider}/`.

## Existing providers as reference

- `packages/space/src/providers/jira/` — Atlassian Jira Cloud
- `packages/space/src/providers/confluence/` — Atlassian Confluence Cloud

Follow the same pattern.

## Steps

### 1. Create the provider directory

```
packages/space/src/providers/{provider}/
  index.ts          # provider entry point; registers with Commander
  client.ts         # HTTP client + auth
  sync.ts           # sync logic; writes to .space/sources/{provider}/
  sync.test.ts      # unit tests with msw fixtures
```

### 2. Implement the provider interface

Each provider exports a `sync(config, workspace)` function:

```typescript
export async function sync(config: SpaceConfig, workspace: WorkspaceContext): Promise<SyncResult>;
```

The function:

1. Reads credentials from the workspace's `.env` (never hardcode)
2. Fetches data from the upstream API with retry and rate limiting
3. Writes to a **temp directory** first
4. Renames the temp directory to `.space/sources/{provider}/` atomically
5. On failure, leaves the previous mirror untouched and preserves the temp output

### 3. Atomic write pattern

```typescript
const tempDir = path.join(workspace.root, '.space', 'sources', `.${provider}-tmp`);
const targetDir = path.join(workspace.root, '.space', 'sources', provider);

// Write all files to tempDir
await writeProviderData(config, tempDir);

// Atomic rename
await fs.rm(targetDir, { recursive: true, force: true });
await fs.rename(tempDir, targetDir);
```

On error: catch and log; do not rename; preserve tempDir for inspection.

### 4. Rate limiting

Apply a concurrency cap consistent with the upstream API's documented rate limits:

```typescript
import pLimit from 'p-limit';
const limit = pLimit(MAX_CONCURRENT); // e.g. 5 for most REST APIs
```

Add exponential retry for transient failures (5xx, network errors). Do not retry on 4xx (auth/config errors).

### 5. Write integration tests with msw fixtures

```
packages/space/src/providers/{provider}/
  sync.test.ts
  fixtures/
    {fixture-name}.json   # captured API responses
```

Use `msw` to intercept HTTP requests in tests. Capture real API responses once against a live environment; commit them as fixtures.

### 6. Register with Commander

In `packages/space/src/cli.ts` (or the equivalent root command file), add:

```typescript
import { sync as syncProvider } from './providers/{provider}/index.js';
syncCommand.command('{provider}').action(syncProvider);
```

### 7. Add to `.space/config` schema

If the provider requires new config keys, update the config schema in `packages/space/src/config.ts` and add an example to `packages/create-space/templates/.space/config`.

### 8. Smoke-test against a real workspace

Before shipping, run against a real workspace with valid credentials and verify:

- The mirror is written correctly
- Re-running sync is idempotent (byte-identical output when upstream hasn't changed)
- Error handling works: revoke credentials mid-run; confirm the previous mirror is untouched

### 9. Add a changeset

```bash
pnpm changeset
```

Minor bump for `@daddia/space`.

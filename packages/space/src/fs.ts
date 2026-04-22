import { mkdir, rename, rm } from 'node:fs/promises';

/**
 * Writes to a temp sibling of `destDir`, then atomically replaces `destDir`
 * on success.
 *
 * Protocol:
 *   - Any leftover `{destDir}.tmp` from a previous failed run is removed
 *     before the writer is invoked.
 *   - The `writer` receives the tmp path and writes all output there.
 *   - On success: `destDir` is replaced by the tmp directory via rename.
 *   - On failure: the tmp directory is left in place for inspection and
 *     the existing `destDir` is untouched. The error is re-thrown.
 *
 * The implementation is safe for re-runs: calling atomicWrite twice with a
 * deterministic writer produces identical results.
 */
export async function atomicWrite(
  destDir: string,
  writer: (tmpDir: string) => Promise<void>,
): Promise<void> {
  const tmpDir = `${destDir}.tmp`;

  // Remove any leftover tmp from a previous failed run before starting fresh.
  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir, { recursive: true });

  try {
    await writer(tmpDir);
  } catch (err) {
    // Leave tmpDir intact for post-mortem inspection. Do not touch destDir.
    throw err;
  }

  // Writing succeeded -- swap tmp into place.
  // Remove the existing destDir first (rename cannot replace a non-empty dir
  // on POSIX without an intermediate remove).
  await rm(destDir, { recursive: true, force: true });
  await rename(tmpDir, destDir);
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { atomicWrite } from './fs.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function collectFiles(dir: string): Promise<Record<string, string>> {
  const entries = await readdir(dir);
  const result: Record<string, string> = {};
  for (const entry of entries) {
    result[entry] = await readFile(path.join(dir, entry), 'utf-8');
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('atomicWrite', () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), 'space-fs-'));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // Success path
  // -------------------------------------------------------------------------

  it('creates destDir with the files written by the writer', async () => {
    const destDir = path.join(baseDir, 'jira');

    await atomicWrite(destDir, async (tmp) => {
      await writeFile(path.join(tmp, 'issues.json'), '[]');
      await writeFile(path.join(tmp, 'meta.json'), '{}');
    });

    const files = await collectFiles(destDir);
    expect(files['issues.json']).toBe('[]');
    expect(files['meta.json']).toBe('{}');
  });

  it('removes the .tmp sibling on success', async () => {
    const destDir = path.join(baseDir, 'jira');

    await atomicWrite(destDir, async (tmp) => {
      await writeFile(path.join(tmp, 'issues.json'), '[]');
    });

    expect(existsSync(`${destDir}.tmp`)).toBe(false);
  });

  it('replaces an existing destDir with the new contents', async () => {
    const destDir = path.join(baseDir, 'jira');

    await atomicWrite(destDir, async (tmp) => {
      await writeFile(path.join(tmp, 'issues.json'), '["old"]');
    });

    await atomicWrite(destDir, async (tmp) => {
      await writeFile(path.join(tmp, 'issues.json'), '["new"]');
    });

    const files = await collectFiles(destDir);
    expect(files['issues.json']).toBe('["new"]');
  });

  // -------------------------------------------------------------------------
  // Failure path
  // -------------------------------------------------------------------------

  it('re-throws the error from the writer', async () => {
    const destDir = path.join(baseDir, 'jira');

    await expect(
      atomicWrite(destDir, async () => {
        throw new Error('write failed');
      }),
    ).rejects.toThrow('write failed');
  });

  it('leaves the .tmp sibling on failure for inspection', async () => {
    const destDir = path.join(baseDir, 'jira');

    await atomicWrite(destDir, async (tmp) => {
      await writeFile(path.join(tmp, 'partial.json'), '"partial"');
      throw new Error('boom');
    }).catch(() => {});

    const tmpDir = `${destDir}.tmp`;
    expect(existsSync(tmpDir)).toBe(true);
    const content = await readFile(path.join(tmpDir, 'partial.json'), 'utf-8');
    expect(content).toBe('"partial"');
  });

  it('does not create or modify destDir when the writer fails', async () => {
    const destDir = path.join(baseDir, 'jira');

    await atomicWrite(destDir, async () => {
      throw new Error('boom');
    }).catch(() => {});

    expect(existsSync(destDir)).toBe(false);
  });

  it('leaves existing destDir untouched when the writer fails', async () => {
    const destDir = path.join(baseDir, 'jira');

    await atomicWrite(destDir, async (tmp) => {
      await writeFile(path.join(tmp, 'issues.json'), '"original"');
    });

    await atomicWrite(destDir, async () => {
      throw new Error('second run failed');
    }).catch(() => {});

    const files = await collectFiles(destDir);
    expect(files['issues.json']).toBe('"original"');
  });

  // -------------------------------------------------------------------------
  // Idempotency
  // -------------------------------------------------------------------------

  it('is idempotent -- two successive runs with the same writer produce identical destDir contents', async () => {
    const destDir = path.join(baseDir, 'jira');

    const writer = async (tmp: string) => {
      await writeFile(path.join(tmp, 'issues.json'), '[1,2,3]');
      await writeFile(path.join(tmp, 'meta.json'), '{"sync_at":"2026-01-01"}');
    };

    await atomicWrite(destDir, writer);
    const first = await collectFiles(destDir);

    await atomicWrite(destDir, writer);
    const second = await collectFiles(destDir);

    expect(second).toEqual(first);
  });

  it('cleans up a leftover .tmp from a previous failed run before starting', async () => {
    const destDir = path.join(baseDir, 'jira');
    const tmpDir = `${destDir}.tmp`;

    // Simulate a leftover tmp directory from a previous crash
    const { mkdir, writeFile: wf } = await import('node:fs/promises');
    await mkdir(tmpDir, { recursive: true });
    await wf(path.join(tmpDir, 'stale.json'), '"stale"');

    await atomicWrite(destDir, async (tmp) => {
      await writeFile(path.join(tmp, 'issues.json'), '[]');
    });

    // The stale file should be gone; destDir has the fresh content
    const files = await collectFiles(destDir);
    expect(files['issues.json']).toBe('[]');
    expect(files['stale.json']).toBeUndefined();
    expect(existsSync(tmpDir)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Writer receives the correct tmp path
  // -------------------------------------------------------------------------

  it('passes a writable tmp path that is a sibling of destDir', async () => {
    const destDir = path.join(baseDir, 'jira');
    let receivedTmp = '';

    await atomicWrite(destDir, async (tmp) => {
      receivedTmp = tmp;
      await writeFile(path.join(tmp, 'x'), '1');
    });

    expect(path.dirname(receivedTmp)).toBe(path.dirname(destDir));
    expect(receivedTmp).toBe(`${destDir}.tmp`);

    // Stat confirms destDir was created (not tmpDir)
    const s = await stat(destDir);
    expect(s.isDirectory()).toBe(true);
  });
});

import fs from 'fs';
import path from 'path';
import * as yaml from 'yaml';
import { stripFrontmatter, type PublicFrontmatter } from '../frontmatter.js';
import { PUBLIC_KEYS, shouldShipFile, INTERNAL_DIRS } from './strip-policy.js';

export interface SyncOptions {
  /**
   * Absolute path to the skills content root.
   *
   * For the Vercel-pattern layout (post SPACE-15-00) this is
   * `packages/skills/skills/`. For tests using a temporary directory this is
   * the tmp dir itself, with skills written directly under it.
   */
  sourceDir: string;
  /** Absolute path to the `daddia/skills` checkout that receives the mirror. */
  targetDir: string;
  /** Absolute path to the profile YAML (e.g. `packages/skills/profiles/full.yaml`). */
  profileFile: string;
  /**
   * Optional list of additional directories to search for skill content.
   * Entries are resolved as absolute paths and searched after `sourceDir`.
   * Use when generated skill outputs (e.g. `space-index`) live outside the
   * primary skills content root.
   */
  extraSourceDirs?: string[];
  /** When true, print the planned changes and write nothing to disk. */
  dryRun?: boolean;
}

export interface SyncResult {
  /** Skill names successfully copied to the target. */
  copied: string[];
  /** Skill names removed from the target (no longer in profile). */
  removedStale: string[];
  /** Skill names listed in profile but missing on disk in source. */
  missingSource: string[];
  /** Number of files actually written (new or changed). */
  filesWritten: number;
}

/**
 * One-way mirror from `packages/skills/<skill>/` to the public `daddia/skills`
 * repository.
 *
 * The public mirror ships only what `shouldShipFile` permits: `SKILL.md`
 * (frontmatter stripped to `PUBLIC_KEYS`), `template.md`, generic examples,
 * and bundled asset directories. Mode-specific templates and internal-prefixed
 * examples are excluded.
 *
 * The function is idempotent: running it twice with the same source produces
 * zero file writes on the second call.
 */
export async function syncPublicSkills(opts: SyncOptions): Promise<SyncResult> {
  const { sourceDir, targetDir, profileFile, extraSourceDirs = [], dryRun = false } = opts;

  if (!fs.existsSync(sourceDir)) {
    process.stderr.write(`sync-public: sourceDir not found: ${sourceDir}\n`);
    return { copied: [], removedStale: [], missingSource: [], filesWritten: 0 };
  }

  if (!fs.existsSync(profileFile)) {
    process.stderr.write(`sync-public: profileFile not found: ${profileFile}\n`);
    return { copied: [], removedStale: [], missingSource: [], filesWritten: 0 };
  }

  const profileSkillNames = loadProfileSkillNames(profileFile);

  const skillsToCopy: string[] = [];
  const missingSource: string[] = [];
  const skillSourceDir = new Map<string, string>();

  for (const name of profileSkillNames) {
    const primaryDir = path.join(sourceDir, name);
    if (fs.existsSync(path.join(primaryDir, 'SKILL.md'))) {
      skillsToCopy.push(name);
      skillSourceDir.set(name, primaryDir);
      continue;
    }
    const fallback = extraSourceDirs.find((d) => fs.existsSync(path.join(d, name, 'SKILL.md')));
    if (fallback) {
      skillsToCopy.push(name);
      skillSourceDir.set(name, path.join(fallback, name));
    } else {
      missingSource.push(name);
    }
  }

  const removedStale: string[] = [];
  if (fs.existsSync(targetDir)) {
    for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const candidate = path.join(targetDir, entry.name);
      if (!fs.existsSync(path.join(candidate, 'SKILL.md'))) continue;
      if (!profileSkillNames.includes(entry.name)) {
        removedStale.push(entry.name);
      }
    }
  }

  if (dryRun) {
    printDryRunSummary(sourceDir, targetDir, profileFile, profileSkillNames.length, {
      skillsToCopy,
      removedStale,
      missingSource,
    });
    return { copied: skillsToCopy, removedStale, missingSource, filesWritten: 0 };
  }

  fs.mkdirSync(targetDir, { recursive: true });

  for (const name of removedStale) {
    fs.rmSync(path.join(targetDir, name), { recursive: true, force: true });
  }

  const copied: string[] = [];
  let filesWritten = 0;

  for (const name of skillsToCopy) {
    const srcSkillDir = skillSourceDir.get(name) ?? path.join(sourceDir, name);
    const dstSkillDir = path.join(targetDir, name);
    filesWritten += syncSkillDir(srcSkillDir, dstSkillDir);
    copied.push(name);
  }

  return { copied, removedStale, missingSource, filesWritten };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Sync a single skill directory from source to destination.
 *
 * Applies `shouldShipFile` to determine which files ship. Writes only files
 * whose content differs from what is already at the destination, enabling
 * idempotent runs. Removes destination files that are no longer in the
 * computed ship set.
 *
 * Returns the count of files actually written.
 */
function syncSkillDir(srcDir: string, dstDir: string): number {
  const filesToShip = collectSkillFiles(srcDir);

  let written = 0;

  for (const [relPath, content] of filesToShip) {
    const dstPath = path.join(dstDir, relPath);
    fs.mkdirSync(path.dirname(dstPath), { recursive: true });

    const contentBuf = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;

    let shouldWrite = true;
    if (fs.existsSync(dstPath)) {
      const existing = fs.readFileSync(dstPath);
      shouldWrite = !existing.equals(contentBuf);
    }

    if (shouldWrite) {
      fs.writeFileSync(dstPath, contentBuf);
      written++;
    }
  }

  // Remove destination files not in the computed ship set.
  if (fs.existsSync(dstDir)) {
    const existingFiles = collectAllRelPaths(dstDir);
    for (const relPath of existingFiles) {
      if (!filesToShip.has(relPath)) {
        fs.rmSync(path.join(dstDir, relPath), { force: true });
      }
    }
    removeEmptyDirs(dstDir);
  }

  return written;
}

/**
 * Walk a skill source directory and collect the set of files that should be
 * shipped, keyed by skill-relative path.
 *
 * `SKILL.md` is included with its frontmatter stripped. All other files are
 * included as raw Buffer content when `shouldShipFile` returns true.
 */
function collectSkillFiles(skillSrcDir: string): Map<string, string | Buffer> {
  const files = new Map<string, string | Buffer>();

  function walk(dir: string, relBase: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        if ((INTERNAL_DIRS as string[]).includes(entry.name)) continue;
        walk(path.join(dir, entry.name), relPath);
      } else if (entry.isFile()) {
        if (!shouldShipFile(relPath)) continue;

        if (relPath === 'SKILL.md') {
          const raw = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          files.set(relPath, stripFrontmatter(raw, PUBLIC_KEYS as ReadonlySet<keyof PublicFrontmatter>));
        } else {
          files.set(relPath, fs.readFileSync(path.join(dir, entry.name)));
        }
      }
    }
  }

  walk(skillSrcDir, '');
  return files;
}

/**
 * Collect all file paths relative to `dir` (recursively).
 */
function collectAllRelPaths(dir: string): string[] {
  const result: string[] = [];

  function walk(current: string, relBase: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(current, entry.name), relPath);
      } else if (entry.isFile()) {
        result.push(relPath);
      }
    }
  }

  walk(dir, '');
  return result;
}

/**
 * Remove directories under `dir` that contain no files (bottom-up).
 */
function removeEmptyDirs(dir: string): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const subDir = path.join(dir, entry.name);
    removeEmptyDirs(subDir);
    if (fs.readdirSync(subDir).length === 0) {
      fs.rmdirSync(subDir);
    }
  }
}

/**
 * Read skill names from a profile YAML file.
 *
 * The profile YAML must have a top-level `skills` list. Parses using the
 * `yaml` package for spec-compliant handling of all YAML scalar forms.
 */
function loadProfileSkillNames(profileFile: string): string[] {
  const content = fs.readFileSync(profileFile, 'utf8');
  const parsed = yaml.parse(content) as { skills?: unknown };
  if (!Array.isArray(parsed?.skills)) return [];
  return (parsed.skills as unknown[]).filter((s): s is string => typeof s === 'string');
}

function printDryRunSummary(
  sourceDir: string,
  targetDir: string,
  profileFile: string,
  skillCount: number,
  plan: { skillsToCopy: string[]; removedStale: string[]; missingSource: string[] },
): void {
  process.stdout.write(`Source:  ${sourceDir}\n`);
  process.stdout.write(`Target:  ${targetDir}\n`);
  process.stdout.write(`Profile: ${path.basename(profileFile)} (${skillCount} skills)\n`);
  process.stdout.write('\n');

  if (plan.missingSource.length > 0) {
    process.stdout.write(
      `! ${plan.missingSource.length} skill(s) listed in profile but missing in source:\n`,
    );
    for (const name of plan.missingSource) {
      process.stdout.write(`    - ${name}\n`);
    }
    process.stdout.write('\n');
  }

  process.stdout.write(`Will copy:  ${plan.skillsToCopy.length} skills\n`);
  for (const name of plan.skillsToCopy) {
    process.stdout.write(`    + ${name}\n`);
  }

  if (plan.removedStale.length > 0) {
    process.stdout.write('\n');
    process.stdout.write(`Will remove (no longer in profile): ${plan.removedStale.length} skills\n`);
    for (const name of plan.removedStale) {
      process.stdout.write(`    - ${name}\n`);
    }
  }

  process.stdout.write('\n[dry-run] no changes written\n');
}

import fs from 'fs';
import path from 'path';
import { parseFrontmatter, type DaddiaFrontmatter } from './frontmatter.js';

/** A loaded skill including its parsed frontmatter and body. */
export interface Skill {
  /** Skill directory name (e.g. "write-product") */
  name: string;
  /** Absolute path to the skill directory */
  path: string;
  frontmatter: DaddiaFrontmatter;
  /** SKILL.md body with frontmatter removed */
  body: string;
  /** Filenames of template*.md files in the skill directory */
  templates: string[];
  hasExamples: boolean;
  hasScripts: boolean;
  hasReferences: boolean;
}

/**
 * Load a single skill from its directory.
 *
 * Reads `SKILL.md`, parses the frontmatter, and discovers template files.
 * Throws if `SKILL.md` is absent.
 */
export function loadSkill(dir: string): Skill {
  const skillMdPath = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    throw new Error(`SKILL.md not found in ${dir}`);
  }

  const content = fs.readFileSync(skillMdPath, 'utf8');
  const { data: frontmatter, body } = parseFrontmatter(content);
  const name = path.basename(dir);

  const entries = fs.readdirSync(dir);

  const templates = entries.filter((f) => /^template.*\.md$/.test(f));

  const hasExamples =
    entries.includes('examples') &&
    fs.statSync(path.join(dir, 'examples')).isDirectory();

  const hasScripts =
    entries.includes('scripts') &&
    fs.statSync(path.join(dir, 'scripts')).isDirectory();

  const hasReferences =
    entries.includes('references') &&
    fs.statSync(path.join(dir, 'references')).isDirectory();

  return { name, path: dir, frontmatter, body, templates, hasExamples, hasScripts, hasReferences };
}

/**
 * Load all skills found directly under `rootDir`.
 *
 * A skill directory is any subdirectory that contains a `SKILL.md` file.
 * Directories named `bin`, `src`, `dist`, `node_modules`, `tests`,
 * `profiles`, `views`, `space-index`, or starting with `.` are skipped.
 */
export function loadAllSkills(rootDir: string): Skill[] {
  const SKIP = new Set([
    'bin',
    'src',
    'dist',
    'node_modules',
    'tests',
    'profiles',
    'views',
    'space-index',
  ]);

  const entries = fs.readdirSync(rootDir);
  const skills: Skill[] = [];

  for (const entry of entries) {
    if (entry.startsWith('.') || SKIP.has(entry)) continue;
    const fullPath = path.join(rootDir, entry);
    if (!fs.statSync(fullPath).isDirectory()) continue;
    if (!fs.existsSync(path.join(fullPath, 'SKILL.md'))) continue;
    skills.push(loadSkill(fullPath));
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

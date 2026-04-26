import fs from 'node:fs/promises';
import path from 'node:path';

export type TemplateVars = Record<string, string>;
export type RenderMode = 'greenfield' | 'idempotent';

const TEMPLATE_PATTERN = /\{([a-z][a-zA-Z]*)\}/g;
const SPACE_CONFIG_RELATIVE = path.join('.space', 'config');

function substitute(content: string, vars: TemplateVars): string {
  return content.replace(TEMPLATE_PATTERN, (_match, key: string) => {
    return vars[key] ?? _match;
  });
}

export async function renderTemplate(
  templateDir: string,
  targetDir: string,
  vars: TemplateVars,
  mode: RenderMode = 'greenfield',
): Promise<string[]> {
  const defaultDir = path.join(templateDir, 'default');
  const created: string[] = [];
  await copyDir(defaultDir, targetDir, targetDir, vars, mode, created);
  return created;
}

async function copyDir(
  src: string,
  dest: string,
  rootDest: string,
  vars: TemplateVars,
  mode: RenderMode,
  created: string[],
): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destName = substituteFilename(entry.name, vars);
    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, rootDest, vars, mode, created);
    } else {
      const raw = await fs.readFile(srcPath, 'utf-8');
      const content = substitute(raw, vars);
      const relPath = path.relative(rootDest, destPath);

      if (mode === 'idempotent') {
        const isSpaceConfig = relPath === SPACE_CONFIG_RELATIVE;

        if (isSpaceConfig) {
          const written = await mergeSpaceConfig(destPath, content);
          if (written) created.push(relPath);
        } else {
          const exists = await fileExists(destPath);
          if (!exists) {
            await fs.writeFile(destPath, content);
            created.push(relPath);
          }
        }
      } else {
        await fs.writeFile(destPath, content);
        created.push(path.relative(rootDest, destPath));
      }
    }
  }
}

/**
 * Merges top-level keys from templateContent into the existing config file.
 * Keys already present in the existing file are preserved as-is; only absent
 * top-level blocks are appended. No YAML library is used — detection is done
 * by scanning for lines that start at column 0 with `key:`.
 * Returns true when the file was written, false when it was unchanged.
 */
async function mergeSpaceConfig(destPath: string, templateContent: string): Promise<boolean> {
  let existing: string;
  try {
    existing = await fs.readFile(destPath, 'utf-8');
  } catch {
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, templateContent);
    return true;
  }

  const existingKeys = extractTopLevelKeys(existing);
  const templateBlocks = splitIntoTopLevelBlocks(templateContent);

  const blocksToAppend = templateBlocks.filter(({ key }) => !existingKeys.has(key));
  if (blocksToAppend.length === 0) return false;

  const suffix = blocksToAppend.map(({ block }) => block).join('\n');
  const separator = existing.endsWith('\n') ? '\n' : '\n\n';
  await fs.writeFile(destPath, existing + separator + suffix);
  return true;
}

/** Returns the set of top-level YAML key names found in content.
 * Uses a line scan so that comments and block scalars are never re-parsed
 * as structure. Trade-off: a key that literally appears at column 0 inside
 * a quoted or block scalar value would be misclassified, but the .space/config
 * shape never has such values.
 */
function extractTopLevelKeys(content: string): Set<string> {
  const keys = new Set<string>();
  for (const line of content.split('\n')) {
    const match = /^([a-zA-Z_][\w-]*):/.exec(line);
    if (match) keys.add(match[1]!);
  }
  return keys;
}

/**
 * Splits YAML content into top-level blocks. Each block starts at a line
 * whose first character is a key identifier and runs until the next such
 * line. Comment and blank lines that precede the first top-level key are
 * discarded; those that follow a key belong to that key's block.
 */
function splitIntoTopLevelBlocks(content: string): Array<{ key: string; block: string }> {
  const lines = content.split('\n');
  const blocks: Array<{ key: string; lines: string[] }> = [];
  let current: { key: string; lines: string[] } | null = null;

  for (const line of lines) {
    const match = /^([a-zA-Z_][\w-]*):/.exec(line);
    if (match) {
      if (current) blocks.push(current);
      current = { key: match[1]!, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  return blocks.map(({ key, lines }) => ({ key, block: lines.join('\n') }));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function substituteFilename(name: string, vars: TemplateVars): string {
  const project = vars['project'] ?? '';
  return name.replace(/\{project\}/g, project);
}

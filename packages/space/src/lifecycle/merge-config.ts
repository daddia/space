import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Default: the sibling-mode .space/config template bundled with this package.
 * Resolved from dist/lifecycle/ → ../../template/default/.space/config at the package root.
 */
const DEFAULT_TEMPLATE_CONFIG_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'template',
  'default',
  '.space',
  'config',
);

/**
 * Creates .space/config from the template when it does not exist.
 * When it does exist, merges any top-level keys that are absent from the
 * existing file by appending the missing blocks. The existing file content
 * is preserved byte-for-byte — no YAML round-trip, so comments and key
 * ordering are never lost.
 *
 * templateConfigPath defaults to the sibling-mode template bundled with the
 * package. Pass an explicit path for embedded-mode or custom templates.
 */
export async function mergeOrCreateConfig(
  targetDir: string,
  templateConfigPath?: string,
): Promise<void> {
  const resolvedTemplate = templateConfigPath ?? DEFAULT_TEMPLATE_CONFIG_PATH;
  const configPath = path.join(targetDir, '.space', 'config');
  const templateContent = await fs.readFile(resolvedTemplate, 'utf-8');

  let existing: string;
  try {
    existing = await fs.readFile(configPath, 'utf-8');
  } catch {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, templateContent);
    return;
  }

  const existingKeys = extractTopLevelKeys(existing);
  const templateBlocks = splitIntoTopLevelBlocks(templateContent);

  const blocksToAppend = templateBlocks.filter(({ key }) => !existingKeys.has(key));
  if (blocksToAppend.length === 0) return;

  const suffix = blocksToAppend.map(({ block }) => block).join('\n');
  const separator = existing.endsWith('\n') ? '\n' : '\n\n';
  await fs.writeFile(configPath, existing + separator + suffix);
}

/**
 * Returns the set of top-level YAML key names found in content.
 * Uses a line scan rather than a YAML parser so that comments and block
 * scalars are never misread as structure. The trade-off: a key name that
 * appears inside a quoted scalar or block scalar value at column 0 would
 * be misclassified, but the .space/config shape never has such values.
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

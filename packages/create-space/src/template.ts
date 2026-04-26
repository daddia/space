import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

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
        created.push(path.relative(dest, destPath));
      }
    }
  }
}

/**
 * Merges top-level keys from templateContent into the existing config file.
 * Keys already present in the existing file are preserved as-is.
 * If the existing file cannot be parsed as YAML the template content is
 * written directly (treating the existing file as corrupt).
 * Returns true when the file was written, false when it was unchanged.
 */
async function mergeSpaceConfig(destPath: string, templateContent: string): Promise<boolean> {
  let existing: string;
  try {
    existing = await fs.readFile(destPath, 'utf-8');
  } catch {
    // File does not exist yet — write the full template content
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, templateContent);
    return true;
  }

  let existingData: Record<string, unknown>;
  try {
    const parsed = parseYaml(existing);
    existingData = parsed != null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    // Unparseable YAML — overwrite with template and warn
    console.warn(`Warning: .space/config could not be parsed as YAML; overwriting with template.`);
    await fs.writeFile(destPath, templateContent);
    return true;
  }

  let templateData: Record<string, unknown>;
  try {
    const parsed = parseYaml(templateContent);
    templateData = parsed != null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return false;
  }

  // Add only keys that are absent from the existing config
  let changed = false;
  for (const [key, value] of Object.entries(templateData)) {
    if (!(key in existingData)) {
      existingData[key] = value;
      changed = true;
    }
  }

  if (!changed) return false;

  await fs.writeFile(destPath, stringifyYaml(existingData));
  return true;
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

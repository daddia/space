import fs from 'node:fs/promises';
import path from 'node:path';

export type TemplateVars = Record<string, string>;

const TEMPLATE_PATTERN = /\{([a-z][a-zA-Z]*)\}/g;

function substitute(content: string, vars: TemplateVars): string {
  return content.replace(TEMPLATE_PATTERN, (_match, key: string) => {
    return vars[key] ?? _match;
  });
}

export async function renderTemplate(
  templateDir: string,
  targetDir: string,
  vars: TemplateVars,
): Promise<string[]> {
  const defaultDir = path.join(templateDir, 'default');
  const created: string[] = [];
  await copyDir(defaultDir, targetDir, vars, created);
  return created;
}

async function copyDir(
  src: string,
  dest: string,
  vars: TemplateVars,
  created: string[],
): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destName = substituteFilename(entry.name, vars);
    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, vars, created);
    } else {
      const raw = await fs.readFile(srcPath, 'utf-8');
      const content = substitute(raw, vars);
      await fs.writeFile(destPath, content);
      created.push(path.relative(dest, destPath));
    }
  }
}

function substituteFilename(name: string, vars: TemplateVars): string {
  const project = vars['project'] ?? '';
  return name.replace(/\{project\}/g, project);
}

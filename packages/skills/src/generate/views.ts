import type { Skill } from '../skill.js';

export interface RoleView {
  file: string;
  title: string;
  matches: string[];
}

export const ROLE_VIEWS: readonly RoleView[] = [
  { file: 'pm.md', title: 'PM & Founder', matches: ['pm', 'founder'] },
  { file: 'architect.md', title: 'Architect', matches: ['architect'] },
  { file: 'engineer.md', title: 'Engineer', matches: ['engineer'] },
  { file: 'delivery.md', title: 'Delivery Lead', matches: ['delivery'] },
];

function excerpt(desc: string): string {
  if (desc.length <= 120) return desc;
  return desc.slice(0, 120).replace(/\s+\S*$/, '') + '...';
}

/**
 * Return true when a skill's `role` value (string or array) contains at least
 * one of the supplied `matchValues`.
 */
export function roleMatches(role: unknown, matchValues: string[]): boolean {
  if (!role) return false;
  const roles = Array.isArray(role) ? (role as string[]) : [role as string];
  return matchValues.some((m) => roles.includes(m));
}

/**
 * Build the full Markdown content of a role-filtered view file.
 *
 * The `skills` parameter should already be filtered to only those relevant to
 * this role view. Returns the complete file content including a trailing newline.
 */
export function buildRoleView(roleTitle: string, skills: Skill[]): string {
  const header = [
    `# Skills \u2014 ${roleTitle}`,
    '',
    'Generated from `packages/skills/*/SKILL.md` frontmatter. Run',
    '`pnpm generate:views` to refresh.',
    '',
    '| Skill | What it does | Artefact | Track | Consumes | Produces |',
    '| --- | --- | --- | --- | --- | --- |',
  ].join('\n');

  const rows = skills.map((skill) => {
    const fm = skill.frontmatter;
    const desc = typeof fm.description === 'string' ? fm.description : '';
    const artefact = fm.artefact ?? '\u2014';
    const track = fm.track ?? '\u2014';
    const consumes =
      Array.isArray(fm.consumes) && fm.consumes.length > 0
        ? fm.consumes.join(', ')
        : '\u2014';
    const produces =
      Array.isArray(fm.produces) && fm.produces.length > 0
        ? fm.produces.join(', ')
        : '\u2014';
    return `| ${skill.name} | ${excerpt(desc)} | ${artefact} | ${track} | ${consumes} | ${produces} |`;
  });

  return [header, ...rows].join('\n') + '\n';
}

/**
 * Generate all role view file contents from a flat skill list.
 *
 * Returns a map from filename (e.g. `"pm.md"`) to file content string.
 * Skills with `stage: deprecated` are excluded from all views.
 */
export function generateViews(skills: Skill[]): Record<string, string> {
  const stable = skills.filter((s) => s.frontmatter.stage !== 'deprecated');
  const result: Record<string, string> = {};

  for (const view of ROLE_VIEWS) {
    const filtered = stable.filter((s) => roleMatches(s.frontmatter.role, view.matches));
    result[view.file] = buildRoleView(view.title, filtered);
  }

  return result;
}

import type { Skill } from '../skill.js';

const HEADER = '| Skill | Description (excerpt) | Artefact | Track | Role | Consumes | Produces |';
const SEPARATOR = '| --- | --- | --- | --- | --- | --- | --- |';

function excerpt(desc: string): string {
  if (desc.length <= 120) return desc;
  return desc.slice(0, 120).replace(/\s+\S*$/, '') + '...';
}

/**
 * Build the Markdown table rows from a list of skills.
 *
 * Returns a string containing the header, separator, and one row per skill,
 * joined by newlines, with no trailing newline.
 */
export function generateIndexTable(skills: Skill[]): string {
  const rows = skills.map((skill) => {
    const fm = skill.frontmatter;
    const desc = typeof fm.description === 'string' ? fm.description : '';
    const artefact = fm.artefact ?? '—';
    const track = fm.track ?? '—';
    const role = Array.isArray(fm.role) ? fm.role.join(', ') : (fm.role ?? '—');
    const consumes =
      Array.isArray(fm.consumes) && fm.consumes.length > 0 ? fm.consumes.join(', ') : '—';
    const produces =
      Array.isArray(fm.produces) && fm.produces.length > 0 ? fm.produces.join(', ') : '—';
    return `| ${skill.name} | ${excerpt(desc)} | ${artefact} | ${track} | ${role} | ${consumes} | ${produces} |`;
  });

  return [HEADER, SEPARATOR, ...rows].join('\n');
}

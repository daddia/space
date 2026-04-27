import * as yaml from 'yaml';

/** Daddia source frontmatter -- all fields available in packages/skills/ */
export interface DaddiaFrontmatter {
  // Required (open spec)
  name: string;
  description: string;

  // Open-spec optional
  'allowed-tools'?: string[];
  'argument-hint'?: string;
  license?: string;

  // Daddia-specific (stripped at publish)
  artefact?: string;
  track?: 'strategy' | 'discovery' | 'architecture' | 'delivery' | 'refine' | 'utility';
  'also-relevant-to-tracks'?: string[];
  role?: 'pm' | 'architect' | 'engineer' | 'delivery' | 'utility';
  'also-relevant-to-roles'?: string[];
  domain?: string;
  stage?: 'stable' | 'draft' | 'deprecated' | 'deferred';
  consumes?: string[];
  produces?: string[];
  prerequisites?: string[];
  related?: string[];
  when_to_use?: string;
  tags?: string[];
  owner?: string;
  version?: string;
}

/** Public-spec frontmatter -- shipped to daddia/skills */
export interface PublicFrontmatter {
  name: string;
  description: string;
  'allowed-tools'?: string[];
  'argument-hint'?: string;
  license?: string;
}

/** The set of keys permitted in the public mirror's frontmatter */
export const PUBLIC_KEYS: ReadonlySet<keyof PublicFrontmatter> = new Set([
  'name',
  'description',
  'allowed-tools',
  'argument-hint',
  'license',
]);

/**
 * Split the YAML frontmatter block from the Markdown body.
 * Returns empty frontmatter string and the full content as body when no
 * frontmatter fence is present.
 */
function splitFrontmatterBlock(content: string): { raw: string; body: string } {
  if (!content.startsWith('---\n')) {
    return { raw: '', body: content };
  }
  const end = content.indexOf('\n---', 4);
  if (end === -1) {
    return { raw: '', body: content };
  }
  const raw = content.slice(4, end);
  // Body starts after the closing `---`, skip one leading newline
  const body = content.slice(end + 4).replace(/^\n/, '');
  return { raw, body };
}

/**
 * Parse a SKILL.md string into typed daddia frontmatter and the body text.
 *
 * Uses the `yaml` package for spec-compliant parsing, which correctly handles
 * folded scalars (`> `), literal blocks, quoted strings, and list values.
 */
export function parseFrontmatter(content: string): { data: DaddiaFrontmatter; body: string } {
  const { raw, body } = splitFrontmatterBlock(content);
  const parsed = raw ? (yaml.parse(raw) as unknown) : {};
  const data = ((parsed ?? {}) as unknown) as DaddiaFrontmatter;
  return { data, body };
}

/**
 * Serialise a `DaddiaFrontmatter` object back to a fenced YAML frontmatter
 * string (including the `---` fences and a trailing newline).
 */
export function serialiseFrontmatter(data: DaddiaFrontmatter): string {
  const doc = yaml.stringify(data, {
    defaultStringType: 'PLAIN',
    lineWidth: 0,
  });
  return `---\n${doc}---\n`;
}

/**
 * Return a copy of `content` whose frontmatter retains only the keys present
 * in `allowedKeys`. The body is reproduced byte-for-byte.
 *
 * If the content has no frontmatter fence the original string is returned
 * unchanged.
 */
export function stripFrontmatter(
  content: string,
  allowedKeys: ReadonlySet<keyof PublicFrontmatter>,
): string {
  const { raw, body } = splitFrontmatterBlock(content);
  if (!raw) return content;

  const parsed = yaml.parse(raw) as Record<string, unknown> | null;
  if (!parsed) return content;

  const stripped: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(parsed, key)) {
      stripped[key] = parsed[key];
    }
  }

  const doc = yaml.stringify(stripped, {
    defaultStringType: 'PLAIN',
    lineWidth: 0,
  });
  // body already carries its own leading newline (from the blank line between
  // the closing --- fence and the first heading), so append it directly to
  // keep the round-trip byte-identical.
  return `---\n${doc}---\n${body}`;
}

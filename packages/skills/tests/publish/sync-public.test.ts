import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { syncPublicSkills } from '../../src/publish/sync-public.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sync-public-test-'));
}

const MINIMAL_FRONTMATTER = `---
name: write-product
description: Drafts product.md. Do NOT use for roadmaps.
track: strategy
role: pm
stage: stable
owner: daddia
version: '1.0.0'
---

# Write Product

Body content here.
`;

const PUBLIC_FRONTMATTER_ONLY = `---
name: write-product
description: Drafts product.md. Do NOT use for roadmaps.
---

# Write Product

Body content here.
`;

function writeSkillMd(srcDir: string, skillName: string, content = MINIMAL_FRONTMATTER): string {
  const skillDir = path.join(srcDir, skillName);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);
  return skillDir;
}

function writeProfileYaml(srcDir: string, skillNames: string[]): string {
  const profilesDir = path.join(srcDir, 'profiles');
  fs.mkdirSync(profilesDir, { recursive: true });
  const profilePath = path.join(profilesDir, 'full.yaml');
  const content = `name: full\ndescription: All stable skills\nskills:\n${skillNames.map((n) => `  - ${n}`).join('\n')}\n`;
  fs.writeFileSync(profilePath, content);
  return profilePath;
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

describe('syncPublicSkills: copy', () => {
  let srcDir: string;
  let dstDir: string;
  let profileFile: string;

  beforeEach(() => {
    srcDir = makeTmpDir();
    dstDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(dstDir, { recursive: true, force: true });
  });

  it('copies SKILL.md to target skill directory', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    const result = await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    expect(result.copied).toEqual(['write-product']);
    expect(fs.existsSync(path.join(dstDir, 'write-product', 'SKILL.md'))).toBe(true);
  });

  it('copies multiple skills from profile', async () => {
    writeSkillMd(srcDir, 'write-product');
    writeSkillMd(srcDir, 'implement');
    profileFile = writeProfileYaml(srcDir, ['write-product', 'implement']);

    const result = await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    expect(result.copied).toHaveLength(2);
    expect(fs.existsSync(path.join(dstDir, 'write-product', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(dstDir, 'implement', 'SKILL.md'))).toBe(true);
  });

  it('autocreates target directory when missing', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    const nestedTarget = path.join(dstDir, 'new-nested', 'dir');

    const result = await syncPublicSkills({
      sourceDir: srcDir,
      targetDir: nestedTarget,
      profileFile,
    });

    expect(result.copied).toHaveLength(1);
    expect(fs.existsSync(path.join(nestedTarget, 'write-product', 'SKILL.md'))).toBe(true);
  });

  it('reports filesWritten equal to the number of files copied', async () => {
    const skillDir = writeSkillMd(srcDir, 'write-product');
    fs.writeFileSync(path.join(skillDir, 'template.md'), '# Template');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    const result = await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    // SKILL.md + template.md
    expect(result.filesWritten).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Strip
// ---------------------------------------------------------------------------

describe('syncPublicSkills: frontmatter strip', () => {
  let srcDir: string;
  let dstDir: string;
  let profileFile: string;

  beforeEach(() => {
    srcDir = makeTmpDir();
    dstDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(dstDir, { recursive: true, force: true });
  });

  it('strips daddia-specific frontmatter fields from SKILL.md', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    const published = fs.readFileSync(path.join(dstDir, 'write-product', 'SKILL.md'), 'utf8');
    expect(published).toContain('name: write-product');
    expect(published).toContain('description:');
    expect(published).not.toContain('track:');
    expect(published).not.toContain('role:');
    expect(published).not.toContain('stage:');
    expect(published).not.toContain('owner:');
    expect(published).not.toContain('version:');
  });

  it('preserves the SKILL.md body byte-for-byte after stripping', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    const published = fs.readFileSync(path.join(dstDir, 'write-product', 'SKILL.md'), 'utf8');
    expect(published).toContain('# Write Product');
    expect(published).toContain('Body content here.');
  });

  it('preserves allowed-tools when present in source', async () => {
    const content = `---\nname: implement\ndescription: Implements a story. Do NOT skip tests.\nallowed-tools:\n  - Read\n  - Write\ntrack: delivery\nrole: engineer\nstage: stable\n---\n\n# Implement\n`;
    writeSkillMd(srcDir, 'implement', content);
    profileFile = writeProfileYaml(srcDir, ['implement']);

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    const published = fs.readFileSync(path.join(dstDir, 'implement', 'SKILL.md'), 'utf8');
    expect(published).toContain('allowed-tools:');
    expect(published).toContain('Read');
    expect(published).toContain('Write');
    expect(published).not.toContain('track:');
  });

  it('produces the exact expected public frontmatter', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    const published = fs.readFileSync(path.join(dstDir, 'write-product', 'SKILL.md'), 'utf8');
    expect(published).toBe(PUBLIC_FRONTMATTER_ONLY);
  });
});

// ---------------------------------------------------------------------------
// Asset filter: templates
// ---------------------------------------------------------------------------

describe('syncPublicSkills: template asset filter', () => {
  let srcDir: string;
  let dstDir: string;
  let profileFile: string;

  beforeEach(() => {
    srcDir = makeTmpDir();
    dstDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(dstDir, { recursive: true, force: true });
  });

  it('ships template.md', async () => {
    const skillDir = writeSkillMd(srcDir, 'write-backlog');
    fs.writeFileSync(path.join(skillDir, 'template.md'), '# Generic template');
    profileFile = writeProfileYaml(srcDir, ['write-backlog']);

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    expect(fs.existsSync(path.join(dstDir, 'write-backlog', 'template.md'))).toBe(true);
  });

  it('excludes template-*.md mode variants', async () => {
    const skillDir = writeSkillMd(srcDir, 'write-backlog');
    fs.writeFileSync(path.join(skillDir, 'template.md'), '# Generic');
    fs.writeFileSync(path.join(skillDir, 'template-domain.md'), '# Domain mode');
    fs.writeFileSync(path.join(skillDir, 'template-work-package.md'), '# WP mode');
    profileFile = writeProfileYaml(srcDir, ['write-backlog']);

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    const dstSkillDir = path.join(dstDir, 'write-backlog');
    expect(fs.existsSync(path.join(dstSkillDir, 'template.md'))).toBe(true);
    expect(fs.existsSync(path.join(dstSkillDir, 'template-domain.md'))).toBe(false);
    expect(fs.existsSync(path.join(dstSkillDir, 'template-work-package.md'))).toBe(false);
  });

  it('target contains exactly one template.md and zero template-*.md after sync', async () => {
    const skillDir = writeSkillMd(srcDir, 'write-backlog');
    fs.writeFileSync(path.join(skillDir, 'template.md'), '# Generic');
    fs.writeFileSync(path.join(skillDir, 'template-domain.md'), '# Domain');
    fs.writeFileSync(path.join(skillDir, 'template-work-package.md'), '# WP');
    profileFile = writeProfileYaml(srcDir, ['write-backlog']);

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    const dstSkillDir = path.join(dstDir, 'write-backlog');
    const files = fs.readdirSync(dstSkillDir);
    const templateFiles = files.filter((f) => /^template.*\.md$/.test(f));
    const modeVariants = files.filter((f) => /^template-.+\.md$/.test(f));

    expect(templateFiles).toHaveLength(1);
    expect(templateFiles[0]).toBe('template.md');
    expect(modeVariants).toHaveLength(0);
  });

  it('removes stale template-*.md files already present in target on re-sync', async () => {
    const skillDir = writeSkillMd(srcDir, 'write-backlog');
    fs.writeFileSync(path.join(skillDir, 'template.md'), '# Generic');
    profileFile = writeProfileYaml(srcDir, ['write-backlog']);

    // Simulate a stale variant left by a prior run
    const dstSkillDir = path.join(dstDir, 'write-backlog');
    fs.mkdirSync(dstSkillDir, { recursive: true });
    fs.writeFileSync(path.join(dstSkillDir, 'template-stale-variant.md'), '# Stale');

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    expect(fs.existsSync(path.join(dstSkillDir, 'template-stale-variant.md'))).toBe(false);
    expect(fs.existsSync(path.join(dstSkillDir, 'template.md'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Asset filter: examples
// ---------------------------------------------------------------------------

describe('syncPublicSkills: example asset filter', () => {
  let srcDir: string;
  let dstDir: string;
  let profileFile: string;

  beforeEach(() => {
    srcDir = makeTmpDir();
    dstDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(dstDir, { recursive: true, force: true });
  });

  it('excludes examples prefixed with internal project names', async () => {
    const skillDir = writeSkillMd(srcDir, 'write-product');
    const examplesDir = path.join(skillDir, 'examples');
    fs.mkdirSync(examplesDir);
    fs.writeFileSync(path.join(examplesDir, 'cart-product.md'), '# Cart product example');
    fs.writeFileSync(path.join(examplesDir, 'space-product.md'), '# Space product example');
    fs.writeFileSync(path.join(examplesDir, 'workflow-engine.md'), '# Workflow engine example');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    const dstExamples = path.join(dstDir, 'write-product', 'examples');
    expect(fs.existsSync(path.join(dstExamples, 'cart-product.md'))).toBe(false);
    expect(fs.existsSync(path.join(dstExamples, 'space-product.md'))).toBe(false);
    expect(fs.existsSync(path.join(dstExamples, 'workflow-engine.md'))).toBe(false);
  });

  it('ships generic examples not matching internal prefixes', async () => {
    const skillDir = writeSkillMd(srcDir, 'write-product');
    const examplesDir = path.join(skillDir, 'examples');
    fs.mkdirSync(examplesDir);
    fs.writeFileSync(path.join(examplesDir, 'cart-product.md'), '# Cart');
    fs.writeFileSync(path.join(examplesDir, 'product.md'), '# Generic app');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    const dstExamples = path.join(dstDir, 'write-product', 'examples');
    expect(fs.existsSync(path.join(dstExamples, 'product.md'))).toBe(true);
    expect(fs.existsSync(path.join(dstExamples, 'cart-product.md'))).toBe(false);
  });

  it('excludes files under .internal directory', async () => {
    const skillDir = writeSkillMd(srcDir, 'write-product');
    const internalDir = path.join(skillDir, 'examples', '.internal');
    fs.mkdirSync(internalDir, { recursive: true });
    fs.writeFileSync(path.join(internalDir, 'private-example.md'), '# Internal only');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    const dstInternal = path.join(dstDir, 'write-product', 'examples', '.internal');
    expect(fs.existsSync(dstInternal)).toBe(false);
  });

  it('excludes files under .private directory', async () => {
    const skillDir = writeSkillMd(srcDir, 'write-product');
    const privateDir = path.join(skillDir, '.private');
    fs.mkdirSync(privateDir, { recursive: true });
    fs.writeFileSync(path.join(privateDir, 'secret.md'), '# Secret');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    expect(fs.existsSync(path.join(dstDir, 'write-product', '.private'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Remove stale
// ---------------------------------------------------------------------------

describe('syncPublicSkills: remove-stale', () => {
  let srcDir: string;
  let dstDir: string;
  let profileFile: string;

  beforeEach(() => {
    srcDir = makeTmpDir();
    dstDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(dstDir, { recursive: true, force: true });
  });

  it('removes a skill directory from target when skill is removed from profile', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    // Simulate a stale skill in target not in profile
    const staleDir = path.join(dstDir, 'deprecated-skill');
    fs.mkdirSync(staleDir, { recursive: true });
    fs.writeFileSync(path.join(staleDir, 'SKILL.md'), '# Deprecated');

    const result = await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    expect(result.removedStale).toEqual(['deprecated-skill']);
    expect(fs.existsSync(staleDir)).toBe(false);
  });

  it('lists removed stale skills in the result', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    const staleDir1 = path.join(dstDir, 'old-skill-a');
    const staleDir2 = path.join(dstDir, 'old-skill-b');
    for (const d of [staleDir1, staleDir2]) {
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'SKILL.md'), '# Old');
    }

    const result = await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    expect(result.removedStale).toContain('old-skill-a');
    expect(result.removedStale).toContain('old-skill-b');
  });

  it('does not remove target directories without SKILL.md (e.g. README, LICENSE)', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    // Target-owned files that should not be touched
    fs.writeFileSync(path.join(dstDir, 'README.md'), '# Public skills');
    fs.writeFileSync(path.join(dstDir, 'LICENSE'), 'MIT');

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    expect(fs.existsSync(path.join(dstDir, 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(dstDir, 'LICENSE'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Dry run
// ---------------------------------------------------------------------------

describe('syncPublicSkills: dry-run', () => {
  let srcDir: string;
  let dstDir: string;
  let profileFile: string;

  beforeEach(() => {
    srcDir = makeTmpDir();
    dstDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(dstDir, { recursive: true, force: true });
  });

  it('writes nothing to disk when dryRun is true', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile, dryRun: true });

    expect(fs.existsSync(path.join(dstDir, 'write-product'))).toBe(false);
  });

  it('reports filesWritten as 0 in dry-run', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    const result = await syncPublicSkills({
      sourceDir: srcDir,
      targetDir: dstDir,
      profileFile,
      dryRun: true,
    });

    expect(result.filesWritten).toBe(0);
  });

  it('still returns planned copied and removedStale in dry-run', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    const staleDir = path.join(dstDir, 'stale-skill');
    fs.mkdirSync(staleDir, { recursive: true });
    fs.writeFileSync(path.join(staleDir, 'SKILL.md'), '# Stale');

    const result = await syncPublicSkills({
      sourceDir: srcDir,
      targetDir: dstDir,
      profileFile,
      dryRun: true,
    });

    expect(result.copied).toEqual(['write-product']);
    expect(result.removedStale).toEqual(['stale-skill']);
    // Stale dir not actually removed in dry-run
    expect(fs.existsSync(staleDir)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Missing source
// ---------------------------------------------------------------------------

describe('syncPublicSkills: missing-source warning', () => {
  let srcDir: string;
  let dstDir: string;
  let profileFile: string;

  beforeEach(() => {
    srcDir = makeTmpDir();
    dstDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(dstDir, { recursive: true, force: true });
  });

  it('reports skills listed in profile but absent on disk', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['write-product', 'ghost-skill']);

    const result = await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    expect(result.missingSource).toEqual(['ghost-skill']);
    expect(result.copied).toEqual(['write-product']);
  });

  it('continues syncing other skills when some are missing', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['missing-a', 'write-product', 'missing-b']);

    const result = await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    expect(result.missingSource).toContain('missing-a');
    expect(result.missingSource).toContain('missing-b');
    expect(result.copied).toEqual(['write-product']);
  });
});

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

describe('syncPublicSkills: idempotency', () => {
  let srcDir: string;
  let dstDir: string;
  let profileFile: string;

  beforeEach(() => {
    srcDir = makeTmpDir();
    dstDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(dstDir, { recursive: true, force: true });
  });

  it('produces 0 files written on the second run with the same source', async () => {
    const skillDir = writeSkillMd(srcDir, 'write-product');
    fs.writeFileSync(path.join(skillDir, 'template.md'), '# Template');
    const examplesDir = path.join(skillDir, 'examples');
    fs.mkdirSync(examplesDir);
    fs.writeFileSync(path.join(examplesDir, 'product.md'), '# Generic example');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    const first = await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });
    expect(first.filesWritten).toBeGreaterThan(0);

    const second = await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });
    expect(second.filesWritten).toBe(0);
  });

  it('produces no file content differences on a second run', async () => {
    writeSkillMd(srcDir, 'write-product');
    profileFile = writeProfileYaml(srcDir, ['write-product']);

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    const contentAfterFirst = fs.readFileSync(
      path.join(dstDir, 'write-product', 'SKILL.md'),
      'utf8',
    );

    await syncPublicSkills({ sourceDir: srcDir, targetDir: dstDir, profileFile });

    const contentAfterSecond = fs.readFileSync(
      path.join(dstDir, 'write-product', 'SKILL.md'),
      'utf8',
    );

    expect(contentAfterSecond).toBe(contentAfterFirst);
  });
});

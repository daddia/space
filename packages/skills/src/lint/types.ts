import type { Skill } from '../skill.js';

export interface Diagnostic {
  rule: string;
  severity: 'error' | 'warning';
  skill: string;
  message: string;
  hint?: string;
}

export type LintRule = (skill: Skill, allSkills: Skill[]) => Diagnostic[];

import { config as dotenvConfig } from 'dotenv';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AtlassianCredentials {
  /** Base URL with no trailing slash, e.g. https://org.atlassian.net */
  baseUrl: string;
  /** Atlassian account email address */
  user: string;
  /** Atlassian API token */
  apiToken: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class CredentialError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        `Add them to .env at the workspace root.`,
    );
    this.name = 'CredentialError';
    this.missing = missing;
  }
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/**
 * Loads `.env` from the workspace root into process.env (does not override
 * vars already set in the environment), then validates and returns credentials.
 *
 * Call from CLI commands after findWorkspaceRoot() resolves the root.
 */
export function loadCredentials(workspaceRoot: string): AtlassianCredentials {
  dotenvConfig({ path: path.join(workspaceRoot, '.env'), override: false });
  return parseCredentials(process.env);
}

/**
 * Validates an env map and returns typed credentials.
 * Exported separately so tests can pass a mock env without touching
 * process.env or the filesystem.
 */
export function parseCredentials(env: Record<string, string | undefined>): AtlassianCredentials {
  const baseUrl = env['ATLASSIAN_BASE_URL'];
  const user = env['ATLASSIAN_USER'];
  const apiToken = env['ATLASSIAN_API_TOKEN'];

  const missing: string[] = [];
  if (!baseUrl) missing.push('ATLASSIAN_BASE_URL');
  if (!user) missing.push('ATLASSIAN_USER');
  if (!apiToken) missing.push('ATLASSIAN_API_TOKEN');

  if (missing.length > 0) {
    throw new CredentialError(missing);
  }

  return {
    baseUrl: baseUrl!.replace(/\/+$/, ''),
    user: user!,
    apiToken: apiToken!,
  };
}

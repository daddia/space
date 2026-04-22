import { describe, it, expect } from 'vitest';
import { parseCredentials, CredentialError } from './credentials.js';

// ---------------------------------------------------------------------------
// parseCredentials -- valid inputs
// ---------------------------------------------------------------------------

describe('parseCredentials -- valid inputs', () => {
  const full = {
    ATLASSIAN_BASE_URL: 'https://org.atlassian.net',
    ATLASSIAN_USER: 'user@example.com',
    ATLASSIAN_API_TOKEN: 'secret-token',
  };

  it('returns credentials when all three vars are present', () => {
    const creds = parseCredentials(full);
    expect(creds.baseUrl).toBe('https://org.atlassian.net');
    expect(creds.user).toBe('user@example.com');
    expect(creds.apiToken).toBe('secret-token');
  });

  it('strips a trailing slash from baseUrl', () => {
    const creds = parseCredentials({ ...full, ATLASSIAN_BASE_URL: 'https://org.atlassian.net/' });
    expect(creds.baseUrl).toBe('https://org.atlassian.net');
  });

  it('strips multiple trailing slashes from baseUrl', () => {
    const creds = parseCredentials({ ...full, ATLASSIAN_BASE_URL: 'https://org.atlassian.net///' });
    expect(creds.baseUrl).toBe('https://org.atlassian.net');
  });

  it('preserves a baseUrl with no trailing slash unchanged', () => {
    const creds = parseCredentials(full);
    expect(creds.baseUrl).toBe('https://org.atlassian.net');
  });

  it('ignores unrelated env vars', () => {
    const creds = parseCredentials({ ...full, NODE_ENV: 'test', UNRELATED: 'value' });
    expect(creds.baseUrl).toBe('https://org.atlassian.net');
  });
});

// ---------------------------------------------------------------------------
// parseCredentials -- missing variables
// ---------------------------------------------------------------------------

describe('parseCredentials -- missing variables', () => {
  it('throws CredentialError when all three vars are absent', () => {
    expect(() => parseCredentials({})).toThrow(CredentialError);
  });

  it('lists all three missing vars', () => {
    try {
      parseCredentials({});
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CredentialError);
      const e = err as CredentialError;
      expect(e.missing).toContain('ATLASSIAN_BASE_URL');
      expect(e.missing).toContain('ATLASSIAN_USER');
      expect(e.missing).toContain('ATLASSIAN_API_TOKEN');
      expect(e.missing).toHaveLength(3);
    }
  });

  it('lists only the missing vars when some are present', () => {
    try {
      parseCredentials({ ATLASSIAN_BASE_URL: 'https://org.atlassian.net' });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CredentialError);
      const e = err as CredentialError;
      expect(e.missing).toContain('ATLASSIAN_USER');
      expect(e.missing).toContain('ATLASSIAN_API_TOKEN');
      expect(e.missing).not.toContain('ATLASSIAN_BASE_URL');
      expect(e.missing).toHaveLength(2);
    }
  });

  it('throws when ATLASSIAN_BASE_URL is empty string', () => {
    const env = {
      ATLASSIAN_BASE_URL: '',
      ATLASSIAN_USER: 'user@example.com',
      ATLASSIAN_API_TOKEN: 'token',
    };
    expect(() => parseCredentials(env)).toThrow(CredentialError);
  });

  it('throws when ATLASSIAN_USER is missing', () => {
    const env = {
      ATLASSIAN_BASE_URL: 'https://org.atlassian.net',
      ATLASSIAN_API_TOKEN: 'token',
    };
    try {
      parseCredentials(env);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CredentialError);
      const e = err as CredentialError;
      expect(e.missing).toEqual(['ATLASSIAN_USER']);
    }
  });
});

// ---------------------------------------------------------------------------
// CredentialError
// ---------------------------------------------------------------------------

describe('CredentialError', () => {
  it('has name CredentialError', () => {
    const err = new CredentialError(['ATLASSIAN_USER']);
    expect(err.name).toBe('CredentialError');
  });

  it('message includes the missing variable names', () => {
    const err = new CredentialError(['ATLASSIAN_USER', 'ATLASSIAN_API_TOKEN']);
    expect(err.message).toContain('ATLASSIAN_USER');
    expect(err.message).toContain('ATLASSIAN_API_TOKEN');
  });

  it('is an instance of Error', () => {
    expect(new CredentialError(['X'])).toBeInstanceOf(Error);
  });
});

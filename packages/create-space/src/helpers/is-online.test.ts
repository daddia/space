import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dns from 'node:dns/promises';
import { getOnline } from './is-online.js';

vi.mock('node:dns/promises', () => ({
  default: { lookup: vi.fn() },
}));

describe('getOnline', () => {
  let originalProxy: string | undefined;

  beforeEach(() => {
    originalProxy = process.env.https_proxy;
    delete process.env.https_proxy;
    vi.mocked(dns.lookup).mockReset();
  });

  afterEach(() => {
    if (originalProxy === undefined) {
      delete process.env.https_proxy;
    } else {
      process.env.https_proxy = originalProxy;
    }
  });

  it('returns true when DNS lookup succeeds', async () => {
    vi.mocked(dns.lookup).mockResolvedValueOnce({ address: '1.2.3.4', family: 4 });

    expect(await getOnline()).toBe(true);
    expect(dns.lookup).toHaveBeenCalledWith('registry.yarnpkg.com');
  });

  it('returns false when DNS lookup fails and no proxy', async () => {
    vi.mocked(dns.lookup).mockRejectedValueOnce(new Error('ENOTFOUND'));

    expect(await getOnline()).toBe(false);
  });

  it('returns true when DNS fails but proxy hostname resolves', async () => {
    vi.mocked(dns.lookup)
      .mockRejectedValueOnce(new Error('ENOTFOUND'))
      .mockResolvedValueOnce({ address: '10.0.0.1', family: 4 });

    process.env.https_proxy = 'https://proxy.corp.example.com:8080';

    expect(await getOnline()).toBe(true);
    expect(dns.lookup).toHaveBeenCalledWith('proxy.corp.example.com');
  });

  it('returns false when DNS fails and proxy hostname also fails', async () => {
    vi.mocked(dns.lookup)
      .mockRejectedValueOnce(new Error('ENOTFOUND'))
      .mockRejectedValueOnce(new Error('ENOTFOUND'));

    process.env.https_proxy = 'https://proxy.corp.example.com:8080';

    expect(await getOnline()).toBe(false);
  });
});

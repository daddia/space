import dns from 'node:dns/promises';
import spawn from 'cross-spawn';

function getProxy(): string | undefined {
  if (process.env.https_proxy) return process.env.https_proxy;

  try {
    const result = spawn.sync('npm', ['config', 'get', 'https-proxy'], { encoding: 'utf-8' });
    const stdout = (result.stdout ?? '').toString().trim();
    return stdout !== 'null' && stdout !== '' ? stdout : undefined;
  } catch {
    return undefined;
  }
}

export async function getOnline(): Promise<boolean> {
  try {
    await dns.lookup('registry.yarnpkg.com');
    return true;
  } catch {
    const proxy = getProxy();
    if (!proxy) return false;

    try {
      const { hostname } = new URL(proxy);
      await dns.lookup(hostname);
      return true;
    } catch {
      return false;
    }
  }
}

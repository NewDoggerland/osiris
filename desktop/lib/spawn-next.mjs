import { spawn } from 'node:child_process';
import { join } from 'node:path';

export function buildChildEnv(baseEnv, desktopEnv, { host, port, userData, cacheDir }) {
  return {
    ...baseEnv,
    ...desktopEnv,
    NODE_ENV: 'production',
    HOSTNAME: host,
    PORT: String(port),
    OSIRIS_CCTV_SNAPSHOT: join(cacheDir, 'cctv-catalog.json'),
    OSIRIS_NOMINATIM_CACHE: join(cacheDir, 'nominatim.json'),
    // Keep userData available for future features
    OSIRIS_USER_DATA: userData,
  };
}

export function startNextServer({ standaloneDir, env, nodeBinary = process.execPath }) {
  // When running under Electron, process.execPath is Electron — do NOT use it for Next.
  // Caller must pass a real Node binary path (see main.mjs).
  const serverJs = join(standaloneDir, 'server.js');
  return spawn(nodeBinary, [serverJs], {
    cwd: standaloneDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
}

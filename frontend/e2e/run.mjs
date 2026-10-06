import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';

const require = createRequire(import.meta.url);
const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(frontend, '..');
const args = process.argv.length > 2 ? process.argv.slice(2) : ['test'];
const env = {
  ...process.env,
  BACKEND_URL: 'http://localhost:5017', NEXT_PUBLIC_USE_MOCK: 'false',
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || join(tmpdir(), 'pharmacy-playwright'),
};
let server;
let active;
function run(command, args, cwd = frontend) {
  return new Promise((resolve, reject) => {
    active = spawn(command, args, { cwd, env, stdio: 'inherit', windowsHide: true });
    active.on('error', reject);
    active.on('exit', code => resolve(code ?? 1));
  });
}
function occupied(port) {
  return new Promise(resolve => {
    const socket = createConnection({ port, host: 'localhost' });
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => resolve(false));
  });
}
async function shutdown() {
  if (!server || server.exitCode !== null) return;
  const closed = new Promise(resolve => server.once('exit', resolve));
  if (server.connected) server.send('stop');
  else server.kill();
  await closed;
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { active?.kill(); void shutdown(); });
}
try {
  if (args[0] === 'test') {
    for (const port of [3000, 5017]) {
      if (await occupied(port)) throw new Error(`Cổng ${port} đang được dùng. Hãy dừng server ở cổng này trước e2e.`);
    }
    let code = await run('dotnet', ['build', 'backend/Pharmacy.Api', '--disable-build-servers'], repo);
    if (code === 0) code = await run(process.execPath, [require.resolve('next/dist/bin/next'), 'build']);
    if (code !== 0) process.exitCode = code;
    else {
      server = spawn(process.execPath, [join(frontend, 'e2e/serve.mjs')], {
        cwd: frontend, env, stdio: ['ignore', 'inherit', 'inherit', 'ipc'], windowsHide: true,
      });
      server.on('error', error => console.error(error.message));
      const deadline = Date.now() + 120_000;
      let ready = false;
      while (Date.now() < deadline && server.exitCode === null) {
        try { ready = (await fetch('http://localhost:3000/api/health', { signal: AbortSignal.timeout(2000) })).ok; } catch { /* Chờ seed và server sẵn sàng. */ }
        if (ready) break;
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      if (!ready) throw new Error('Backend/frontend chưa sẵn sàng sau 120 giây.');
      process.exitCode = await run(process.execPath, [join(dirname(require.resolve('playwright/package.json')), 'cli.js'), ...args]);
    }
  } else {
    process.exitCode = await run(process.execPath, [join(dirname(require.resolve('playwright/package.json')), 'cli.js'), ...args], repo);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await shutdown();
}

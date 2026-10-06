import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const args = process.argv.length > 2 ? process.argv.slice(2) : ['test'];
const env = {
  ...process.env,
  BACKEND_URL: 'http://localhost:5017', NEXT_PUBLIC_USE_MOCK: 'false',
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || join(tmpdir(), 'pharmacy-playwright'),
};
if (args[0] === 'test') {
  const code = await new Promise(resolve => {
    const build = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], {
      stdio: 'inherit', windowsHide: true, env,
    });
    build.on('error', () => resolve(1));
    build.on('exit', code => resolve(code ?? 1));
  });
  if (code !== 0) process.exit(code);
}
const child = spawn(process.execPath, [join(dirname(require.resolve('playwright/package.json')), 'cli.js'), ...(process.argv.length > 2 ? process.argv.slice(2) : ['test'])], {
  stdio: 'inherit', windowsHide: true,
  env,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });

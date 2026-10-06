import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(frontend, '..');
const folder = mkdtempSync(join(tmpdir(), 'pharmacy-e2e-'));
const children = [];
let stopping = false;
function launch(command, args, env, cwd) {
  const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code || 1); });
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid) continue;
    child.kill('SIGTERM');
  }
  const cleanup = resolve(folder);
  if (dirname(cleanup) === resolve(tmpdir()) && basename(cleanup).startsWith('pharmacy-e2e-')) {
    try { rmSync(cleanup, { recursive: true, force: true }); } catch { /* SQLite may still be closing. */ }
  }
  setTimeout(() => process.exit(code), 1500);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
process.on('message', message => { if (message === 'stop') stop(); });
process.on('disconnect', () => stop());
launch('dotnet', [join(repo, 'backend/Pharmacy.Api/bin/Debug/net10.0/Pharmacy.Api.dll'), '--urls', 'http://localhost:5017'], {
  ASPNETCORE_ENVIRONMENT: 'Development',
  Database__Provider: 'Sqlite', ConnectionStrings__Default: `Data Source=${join(folder, 'pharmacy.db')}`,
  Storage__Root: join(folder, 'storage'), DataProtection__KeyPath: join(folder, 'keys'),
  BusinessDate__Override: '2026-10-06',
}, join(repo, 'backend/Pharmacy.Api'));
launch(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', '3000'], {
  BACKEND_URL: 'http://localhost:5017', NEXT_PUBLIC_USE_MOCK: 'false', NEXT_TELEMETRY_DISABLED: '1',
}, frontend);

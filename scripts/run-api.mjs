import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const child = spawn('dotnet', [
  // Release build: Windows Smart App Control may block the deterministic Debug DLLs.
  'run', '--project', 'backend/Pharmacy.Api', '--launch-profile', 'http', '-c', 'Release',
  ...process.argv.slice(2),
], { cwd: root, stdio: 'inherit', env: process.env });

child.on('error', (error) => {
  console.error('Unable to start .NET API:', error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

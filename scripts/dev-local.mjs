// Starts Next against the running disposable local Supabase stack. Never falls
// back to .env.local, which may contain production connection settings.
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let status;
try {
  status = JSON.parse(execFileSync(process.execPath, [
    path.join(root, 'node_modules/supabase/dist/supabase.js'),
    'status', '--output', 'json',
  ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
} catch {
  console.error('Local Supabase is not ready. Start Docker Desktop, then run npm run db:start.');
  process.exit(1);
}

const apiUrl = status.API_URL;
const publicKey = status.ANON_KEY || status.PUBLISHABLE_KEY;
let local = false;
try {
  local = ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(apiUrl).hostname);
} catch { /* fail closed below */ }
if (!local || !publicKey) {
  console.error('Refusing to start: CLI status did not identify a local API and public key.');
  process.exit(1);
}

console.log(`Starting the website with local Supabase at ${apiUrl}.`);
const child = spawn(process.execPath, [
  path.join(root, 'node_modules/next/dist/bin/next'), 'dev',
  '--hostname', '127.0.0.1', ...process.argv.slice(2),
], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: apiUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey },
});
child.on('error', () => { console.error('Could not launch the local website.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));

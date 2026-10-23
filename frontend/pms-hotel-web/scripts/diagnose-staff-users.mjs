// Read-only check of the actual Next server. No login, API writes, cookies or tokens.
import { readFile } from 'node:fs/promises';

const origin = new URL(process.argv[2] ?? 'http://localhost:3001');
if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) || origin.protocol !== 'http:' || origin.username || origin.password) {
  throw new Error('Use an HTTP loopback origin without credentials.');
}
async function get(path) {
  const response = await fetch(new URL(path, origin.origin), { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}
try {
  const html = await get('/seguridad/usuarios');
  const servedBuild = html.match(/\\"b\\":\\"([^"\\]+)/)?.[1] ?? 'not found (possibly dev)';
  const diskBuild = await readFile(new URL('../.next/BUILD_ID', import.meta.url), 'utf8').then(s => s.trim()).catch(() => 'not available');
  const paths = [...new Set(html.match(/\/_next\/static\/chunks\/[a-zA-Z0-9_.-]+\.js/g) ?? [])];
  const chunks = await Promise.all(paths.map(async path => ({ path, text: await get(path) })));
  const staff = chunks.filter(chunk => chunk.text.includes('StaffAdminWorkspace'));
  const editing = chunks.some(chunk => chunk.text.includes('data-staff-edit-trigger'));
  const gesture = chunks.some(chunk => chunk.text.includes('staffDragging'));
  const mismatch = diskBuild !== 'not available' && servedBuild !== 'not found (possibly dev)' && diskBuild !== servedBuild;
  console.log(JSON.stringify({
    route: `${origin.origin}/seguridad/usuarios`, servedBuild, diskBuild,
    buildMismatch: mismatch, staffChunks: staff.map(chunk => chunk.path),
    editingCodeServed: editing, gestureCodeServed: gesture,
    result: mismatch || !editing || !gesture ? 'STALE_OR_INCOMPLETE_RUNTIME' : 'CODE_PRESENT_NOT_FUNCTIONAL_QA',
    next: 'If stale: stop the existing Next process in its terminal, run npm run dev, then reload Firefox with cache disabled. Do not use dev:staff (preview). Authenticate and check actual interactions.',
  }, null, 2));
  if (mismatch || !editing || !gesture) process.exitCode = 1;
} catch {
  console.error('Unable to inspect the local runtime. Verify port and server; no authentication or write was attempted.');
  process.exitCode = 2;
}

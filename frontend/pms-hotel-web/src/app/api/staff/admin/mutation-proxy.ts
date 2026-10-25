import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { backendStaffRequest, staffAccessCookie } from '@/lib/bff/staff-auth';
import { parseStaffAdminQuery, projectStaffAdminCreated } from './contract';
import { parseStaffAdminCommand, projectStaffAdminMutationResult, parseStaffAdminCreate } from './mutation-contract';
import type { StaffAdminMutationResource } from './mutation.dto';

export const headers = { 'cache-control': 'private, no-store' };
const failures = {
  INVALID_REQUEST: { status: 400, title: 'Invalid Staff request' },
  STAFF_SESSION_REQUIRED: { status: 401, title: 'Staff session required' },
  STAFF_ACCESS_DENIED: { status: 403, title: 'Staff access denied' },
  STAFF_USER_NOT_FOUND: { status: 404, title: 'Staff user not found' },
  STAFF_VERSION_CONFLICT: { status: 409, title: 'Staff version conflict' },
  STAFF_EMAIL_CONFLICT: { status: 409, title: 'Staff email unavailable' },
  STAFF_USERNAME_CONFLICT: { status: 409, title: 'Staff username unavailable' },
  STAFF_INVITATION_INVALID: { status: 409, title: 'Staff invitation unavailable' },
  STAFF_STATE_CONFLICT: { status: 409, title: 'Staff state conflict' },
  STAFF_WRITE_UNAVAILABLE: { status: 503, title: 'Staff write unavailable' },
} as const;
type Code = keyof typeof failures;
export function failure(code: Code, override?: 413 | 415) {
  const { title, status: normalStatus } = failures[code], status = override ?? normalStatus;
  return NextResponse.json({ type: 'about:blank', title, status, code },
    { status, headers: { ...headers, 'content-type': 'application/problem+json' } });
}
class OversizedBody extends Error {}
export async function boundedText(body: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!body) return '';
  const reader = body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 65536) { await reader.cancel(); throw new OversizedBody(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
export function rejectStaffAdminMutationMethod(allow: 'GET, PATCH' | 'GET, POST' | 'PATCH' | 'PUT') {
  return new NextResponse(null, { status: 405, headers: { ...headers, allow } });
}
export async function upstreamFailure(upstream: Response) {
  try {
    if (upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/problem+json') throw new Error();
    const raw: unknown = JSON.parse(await boundedText(upstream.body));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error();
    const { code, status } = raw as Record<string, unknown>;
    if (typeof code !== 'string' || !Object.hasOwn(failures, code) || status !== upstream.status) throw new Error();
    const allowed = failures[code as Code].status;
    if (allowed === upstream.status) return failure(code as Code);
    if (code === 'INVALID_REQUEST' && (upstream.status === 413 || upstream.status === 415)) return failure(code, upstream.status);
  } catch { /* No untrusted payload, URL, SQL, cookies or headers are relayed. */ }
  return failure('STAFF_WRITE_UNAVAILABLE');
}

/** One dispatch only. Any 503 may be a committed write with a lost/invalid reply.
 * Never use the browser read/refresh/retry helper for this server-side command. */
export async function proxyStaffAdminMutation(request: NextRequest, resource: StaffAdminMutationResource, id: string) {
  const method = resource === 'membership' ? 'PUT' : 'PATCH';
  if (request.method !== method) return rejectStaffAdminMutationMethod(resource === 'contact' ? 'GET, PATCH' : method);
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return failure('STAFF_SESSION_REQUIRED');
  try {
    const origin = new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin;
    if (request.headers.get('origin') !== origin) return failure('STAFF_ACCESS_DENIED');
  } catch { return failure('STAFF_WRITE_UNAVAILABLE'); }
  let query: ReturnType<typeof parseStaffAdminQuery>, command: ReturnType<typeof parseStaffAdminCommand>;
  try {
    query = parseStaffAdminQuery(request.nextUrl.searchParams, 'detail', id);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return failure('INVALID_REQUEST', 415);
    command = parseStaffAdminCommand(await boundedText(request.body), resource);
  } catch (error) { return error instanceof OversizedBody ? failure('INVALID_REQUEST', 413) : failure('INVALID_REQUEST'); }
  try {
    const suffix = resource === 'contact' ? '' : `/${resource}`;
    const upstream = await backendStaffRequest(`/api/v1/staff-admin/users/${query.id}${suffix}?${query.params}`, {
      method, headers: { authorization: `Bearer ${token}`, accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(command), cache: 'no-store', redirect: 'error',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
    });
    if (upstream.status !== 200) return await upstreamFailure(upstream);
    if (upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return failure('STAFF_WRITE_UNAVAILABLE');
    const result = projectStaffAdminMutationResult(JSON.parse(await boundedText(upstream.body)), query.id!, command.expectedVersion);
    return NextResponse.json(result, { headers });
  } catch { return failure('STAFF_WRITE_UNAVAILABLE'); }
}

/** Single dispatch; 503 means the creation result must be checked before another POST. */
export async function proxyStaffAdminCreate(request: NextRequest) {
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return failure('STAFF_SESSION_REQUIRED');
  try {
    if (request.headers.get('origin') !== new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin) return failure('STAFF_ACCESS_DENIED');
  } catch { return failure('STAFF_WRITE_UNAVAILABLE'); }
  let query: ReturnType<typeof parseStaffAdminQuery>, command: ReturnType<typeof parseStaffAdminCreate>;
  try {
    query = parseStaffAdminQuery(request.nextUrl.searchParams, 'create');
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return failure('INVALID_REQUEST', 415);
    command = parseStaffAdminCreate(await boundedText(request.body));
    if (query.scope === 'PROPERTY' && !command.propertyIds.includes(query.propertyId!)) return failure('INVALID_REQUEST');
  } catch (error) { return error instanceof OversizedBody ? failure('INVALID_REQUEST', 413) : failure('INVALID_REQUEST'); }
  try {
    const upstream = await backendStaffRequest(`/api/v1/staff-admin/users?${query.params}`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(command), cache: 'no-store', redirect: 'error',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
    });
    if (upstream.status !== 201) return await upstreamFailure(upstream);
    if (upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return failure('STAFF_WRITE_UNAVAILABLE');
    const item = projectStaffAdminCreated(JSON.parse(await boundedText(upstream.body)), query);
    if (item.username !== command.username || item.workEmail !== command.workEmail || item.roleCode !== command.roleCode
      || JSON.stringify(item.propertyIds) !== JSON.stringify([...command.propertyIds].sort())) return failure('STAFF_WRITE_UNAVAILABLE');
    return NextResponse.json(item, { status: 201, headers });
  } catch { return failure('STAFF_WRITE_UNAVAILABLE'); }
}

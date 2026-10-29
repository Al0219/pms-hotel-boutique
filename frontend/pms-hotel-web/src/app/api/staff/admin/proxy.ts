import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { backendStaffRequest, staffAccessCookie } from '@/lib/bff/staff-auth';
import { parseStaffAdminQuery, projectStaffAdminResponse, type StaffAdminResource } from './contract';

const headers = { 'cache-control': 'private, no-store' };
const errors = {
  INVALID_REQUEST: { status: 400, title: 'Invalid Staff request' },
  INVALID_CURSOR: { status: 400, title: 'Invalid Staff cursor' },
  STAFF_SESSION_REQUIRED: { status: 401, title: 'Staff session required' },
  STAFF_ACCESS_DENIED: { status: 403, title: 'Staff access denied' },
  STAFF_USER_NOT_FOUND: { status: 404, title: 'Staff user not found' },
  STAFF_READ_UNAVAILABLE: { status: 503, title: 'Staff read unavailable' },
} as const;
type ErrorCode = keyof typeof errors;
function failure(code: ErrorCode) {
  const { status, title } = errors[code];
  return NextResponse.json({ type: 'about:blank', title, status, code },
    { status, headers: { ...headers, 'content-type': 'application/problem+json' } });
}
async function upstreamFailure(upstream: Response) {
  switch (upstream.status) {
    case 400: {
      let code: ErrorCode = 'INVALID_REQUEST';
      try {
        const body: unknown = await upstream.json();
        if (body && typeof body === 'object' && !Array.isArray(body)
          && (body as Record<string, unknown>).code === 'INVALID_CURSOR') code = 'INVALID_CURSOR';
      } catch { /* Never relay an untrusted error body, including framework HTML. */ }
      return failure(code);
    }
    case 401: return failure('STAFF_SESSION_REQUIRED');
    case 403: return failure('STAFF_ACCESS_DENIED');
    case 404: return failure('STAFF_USER_NOT_FOUND');
    default: return failure('STAFF_READ_UNAVAILABLE');
  }
}

export function rejectStaffAdminMethod() {
  return new NextResponse(null, { status: 405, headers: { ...headers, allow: 'GET' } });
}

export async function proxyStaffAdmin(request: NextRequest, resource: StaffAdminResource, id?: string) {
  if (request.method !== 'GET') return rejectStaffAdminMethod();
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return failure('STAFF_SESSION_REQUIRED');
  let query: ReturnType<typeof parseStaffAdminQuery>;
  try { query = parseStaffAdminQuery(request.nextUrl.searchParams, resource, id); }
  catch { return failure('INVALID_REQUEST'); }
  try {
    const path = resource === 'roles' ? 'roles' : resource === 'users' ? 'users' : `users/${query.id}`;
    const suffix = query.params.size ? `?${query.params}` : '';
    const upstream = await backendStaffRequest(`/api/v1/staff-admin/${path}${suffix}`, {
      method: 'GET', headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]), redirect: 'error',
    });
    if (upstream.status !== 200) return await upstreamFailure(upstream);
    if (upstream.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return failure('STAFF_READ_UNAVAILABLE');
    const projected = projectStaffAdminResponse(await upstream.json(), resource, query);
    return NextResponse.json(projected, { headers });
  } catch { return failure('STAFF_READ_UNAVAILABLE'); }
}

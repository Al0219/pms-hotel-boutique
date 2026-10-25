import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { backendStaffRequest, staffAccessCookie } from '@/lib/bff/staff-auth';
import { parseStaffAdminQuery } from './contract';
import { projectStaffAdminMutationResult } from './mutation-contract';
import { boundedText, failure, headers, upstreamFailure } from './mutation-proxy';
import { parseInvitationCommand, parseInvitationConsume, projectInvitationInfo } from './invitation-contract';

function origin(request: NextRequest) { return request.headers.get('origin') === new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin; }
export async function proxyInvitation(request: NextRequest, id: string) {
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return failure('STAFF_SESSION_REQUIRED');
  let query: ReturnType<typeof parseStaffAdminQuery>, command: ReturnType<typeof parseInvitationCommand> | null = null;
  try {
    if (request.method === 'POST' && !origin(request)) return failure('STAFF_ACCESS_DENIED');
    query = parseStaffAdminQuery(request.nextUrl.searchParams, 'detail', id);
    if (request.method === 'POST') {
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return failure('INVALID_REQUEST', 415);
      command = parseInvitationCommand(await boundedText(request.body));
    }
  } catch { return failure('INVALID_REQUEST'); }
  try {
    const response = await backendStaffRequest(`/api/v1/staff-admin/users/${query.id}/invitation?${query.params}`, {
      method: request.method, cache: 'no-store', redirect: 'error', signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]),
      headers: { authorization: `Bearer ${token}`, accept: 'application/json', ...(command ? { 'content-type': 'application/json' } : {}) },
      ...(command ? { body: JSON.stringify(command) } : {}),
    });
    if (response.status !== 200) return upstreamFailure(response);
    if (response.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new Error();
    const raw: unknown = JSON.parse(await boundedText(response.body));
    return NextResponse.json(command ? projectStaffAdminMutationResult(raw, query.id!, command.expectedVersion) : projectInvitationInfo(raw, query.id!), { headers });
  } catch { return failure('STAFF_WRITE_UNAVAILABLE'); }
}
export async function consumeInvitation(request: NextRequest) {
  let command: ReturnType<typeof parseInvitationConsume>;
  try {
    if (!origin(request)) return failure('STAFF_ACCESS_DENIED');
    if (request.nextUrl.search || request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return failure('INVALID_REQUEST');
    command = parseInvitationConsume(await boundedText(request.body));
  } catch { return failure('INVALID_REQUEST'); }
  try {
    const response = await backendStaffRequest('/api/v1/staff-auth/invitations/consume', {
      method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]),
      headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify(command),
    });
    if (response.status !== 200) return upstreamFailure(response);
    if (response.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new Error();
    const data: unknown = JSON.parse(await boundedText(response.body));
    if (!data || typeof data !== 'object' || !('credentialPrepared' in data) || data.credentialPrepared !== true) throw new Error();
    return NextResponse.json({ credentialPrepared: true }, { headers: { ...headers, 'referrer-policy': 'no-referrer' } });
  } catch { return failure('STAFF_WRITE_UNAVAILABLE'); }
}

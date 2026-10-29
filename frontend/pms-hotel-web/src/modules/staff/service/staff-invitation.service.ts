import { staffBffRead } from '@/lib/http/staff-bff';
import type { PropertyScope } from '@/modules/properties';
import { StaffAdminWriteError } from '../model/staff-admin-edit';
import type { StaffInvitationInfoDTO } from '../dtos/staff-invitation.dto';
import type { StaffAdminCommandResultDTO } from '../dtos/staff-admin-command.dto';
function query(scope: PropertyScope) {
  const params = new URLSearchParams({ scope: scope.kind });
  if (scope.kind === 'PROPERTY') params.set('propertyId', scope.propertyIds[0]);
  return params;
}
export function readStaffInvitation(id: string, scope: PropertyScope, signal: AbortSignal) {
  return staffBffRead<StaffInvitationInfoDTO>(`/api/staff/admin/users/${encodeURIComponent(id)}/invitation?${query(scope)}`, signal);
}
async function post(url: string, body: unknown): Promise<unknown> {
  try {
    const response = await fetch(url, { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(18_000) });
    const result: unknown = await response.json();
    if (response.status === 200) return result;
    const code = result && typeof result === 'object' && 'code' in result ? result.code : undefined;
    const codes: Record<string, number> = { INVALID_REQUEST: 400, STAFF_SESSION_REQUIRED: 401, STAFF_ACCESS_DENIED: 403, STAFF_USER_NOT_FOUND: 404,
      STAFF_VERSION_CONFLICT: 409, STAFF_STATE_CONFLICT: 409, STAFF_INVITATION_INVALID: 409 };
    if (typeof code === 'string' && codes[code] === response.status) throw new StaffAdminWriteError(response.status, code);
  } catch (error) { if (error instanceof StaffAdminWriteError) throw error; }
  throw new StaffAdminWriteError(503, 'STAFF_WRITE_UNAVAILABLE');
}
export async function sendStaffInvitation(id: string, scope: PropertyScope, expectedVersion: number): Promise<StaffAdminCommandResultDTO> {
  return await post(`/api/staff/admin/users/${encodeURIComponent(id)}/invitation?${query(scope)}`, { expectedVersion }) as StaffAdminCommandResultDTO;
}
export function consumeStaffInvitation(token: string, password: string) { return post('/api/auth/staff/invitations/consume', { token, password }); }

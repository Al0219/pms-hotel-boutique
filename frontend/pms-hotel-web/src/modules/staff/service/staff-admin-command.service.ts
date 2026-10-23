import type { PropertyScope } from '@/modules/properties';
import type { StaffAdminCommandResultDTO, StaffAdminContactCommandDTO, StaffAdminMembershipCommandDTO, StaffAdminStatusCommandDTO } from '../dtos/staff-admin-command.dto';
import { StaffAdminWriteError } from '../model/staff-admin-edit';

const statuses: Record<string, number> = { INVALID_REQUEST: 400, STAFF_SESSION_REQUIRED: 401, STAFF_ACCESS_DENIED: 403,
  STAFF_USER_NOT_FOUND: 404, STAFF_VERSION_CONFLICT: 409, STAFF_EMAIL_CONFLICT: 409, STAFF_STATE_CONFLICT: 409, STAFF_WRITE_UNAVAILABLE: 503 };
/** One native cookie request only. Never use the read helper's refresh/retry. */
export async function writeStaffAdmin(id: string, scope: PropertyScope, command: StaffAdminContactCommandDTO | StaffAdminMembershipCommandDTO | StaffAdminStatusCommandDTO): Promise<StaffAdminCommandResultDTO> {
  const query = new URLSearchParams({ scope: scope.kind });
  if (scope.kind === 'PROPERTY') query.set('propertyId', scope.propertyIds[0]);
  const membership = 'roleCode' in command;
  let response: Response;
  try {
    response = await fetch(`/api/staff/admin/users/${encodeURIComponent(id)}${membership ? '/membership' : 'status' in command ? '/status' : ''}?${query}`, {
      method: membership ? 'PUT' : 'PATCH', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(command), signal: AbortSignal.timeout(12_000),
    });
  } catch { throw new StaffAdminWriteError(503, 'STAFF_WRITE_UNAVAILABLE'); }
  let data: unknown;
  try { data = await response.json(); } catch { throw new StaffAdminWriteError(503, 'STAFF_WRITE_UNAVAILABLE'); }
  if (response.status !== 200) {
    const code = data && typeof data === 'object' && 'code' in data ? data.code : undefined;
    if (typeof code === 'string' && (statuses[code] === response.status || (code === 'INVALID_REQUEST' && [413, 415].includes(response.status)))) throw new StaffAdminWriteError(response.status, code);
    throw new StaffAdminWriteError(503, 'STAFF_WRITE_UNAVAILABLE');
  }
  return data as StaffAdminCommandResultDTO; // Validated/projected by the mapper before Domain/UI.
}

import type { PropertyScope } from '@/modules/properties';
import type { StaffAdminCreateDTO } from '../dtos/staff-admin-create.dto';
import type { StaffAdminUserDTO } from '../dtos/staff-admin.dto';
import { StaffAdminWriteError } from '../model/staff-admin-edit';

/** Deliberately one POST; neither refresh nor transport failures replay creation. */
export async function createStaffAdmin(scope: PropertyScope, command: StaffAdminCreateDTO): Promise<StaffAdminUserDTO> {
  const query = new URLSearchParams({ scope: scope.kind });
  if (scope.kind === 'PROPERTY') query.set('propertyId', scope.propertyIds[0]);
  try {
    const response = await fetch(`/api/staff/admin/users?${query}`, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(command), signal: AbortSignal.timeout(12_000),
    });
    const data: unknown = await response.json();
    if (response.status === 201) return data as StaffAdminUserDTO;
    const codes: Record<string, number> = { INVALID_REQUEST: 400, STAFF_SESSION_REQUIRED: 401, STAFF_ACCESS_DENIED: 403,
      STAFF_USERNAME_CONFLICT: 409, STAFF_EMAIL_CONFLICT: 409, STAFF_WRITE_UNAVAILABLE: 503 };
    const code = data && typeof data === 'object' && 'code' in data ? data.code : null;
    if (typeof code === 'string' && codes[code] === response.status) throw new StaffAdminWriteError(response.status, code);
  } catch (error) {
    if (error instanceof StaffAdminWriteError) throw error;
  }
  throw new StaffAdminWriteError(503, 'STAFF_WRITE_UNAVAILABLE');
}

import { staffBffRead } from '@/lib/http/staff-bff';
import type { PropertyScope } from '@/modules/properties';
import type { StaffAdminDetailDTO, StaffAdminPageDTO, StaffAdminRolesDTO } from '../dtos/staff-admin.dto';
import type { StaffAdminFilters } from '../model/staff-admin';

function scopeQuery(scope: PropertyScope) {
  const query = new URLSearchParams({ scope: scope.kind });
  if (scope.kind === 'PROPERTY') query.set('propertyId', scope.propertyIds[0]);
  return query;
}
export const readStaffAdminRoles = (signal: AbortSignal) => staffBffRead<StaffAdminRolesDTO>('/api/staff/admin/roles', signal);
export function readStaffAdminUsers(scope: PropertyScope, filters: StaffAdminFilters, cursor: string | null, signal: AbortSignal) {
  const query = scopeQuery(scope);
  if (filters.username) query.set('username', filters.username);
  if (filters.roleCode) query.set('roleCode', filters.roleCode);
  if (filters.status) query.set('status', filters.status);
  query.set('limit', String(filters.limit));
  if (cursor !== null) query.set('cursor', cursor);
  return staffBffRead<StaffAdminPageDTO>(`/api/staff/admin/users?${query}`, signal);
}
export function readStaffAdminUser(id: string, scope: PropertyScope, signal: AbortSignal) {
  return staffBffRead<StaffAdminDetailDTO>(`/api/staff/admin/users/${encodeURIComponent(id)}?${scopeQuery(scope)}`, signal);
}

import type { StaffSession } from '@/modules/auth';
import type { PropertyScope } from '@/modules/properties';
import { normalizePasswordLoginEmail } from '@/lib/login-input';
import type { StaffAdminUser } from './staff-admin';

export type StaffEditGroup = 'email' | 'role' | 'properties';
export type StaffStatusTarget = 'SUSPENDED' | 'DISABLED';
export type StaffActionGroup = StaffEditGroup | 'status';
export interface StaffEditDraft { email: string; role: string; properties: string[]; status?: StaffStatusTarget }
export interface StaffCommandResult { readonly organizationId: string; readonly staffUserId: string; readonly version: number; readonly changed: boolean }
export class StaffAdminWriteError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
export function canEditStaff(user: StaffAdminUser, actor: StaffSession, group: StaffActionGroup) {
  return !!actor.staffUserId && actor.permissions.includes('STAFF_MANAGE') && actor.staffUserId !== user.id
    && user.status !== 'DISABLED' && (actor.roleId === 'SUPER_ADMIN' || actor.roleId === 'GERENCIA')
    && (user.roleCode !== 'SUPER_ADMIN' || (group === 'email' && actor.roleId === 'SUPER_ADMIN'));
}
export function emptyPropertiesAllowed(user: StaffAdminUser, actor: StaffSession, scope: PropertyScope) {
  return user.status === 'SUSPENDED' && actor.roleId === 'SUPER_ADMIN' && scope.kind === 'ALL_PROPERTIES';
}
export function staffDraft(user: StaffAdminUser): StaffEditDraft { return { email: user.workEmail, role: user.roleCode, properties: [...user.propertyIds] }; }
export function validateStaffDraft(group: StaffActionGroup, draft: StaffEditDraft, user: StaffAdminUser, actor: StaffSession, scope: PropertyScope): string | null {
  if (!canEditStaff(user, actor, group)) return 'Esta cuenta no admite esta modificación.';
  if (group === 'status') return draft.status && staffStatusActions(user, actor).includes(draft.status) ? null : 'Esta cuenta no admite esa transición.';
  if (group === 'email') return normalizePasswordLoginEmail(draft.email) ? null : 'Escribe un correo válido de hasta 50 caracteres.';
  if (!['GERENCIA', 'RECEPCION', 'OPERACIONES', 'AUDITOR'].includes(group === 'role' ? draft.role : user.roleCode)) return 'Selecciona un rol asignable.';
  const properties = group === 'properties' ? draft.properties : user.propertyIds;
  const authorized = actor.memberships.filter(item => item.active).map(item => item.propertyId);
  if (properties.some(id => !authorized.includes(id)) || new Set(properties).size !== properties.length) return 'Selecciona únicamente propiedades autorizadas.';
  return properties.length || emptyPropertiesAllowed(user, actor, scope) ? null : 'Esta cuenta debe conservar al menos una propiedad.';
}
export function staffDraftChanged(group: StaffActionGroup, draft: StaffEditDraft, user: StaffAdminUser) {
  return group === 'status' ? draft.status !== undefined && draft.status !== user.status : group === 'email' ? normalizePasswordLoginEmail(draft.email) !== normalizePasswordLoginEmail(user.workEmail)
    : group === 'role' ? draft.role !== user.roleCode
    : JSON.stringify([...draft.properties].sort()) !== JSON.stringify([...user.propertyIds].sort());
}

/** Prevention in UI; the scoped Backend remains the authority. */
export function staffStatusActions(user: StaffAdminUser, actor: StaffSession): StaffStatusTarget[] {
  if (!canEditStaff(user, actor, 'status')) return [];
  return user.status === 'ACTIVE' ? ['SUSPENDED', 'DISABLED'] : user.status === 'SUSPENDED' ? ['DISABLED'] : [];
}

/** Immutable administrative read models. Never session identities or editable role previews. */
export type StaffRole = 'SUPER_ADMIN' | 'GERENCIA' | 'RECEPCION' | 'OPERACIONES' | 'AUDITOR';
export type StaffStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
export interface StaffAdminUser {
  readonly id: string; readonly username: string; readonly workEmail: string;
  readonly status: StaffStatus; readonly roleCode: StaffRole;
  readonly membershipStatus: 'ACTIVE' | 'INACTIVE'; readonly organizationId: string;
  readonly propertyIds: readonly string[]; readonly createdAt: string;
  readonly updatedAt: string; readonly version: number;
}
export interface StaffAdminContext { readonly organizationId: string; readonly roles: readonly { readonly code: StaffRole; readonly name: string }[] }
export interface StaffAdminPage { readonly users: readonly StaffAdminUser[]; readonly nextCursor: string | null }
export interface StaffAdminFilters { readonly username: string; readonly roleCode: string; readonly status: string; readonly limit: number }
export const statusLabels: Record<StaffStatus, string> = { ACTIVE: 'Activo', SUSPENDED: 'Suspendido', DISABLED: 'Baja administrativa' };
export const initialFilters: StaffAdminFilters = { username: '', roleCode: '', status: '', limit: 50 };

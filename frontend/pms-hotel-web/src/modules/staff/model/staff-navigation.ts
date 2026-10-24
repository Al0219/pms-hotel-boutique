import type { StaffSession } from '@/modules/auth';

/** Existing StaffShell destinations, shared by navigation and denied-route recovery. */
export const staffNavigation = [
  { href: '/dashboard', label: 'Panel', icon: 'dashboard', roles: ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION'] },
  { href: '/reservas', label: 'Reservas', icon: 'reservations', roles: ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION'] },
  { href: '/calendario', label: 'Calendario', icon: 'calendar', roles: ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION'] },
  { href: '/staff/habitaciones', label: 'Habitaciones', icon: 'room', roles: ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION'] },
  { href: '/housekeeping', label: 'Housekeeping', icon: 'room', roles: ['SUPER_ADMIN', 'GERENCIA', 'OPERACIONES'] },
  { href: '/reportes', label: 'Reportes', icon: 'dashboard', roles: ['SUPER_ADMIN', 'GERENCIA'] },
] as const;
export function canonicalStaffRole(roleId: string) { return roleId === 'superadmin' ? 'SUPER_ADMIN' : roleId.toUpperCase(); }
/** Same effective navigation rules as main; reused for safe denied-route recovery. */
export function canAccessStaffNavigation(entry: typeof staffNavigation[number], session: StaffSession): boolean {
  if (entry.href === '/reportes') return session.permissions.includes('COMMERCIAL_MANAGE') || session.permissions.includes('RESERVATION_MANAGE');
  if (entry.href === '/housekeeping') return session.permissions.includes('OPERATIONS_MANAGE');
  return (entry.roles as readonly string[]).includes(canonicalStaffRole(session.roleId));
}
export function staffSafeDestination(session: StaffSession): string {
  // Dashboard stays first. New main destinations require their effective permission;
  // actors without any authorized entry still receive the non-looping public exit.
  return staffNavigation.find(entry => canAccessStaffNavigation(entry, session))?.href ?? '/';
}

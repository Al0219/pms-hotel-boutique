import type { StaffSession } from '@/modules/auth';

/** Existing StaffShell destinations, shared by navigation and denied-route recovery. */
export const staffNavigation = [
  { href: '/dashboard', label: 'Panel', icon: 'dashboard', roles: ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION'] },
  { href: '/reservas', label: 'Reservas', icon: 'reservations', roles: ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION'] },
  { href: '/calendario', label: 'Calendario', icon: 'calendar', roles: ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION'] },
  { href: '/staff/habitaciones', label: 'Habitaciones', icon: 'room', roles: ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION'] },
] as const;
export function canonicalStaffRole(roleId: string) { return roleId === 'superadmin' ? 'SUPER_ADMIN' : roleId.toUpperCase(); }
export function staffSafeDestination(session: StaffSession): string {
  const role = canonicalStaffRole(session.roleId);
  // Dashboard is first where already permitted. OPERACIONES/AUDITOR currently
  // have no destination in this navigation: public home is a safe, non-looping exit.
  return staffNavigation.find(entry => (entry.roles as readonly string[]).includes(role))?.href ?? '/';
}

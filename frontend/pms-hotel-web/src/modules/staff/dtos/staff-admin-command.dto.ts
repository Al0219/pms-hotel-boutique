/** Command transport is independent from read DTOs and Staff session identities. */
export type StaffAdminContactCommandDTO = { workEmail: string; expectedVersion: number };
export type StaffAdminMembershipCommandDTO = { roleCode: string; propertyIds: string[]; expectedVersion: number };
export type StaffAdminStatusCommandDTO = { status: 'SUSPENDED' | 'DISABLED'; expectedVersion: number };
export interface StaffAdminCommandResultDTO { organizationId: string; staffUserId: string; version: number; changed: boolean }

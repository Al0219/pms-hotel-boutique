import type { StaffAdminRoleCode, StaffAdminStatus } from './staff-admin.dto';

export type StaffAdminMutationResource = 'contact' | 'membership' | 'status';
export type StaffAdminAssignableRole = Exclude<StaffAdminRoleCode, 'SUPER_ADMIN'>;
export type StaffAdminRequestedStatus = Exclude<StaffAdminStatus, 'ACTIVE'>;
export interface StaffAdminContactCommandDTO { workEmail: string; expectedVersion: number }
export interface StaffAdminMembershipCommandDTO {
  roleCode: StaffAdminAssignableRole;
  propertyIds: string[];
  expectedVersion: number;
}
export interface StaffAdminStatusCommandDTO { status: StaffAdminRequestedStatus; expectedVersion: number }
export type StaffAdminCommandDTO = StaffAdminContactCommandDTO | StaffAdminMembershipCommandDTO | StaffAdminStatusCommandDTO;
export interface StaffAdminMutationResultDTO {
  organizationId: string;
  staffUserId: string;
  version: number;
  changed: boolean;
}

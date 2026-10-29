/** Administrative transport DTOs, kept separate from session and simulated RolePreview. */
export const staffAdminRoleCodes = ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION', 'OPERACIONES', 'AUDITOR'] as const;
export const staffAdminStatuses = ['ACTIVE', 'SUSPENDED', 'DISABLED'] as const;
export type StaffAdminRoleCode = typeof staffAdminRoleCodes[number];
export type StaffAdminStatus = typeof staffAdminStatuses[number];
export type StaffAdminScopeDTO = { kind: 'PROPERTY' | 'ALL_PROPERTIES'; propertyIds: string[] };
export interface StaffAdminUserDTO {
  id: string;
  username: string;
  workEmail: string;
  status: StaffAdminStatus;
  roleCode: StaffAdminRoleCode;
  membershipStatus: 'ACTIVE' | 'INACTIVE';
  organizationId: string;
  propertyIds: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
}
export interface StaffAdminRolesDTO {
  organizationId: string;
  items: { code: StaffAdminRoleCode; name: string }[];
}
export interface StaffAdminPageDTO {
  organizationId: string;
  scope: StaffAdminScopeDTO;
  items: StaffAdminUserDTO[];
  limit: number;
  nextCursor: string | null;
}
export interface StaffAdminDetailDTO {
  organizationId: string;
  scope: StaffAdminScopeDTO;
  item: StaffAdminUserDTO;
}

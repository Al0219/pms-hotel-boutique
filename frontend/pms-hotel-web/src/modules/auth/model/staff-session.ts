export type StaffRoleCode = "SUPER_ADMIN" | "GERENCIA" | "RECEPCION" | "OPERACIONES" | "AUDITOR";

export interface StaffMembership {
  propertyId: string;
  propertyCode: string | null;
  name: string;
  timezone: string;
  currency: string;
  active: boolean;
}

export interface StaffIdentity {
  id: string;
  userName: string;
  roleId: string;
  memberships: StaffMembership[];
}

export interface StaffSession extends StaffIdentity {
  /** Available only for the real C2 BFF session; Private-09 mock never models it. */
  staffUserId?: string;
  roleName: string;
  permissions: string[];
}

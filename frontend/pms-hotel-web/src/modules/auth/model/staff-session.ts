export interface StaffMembership {
  propertyId: string;
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
  roleName: string;
  permissions: string[];
}

/** Frontend-only Private 09 fixture contract. Not a Backend API or credentials. */
export interface StaffIdentityDTO {
  session_id: string;
  user_name: string;
  role_id: string;
  memberships: {
    property_id: string;
    name: string;
    timezone: string;
    currency: string;
    status: "ACTIVE" | "INACTIVE";
  }[];
}

/** C2 BFF response for the active Staff session. Tokens are never part of this DTO. */
export interface StaffSessionDTO {
  staffUserId: string;
  sessionId: string;
  username: string;
  roleCode: string;
  permissions: string[];
  memberships: {
    propertyId: string;
    propertyCode: string;
    name: string;
    timezone: string;
    currency: string;
  }[];
}

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

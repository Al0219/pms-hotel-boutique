export type UserRole = "RECEPTION" | "MANAGER" | "OPERATIONS" | "COMPLIANCE" | "GUEST" | "ADMIN";

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  propertyId: string;
  permissions: string[];
  token: string;
  expiresAt: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
  role?: UserRole;
  propertyId?: string;
}

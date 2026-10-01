/**
 * Public API for the auth module.
 * Export only intentionally public Domain Models, hooks and components.
 */
export type { ExternalIdentity, ExternalIdentityProvider, GuestAccount } from "./model/guest-account";
export type { UserSession, LoginCredentials, UserRole } from "./model/session";
export { useSession, type UseSessionResult } from "./hooks/use-session";
export { GuestAccessPage } from "./components/guest-access-page";
export { GuestSessionProvider, useGuestSession } from "./components/guest-session-provider";
export { GuestAccountGate } from "./components/guest-account-gate";
export { StaffSessionProvider, StaffLogout, useStaffSession } from "./components/staff-session-provider";
export type { StaffIdentity, StaffSession, StaffMembership } from "./model/staff-session";

/**
 * Public API for the auth module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */
export type { ExternalIdentity, ExternalIdentityProvider, GuestAccount } from "./model/guest-account";
export { GuestAccessPage } from "./components/guest-access-page";

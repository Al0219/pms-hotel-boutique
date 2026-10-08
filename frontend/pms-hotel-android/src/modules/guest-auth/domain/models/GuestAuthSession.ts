/**
 * Session-only Guest identity. It intentionally carries no credentials,
 * profile, reservation, or stay data.
 */
export interface GuestAuthSession {
  accountId: string;
}

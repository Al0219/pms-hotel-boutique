/** Public Browser → BFF session response; credentials remain in HttpOnly cookies. */
export interface GuestSessionDTO {
  guestAccountId: string;
  sessionId: string;
  email: string;
  context: "GUEST";
}

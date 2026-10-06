/** Frontend-only MSW inputs; these are not Backend authentication contracts. */
export type GuestAccessInput =
  | { method: 'EMAIL'; email: string; registration?: { fullName: string } }
  | { method: 'GOOGLE' }
  | { method: 'APPLE' };

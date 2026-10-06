import type { GuestAccount } from "./guest-account";

/** Session identity only: this endpoint does not supply external identities. */
export interface GuestSessionAccount extends Pick<GuestAccount, "id" | "email"> {
  externalIdentities?: never;
}

export interface GuestSession {
  id: string;
  context: "GUEST";
  account: GuestSessionAccount;
}

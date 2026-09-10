/**
 * PROVISIONAL API CONTRACT.
 * Replace or confirm with Backend before this contract is marked CONFIRMED.
 */
export interface ExternalIdentityDTO {
  provider: "GOOGLE";
  external_subject: string;
  connected_at: string;
}

/**
 * PROVISIONAL API CONTRACT for the Guest authentication context only.
 * It deliberately does not represent GuestProfile or any Staff session.
 */
export interface GuestAccountDTO {
  account_id: string;
  email: string | null;
  external_identities: ExternalIdentityDTO[];
}

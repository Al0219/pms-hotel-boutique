export type ExternalIdentityProvider = "GOOGLE";

export interface ExternalIdentity {
  provider: ExternalIdentityProvider;
  subject: string;
  connectedAt: Date;
}

/** Authentication account. Contact and identity data live in GuestProfile. */
export interface GuestAccount {
  id: string;
  email: string | null;
  externalIdentities: ExternalIdentity[];
}

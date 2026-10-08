export interface Consent {
  id: string; subject: string; purpose: string; channel: "Email" | "SMS"; active: boolean;
  source: string; updatedAt: Date; evidenceVersion: string;
}
export type PrivacyAction = { type: "consent"; id: string; active: boolean } | { type: "request"; kind: "export" | "anonymize" } | { type: "reset" };
export interface Privacy {
  consents: Consent[];
  requests: { id: string; kind: "export" | "anonymize"; status: "pending"; createdAt: Date }[];
}


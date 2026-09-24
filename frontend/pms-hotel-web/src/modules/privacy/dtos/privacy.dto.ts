/** Approved frontend/mock contract, not a Backend API. See docs/32_PRIVATE_07_MOCK_CONTRACT_PROPOSAL.md. */
export interface PrivacyDTO {
  consents: { consent_id: string; subject: string; purpose: string; channel: "Email" | "SMS"; active: boolean; source: string; updated_at: string; evidence_version: string }[];
  requests: { request_id: string; kind: "export" | "anonymize"; status: "pending"; created_at: string }[];
}


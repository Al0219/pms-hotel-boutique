/** Approved frontend/mock contract, not a Backend API. See docs/32_PRIVATE_07_MOCK_CONTRACT_PROPOSAL.md. */
export interface SecurityDTO {
  sessions: { session_id: string; device: string; browser: string; last_active: string; is_current: boolean; status: "active" | "closed" }[];
  mfa_enabled: boolean;
}


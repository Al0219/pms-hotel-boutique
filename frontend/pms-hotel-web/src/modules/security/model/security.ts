export interface Security {
  sessions: { id: string; device: string; browser: string; lastActive: Date; current: boolean; status: "active" | "closed" }[];
  mfaEnabled: boolean;
}
export type SecurityAction =
  | { type: "revoke"; id: string }
  | { type: "revoke-others" }
  | { type: "restart" }
  | { type: "mfa"; enabled: boolean }
  | { type: "reset" };


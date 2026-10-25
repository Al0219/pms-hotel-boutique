export interface StaffInvitationInfo {
  readonly organizationId: string; readonly staffUserId: string; readonly version: number;
  readonly invitationAllowed: boolean; readonly activationAllowed: boolean; readonly credentialPrepared: boolean;
}

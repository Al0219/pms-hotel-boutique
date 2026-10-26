export interface StaffInvitationInfoDTO {
  organizationId: string; staffUserId: string; version: number;
  invitationAllowed: boolean; activationAllowed: boolean; credentialPrepared: boolean;
}

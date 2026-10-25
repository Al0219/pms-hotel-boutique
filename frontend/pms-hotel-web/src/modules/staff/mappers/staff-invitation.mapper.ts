import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import type { StaffInvitationInfo } from '../model/staff-invitation';
export function mapStaffInvitation(value: unknown, org: string, id: string): StaffInvitationInfo {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainMappingError('INVALID_STAFF_INVITATION_INFO');
  const data = value as Record<string, unknown>;
  if (data.organizationId !== org || data.staffUserId !== id || !Number.isSafeInteger(data.version) || (data.version as number) < 0
    || typeof data.invitationAllowed !== 'boolean' || typeof data.activationAllowed !== 'boolean' || typeof data.credentialPrepared !== 'boolean'
    || (data.activationAllowed && !data.credentialPrepared)) throw new DomainMappingError('INVALID_STAFF_INVITATION_INFO');
  return { organizationId: org, staffUserId: id, version: data.version as number,
    invitationAllowed: data.invitationAllowed, activationAllowed: data.activationAllowed, credentialPrepared: data.credentialPrepared };
}
export function mapStaffCredentialPrepared(value: unknown): true {
  if (!value || typeof value !== 'object' || !('credentialPrepared' in value) || value.credentialPrepared !== true) throw new DomainMappingError('INVALID_STAFF_INVITATION_RESULT');
  return true;
}

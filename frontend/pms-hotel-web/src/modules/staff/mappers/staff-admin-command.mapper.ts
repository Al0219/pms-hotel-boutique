import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { uuid } from './staff-admin.mapper';
import type { StaffCommandResult } from '../model/staff-admin-edit';

export function mapStaffCommandResult(value: unknown, organizationId: string, id: string, expectedVersion: number): StaffCommandResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainMappingError('INVALID_STAFF_COMMAND_ACK');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).sort().join(',') !== 'changed,organizationId,staffUserId,version'
    || data.organizationId !== organizationId || data.staffUserId !== id || !uuid.test(organizationId) || !uuid.test(id)
    || typeof data.changed !== 'boolean' || !Number.isSafeInteger(data.version)
    || data.version !== expectedVersion + (data.changed ? 1 : 0)) throw new DomainMappingError('INVALID_STAFF_COMMAND_ACK');
  return { organizationId, staffUserId: id, version: data.version as number, changed: data.changed };
}

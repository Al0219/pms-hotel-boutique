import { DomainMappingError } from '@/lib/errors';
import { date, object, text } from '@/lib/validation';
import type { StaffInventoryCommand, StaffInventoryResult } from '../model/staff-inventory-command';

export function mapStaffInventoryMutation(raw: unknown, propertyId: string, command: StaffInventoryCommand): StaffInventoryResult {
  const dto = object(raw), uuidPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
  const exactText = (value: unknown) => { text(value); return value as string; };
  const uuid = (value: unknown) => { const id = exactText(value); if (!uuidPattern.test(id)) throw new DomainMappingError('INVALID_INVENTORY_ID'); return id; };
  if (dto.propertyId !== propertyId || !uuidPattern.test(propertyId) || ('id' in command && dto.id !== command.id)) throw new DomainMappingError('INVENTORY_WRITE_SCOPE_MISMATCH');
  const createdAt = date(dto.createdAt), updatedAt = date(dto.updatedAt);
  if (updatedAt < createdAt || ![dto.createdAt, dto.updatedAt].every(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(value))) throw new DomainMappingError('INVALID_INVENTORY_TIMESTAMP');
  const common = { id: uuid(dto.id), propertyId, code: exactText(dto.code), createdAt, updatedAt };
  return command.kind.endsWith('room') ? { kind: 'room', entry: { ...common, roomTypeId: uuid(dto.roomTypeId), floor: null, internalNotes: null } }
    : { kind: 'type', entry: { ...common, name: exactText(dto.name), presentation: null } };
}

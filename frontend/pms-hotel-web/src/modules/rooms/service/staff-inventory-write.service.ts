import { getPublicEnvironment } from '@/lib/env';
import { httpRequest, HttpStatusError } from '@/lib/http';
import { restoreStaffBffSession } from '@/lib/http/staff-bff';
import type { RoomCatalogDto, RoomTypeCatalogDto } from '../dtos/room-catalog.dto';
import type { StaffInventoryCommand } from '../model/staff-inventory-command';

export async function writeStaffInventory(propertyId: string, command: StaffInventoryCommand): Promise<RoomCatalogDto | RoomTypeCatalogDto> {
  if (getPublicEnvironment().useMockApi) throw new Error('REAL_INVENTORY_REQUIRES_MOCKS_FALSE');
  if (!['create-room', 'edit-room', 'create-type', 'edit-type'].includes(command.kind)) throw new Error('UNSUPPORTED_INVENTORY_COMMAND');
  const room = command.kind.endsWith('room'), edit = command.kind.startsWith('edit');
  const allowed = ['kind', ...(edit ? ['id'] : []), 'code', ...(room ? edit ? [] : ['roomTypeId'] : ['name'])];
  if (Object.keys(command).some(key => !allowed.includes(key))) throw new Error('UNSUPPORTED_INVENTORY_FIELD');
  const body = room ? { code: command.code, ...('roomTypeId' in command ? { roomTypeId: command.roomTypeId } : {}) }
    : { ...(command.code !== undefined ? { code: command.code } : {}), ...('name' in command && command.name !== undefined ? { name: command.name } : {}) };
  const path = `/api/staff/${room ? 'rooms' : 'room-types'}${'id' in command ? `/${encodeURIComponent(command.id)}` : ''}?${new URLSearchParams({ propertyId })}`;
  const options = { path: new URL(path, window.location.origin).href, method: edit ? 'PATCH' as const : 'POST' as const, json: body, withAuth: false };
  try { return await httpRequest(options); }
  catch (error) {
    // A rejected 401 has no write. One shared cookie refresh; never retry network/5xx/409.
    if (!(error instanceof HttpStatusError) || error.status !== 401) throw error;
    await restoreStaffBffSession();
    return httpRequest(options);
  }
}

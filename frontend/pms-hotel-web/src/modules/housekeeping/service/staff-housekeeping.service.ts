import { staffBffRead, staffBffRequest } from '@/lib/http/staff-bff';
import type { StaffHousekeepingBoardDto, StaffHousekeepingRoomDto } from '../dtos/staff-housekeeping.dto';
import type { HousekeepingChange } from '../model/staff-housekeeping';

const endpoint = '/api/staff/housekeeping/rooms';
export function readStaffHousekeeping(propertyId: string, signal?: AbortSignal): Promise<StaffHousekeepingBoardDto> {
  return staffBffRead(`${endpoint}?${new URLSearchParams({ propertyId })}`, signal);
}
export function changeStaffHousekeeping(propertyId: string, change: HousekeepingChange, signal?: AbortSignal): Promise<StaffHousekeepingRoomDto> {
  if (change.room.propertyId !== propertyId) throw new Error('HOUSEKEEPING_SCOPE_MISMATCH');
  if (change.action !== 'tracking' && (!change.room.tracked || !change.room.updatedAt)) throw new Error('HOUSEKEEPING_TRACKING_REQUIRED');
  const body = change.action === 'tracking' ? {} : change.action === 'dnd'
    ? { expectedUpdatedAt: change.room.updatedAt, dnd: change.dnd }
    : { expectedStatus: change.room.status, expectedUpdatedAt: change.room.updatedAt, toStatus: change.toStatus, reason: change.reason };
  return staffBffRequest(`${endpoint}/${encodeURIComponent(change.room.roomId)}/${change.action}?${new URLSearchParams({ propertyId })}`, {
    method: change.action === 'tracking' ? 'POST' : 'PUT', json: body, signal,
  });
}

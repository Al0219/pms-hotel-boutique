import { DomainMappingError } from '@/lib/errors';
import type { Room } from '../model/room';
import { isOccupancyDay, type RoomOccupancySnapshot, type RoomOccupancyStay, type RoomStaySource } from '../model/room-occupancy';

/** Assigned stays for [arrival, departure); no inference about cleaning, operational status or ATS. */
export function mapStaffRoomOccupancy(rooms: readonly Room[], stays: readonly RoomStaySource[], propertyId: string, date: string): RoomOccupancySnapshot {
  if (!isOccupancyDay(date) || rooms.some(room => room.propertyId !== propertyId)
      || stays.some(stay => stay.propertyId !== propertyId)) throw new DomainMappingError('OCCUPANCY_CONTEXT_MISMATCH');
  const entries = rooms.map(room => ({ roomId: room.id, stays: [] as RoomOccupancyStay[] }));
  const byId = new Map(entries.map(entry => [entry.roomId, entry]));
  const unassigned: RoomOccupancyStay[] = [];
  for (const stay of stays) {
    if (stay.reservationStatus === 'CANCELLED' || !['RESERVED', 'IN_HOUSE'].includes(stay.travelState)
        || stay.arrival > date || stay.departure <= date) continue;
    const item: RoomOccupancyStay = { reservationId: stay.reservationId, stayId: stay.stayId,
      confirmationCode: stay.confirmationCode,
      guestName: stay.guestName ?? 'Responsable no registrado', roomType: stay.roomType,
      arrival: stay.arrival, departure: stay.departure, state: stay.travelState as 'RESERVED' | 'IN_HOUSE' };
    if (stay.roomId === null) unassigned.push(item);
    else {
      const entry = byId.get(stay.roomId);
      if (!entry) throw new DomainMappingError('OCCUPANCY_ROOM_NOT_IN_INVENTORY');
      entry.stays.push(item);
    }
  }
  return { propertyId, date, unassigned, rooms: entries.map(entry => ({ ...entry,
    state: entry.stays.length > 1 ? 'CONFLICT' : entry.stays[0]?.state === 'IN_HOUSE' ? 'OCCUPIED'
      : entry.stays.length ? 'RESERVED' : 'FREE' })) };
}

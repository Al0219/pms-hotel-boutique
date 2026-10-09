'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RoomCatalogSnapshot } from '../model/room-catalog';
import type { Room } from '../model/room';
import type { StaffInventoryCommand } from '../model/staff-inventory-command';
import { writeStaffInventory } from '../service/staff-inventory-write.service';
import { mapStaffInventoryMutation } from '../mappers/staff-inventory-mutation.mapper';
import { staffRoomsEndpoint } from '../service/staff-inventory-read.service';

export function useStaffInventoryMutation(propertyId: string, sessionId: string) {
  const client = useQueryClient();
  return useMutation({ retry: false,
    mutationFn: async (command: StaffInventoryCommand) => mapStaffInventoryMutation(await writeStaffInventory(propertyId, command), propertyId, command),
    onSuccess: async result => {
      const catalogKey = ['staff-room-catalog', sessionId, propertyId, 'real'];
      client.setQueryData<RoomCatalogSnapshot>(catalogKey, current => {
        if (!current) return current;
        if (result.kind === 'room') return { ...current, rooms: [...current.rooms.filter(row => row.id !== result.entry.id), result.entry] };
        return { ...current, types: [...current.types.filter(row => row.id !== result.entry.id), result.entry] };
      });
      client.setQueriesData<Room[]>({ queryKey: ['rooms', propertyId, staffRoomsEndpoint, sessionId] }, current => current?.map(room => result.kind === 'room' && room.id === result.entry.id
        ? { ...room, number: result.entry.code } : result.kind === 'type' && room.roomTypeId === result.entry.id ? { ...room, roomTypeLabel: result.entry.name } : room));
      await Promise.all([
        client.invalidateQueries({ queryKey: catalogKey }),
        client.invalidateQueries({ queryKey: ['rooms', propertyId, staffRoomsEndpoint, sessionId] }),
        client.invalidateQueries({ queryKey: ['staff-room-occupancy', sessionId, propertyId] }),
        // Existing scoped read caches: names/codes also appear in stay relations.
        client.invalidateQueries({ queryKey: ['reservations', 'staff-stays', sessionId, propertyId] }),
        client.invalidateQueries({ queryKey: ['reservations', propertyId, '/api/staff/reservations'] }),
      ]);
    },
  });
}

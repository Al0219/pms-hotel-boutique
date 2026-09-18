import { requireDtoField } from '@/data/mapping/requireDtoField';
import { DomainMappingError } from '@/domain/errors/DomainMappingError';
import {
  type AssignedRoom,
  type ReservationStay,
  type StayRoomType,
  type StayStatus,
} from '@/modules/stay/domain/models/ReservationStay';

import {
  type AssignedRoomDto,
  type ReservationStayDto,
  type StayRoomTypeDto,
} from '@/modules/stay/data/dtos/ReservationStayDto';

function requireNonBlankString(value: string | null | undefined, field: string): string {
  const requiredValue = requireDtoField(value, field);

  if (requiredValue.trim().length === 0) {
    throw new DomainMappingError(field);
  }

  return requiredValue;
}

function mapRoomType(dto: StayRoomTypeDto | null | undefined): StayRoomType {
  const roomType = requireDtoField(dto, 'reservationStay.roomType');

  return {
    id: requireNonBlankString(roomType.id, 'reservationStay.roomType.id'),
    name: requireNonBlankString(roomType.name, 'reservationStay.roomType.name'),
  };
}

function mapRoom(dto: AssignedRoomDto | null | undefined): AssignedRoom | null {
  if (dto === null) {
    return null;
  }

  const room = requireDtoField(dto, 'reservationStay.room');

  return {
    id: requireNonBlankString(room.id, 'reservationStay.room.id'),
    number: requireNonBlankString(room.number, 'reservationStay.room.number'),
  };
}

function mapStayStatus(value: string | null | undefined): StayStatus {
  return requireNonBlankString(value, 'reservationStay.status') as StayStatus;
}

/** Maps a remote fixture DTO to the UI-safe domain read model without defaults. */
export function mapReservationStayDto(dto: ReservationStayDto | null | undefined): ReservationStay {
  const reservationStay = requireDtoField(dto, 'reservationStay');

  return {
    id: requireNonBlankString(reservationStay.id, 'reservationStay.id'),
    reservationId: requireNonBlankString(reservationStay.reservationId, 'reservationStay.reservationId'),
    roomType: mapRoomType(reservationStay.roomType),
    room: mapRoom(reservationStay.room),
    arrival: requireNonBlankString(reservationStay.arrival, 'reservationStay.arrival'),
    departure: requireNonBlankString(reservationStay.departure, 'reservationStay.departure'),
    status: mapStayStatus(reservationStay.status),
  };
}

/** Confirmed initial assignment contract; legacy MSW uses the same presentation fields. */
export interface RoomAssignmentPreviewDto {
  property_id: string;
  reservation_id: string;
  stay_id: string;
  arrival: string;
  departure: string;
  room_type_id: string | null;
  room_type: string;
  can_assign: boolean;
  reason: string | null;
  rooms: {
    room_id: string;
    number: string;
    floor: string | null;
    operational_status: 'ACTIVE' | 'OOO' | 'OOS';
    selectable: boolean;
    reason: string | null;
  }[];
}
export interface RoomAssignmentResultDto {
  property_id: string;
  reservation_id: string;
  stay_id: string;
  room_id: string;
  number: string;
}

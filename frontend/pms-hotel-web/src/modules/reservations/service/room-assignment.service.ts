import { getPublicEnvironment } from '@/lib/env';
import { staffBffRequest } from '@/lib/http/staff-bff';
import { httpRequest } from '@/lib/http';
import type { RoomAssignmentScope } from '../model/room-assignment';
import type { RoomAssignmentPreviewDto, RoomAssignmentResultDto } from '../dtos/room-assignment.dto';

function resource(scope: RoomAssignmentScope) {
  if (scope.real) return `/api/staff/reservations/${encodeURIComponent(scope.reservationId)}/stays/${encodeURIComponent(scope.stayId)}/room-assignment?${new URLSearchParams({ propertyId: scope.propertyId })}`;
  if (!getPublicEnvironment().useMockApi) throw new Error('ROOM_ASSIGNMENT_NOT_CONNECTED');
  const parts = [scope.propertyId, scope.reservationId, scope.stayId].map(encodeURIComponent);
  return new URL(`/__mock/staff-reservations/${parts[0]}/${parts[1]}/stays/${parts[2]}/room-assignment`, window.location.origin).href;
}
export function getRoomAssignmentPreview(scope: RoomAssignmentScope, signal?: AbortSignal): Promise<RoomAssignmentPreviewDto> {
  if (scope.real) return staffBffRequest(resource(scope), { signal });
  return httpRequest({ path: resource(scope), signal, withAuth: false });
}
export function assignStayRoom(scope: RoomAssignmentScope, roomId: string, signal?: AbortSignal): Promise<RoomAssignmentResultDto> {
  if (scope.real) return staffBffRequest(resource(scope), { method: 'PUT', signal,
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room_id: roomId }) });
  return httpRequest({ path: resource(scope), method: 'PUT', withAuth: false, signal,
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room_id: roomId }) });
}

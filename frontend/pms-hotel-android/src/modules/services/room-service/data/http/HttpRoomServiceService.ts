import { nativeGuestClient, NativeGuestClient } from '@/modules/guest-auth/data/http/NativeGuestClient';
import type { ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import type { RoomServiceService } from '../services/RoomServiceService';
import type { RoomServiceRequest } from '../../domain/models/RoomServiceRequest';
import type { RoomServiceProductDto, RoomServiceOrderDto } from '../dtos/RoomServiceDto';
function path(context?: ActiveReservationContext) {
  if (!context) throw new Error('Select a stay');
  return `/api/v1/guest-auth/account/reservations/${encodeURIComponent(context.reservationId)}/stays/${encodeURIComponent(context.reservationStayId)}`;
}
function payload(input: RoomServiceRequest) {
  return { serviceDate:input.serviceDate,deliveryTime:input.deliveryTime,notes:input.notes?.trim()||null,
    items:input.items.map(line=>({productId:line.itemFixtureKey,quantity:line.quantity,mealPeriod:line.mealPeriod})) };
}
export class HttpRoomServiceService implements RoomServiceService {
  constructor(private readonly client: NativeGuestClient = nativeGuestClient) {}
  getMenu(context?: ActiveReservationContext) { return this.client.request<RoomServiceProductDto[]>(`${path(context)}/room-service-menu`); }
  listOrders(context: ActiveReservationContext) { return this.client.request<RoomServiceOrderDto[]>(`${path(context)}/room-service-orders`); }
  submitRequest(input: RoomServiceRequest,context?: ActiveReservationContext,key?: string) {
    if(!key) return Promise.reject(new Error('Order intent required'));
    return this.client.request<RoomServiceOrderDto>(`${path(context)}/room-service-orders`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload(input))});
  }
  updateOrder(input: RoomServiceRequest,context: ActiveReservationContext,id: string,expectedUpdatedAt: string) {
    return this.client.request<RoomServiceOrderDto>(`${path(context)}/room-service-orders/${encodeURIComponent(id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload(input),expectedUpdatedAt})});
  }
  cancelOrder(context: ActiveReservationContext,id: string,expectedUpdatedAt: string) {
    return this.client.request<RoomServiceOrderDto>(`${path(context)}/room-service-orders/${encodeURIComponent(id)}/cancel`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedUpdatedAt})});
  }
}

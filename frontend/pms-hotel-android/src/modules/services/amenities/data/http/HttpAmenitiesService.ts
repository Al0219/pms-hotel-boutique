import { nativeGuestClient, NativeGuestClient } from '@/modules/guest-auth/data/http/NativeGuestClient';
import type { ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import type { AmenitiesService } from '../services/AmenitiesService';
import type { AmenitiesRequest } from '../../domain/AmenitiesRequest';
import type { AmenityCatalogDto, AmenitiesRequestDto } from '../dtos/AmenitiesDto';
function path(context?: ActiveReservationContext) {
  if (!context) throw new Error('Select a stay');
  return `/api/v1/guest-auth/account/reservations/${encodeURIComponent(context.reservationId)}/stays/${encodeURIComponent(context.reservationStayId)}`;
}
function payload(input: AmenitiesRequest) {
  return { serviceDate:input.serviceDate,deliveryTime:input.deliveryTime,notes:input.notes?.trim()||null,
    items:input.items.map(line=>({itemId:line.itemFixtureKey,quantity:line.quantity})) };
}
export class HttpAmenitiesService implements AmenitiesService {
  constructor(private readonly client: NativeGuestClient = nativeGuestClient) {}
  getCatalog(context?: ActiveReservationContext) { return this.client.request<AmenityCatalogDto[]>(`${path(context)}/amenities-catalog`); }
  listRequests(context: ActiveReservationContext) { return this.client.request<AmenitiesRequestDto[]>(`${path(context)}/amenities-requests`); }
  submitRequest(input: AmenitiesRequest,context?: ActiveReservationContext,key?: string) {
    if(!key) return Promise.reject(new Error('Order intent required'));
    return this.client.request<AmenitiesRequestDto>(`${path(context)}/amenities-requests`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload(input))});
  }
  updateRequest(input: AmenitiesRequest,context: ActiveReservationContext,id: string,expectedUpdatedAt: string) {
    return this.client.request<AmenitiesRequestDto>(`${path(context)}/amenities-requests/${encodeURIComponent(id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload(input),expectedUpdatedAt})});
  }
  cancelRequest(context: ActiveReservationContext,id: string,expectedUpdatedAt: string) {
    return this.client.request<AmenitiesRequestDto>(`${path(context)}/amenities-requests/${encodeURIComponent(id)}/cancel`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedUpdatedAt})});
  }
}

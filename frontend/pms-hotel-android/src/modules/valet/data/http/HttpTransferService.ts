import {nativeGuestClient} from '@/modules/guest-auth/data/http/NativeGuestClient';
import type {ActiveReservationContext} from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import type {TransferInput,TransferOrder} from '../../domain/Transfer';
function base(c:ActiveReservationContext){return `/api/v1/guest-auth/account/reservations/${encodeURIComponent(c.reservationId)}/stays/${encodeURIComponent(c.reservationStayId)}`;}
export const transferService={
 prices:(c:ActiveReservationContext)=>nativeGuestClient.request<unknown[]>(`${base(c)}/transfer-prices`),
 catalog:(c:ActiveReservationContext)=>nativeGuestClient.request<unknown[]>(`${base(c)}/transfer-catalog`),
 list:(c:ActiveReservationContext)=>nativeGuestClient.request<unknown[]>(`${base(c)}/transfer-requests`),
 save:(c:ActiveReservationContext,input:TransferInput,key:string,editing?:TransferOrder)=>nativeGuestClient.request<unknown>(`${base(c)}/transfer-requests${editing?`/${editing.id}`:''}`,{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(editing?{...input,expectedUpdatedAt:editing.updatedAt}:input)}),
 cancel:(c:ActiveReservationContext,row:TransferOrder)=>nativeGuestClient.request<unknown>(`${base(c)}/transfer-requests/${row.id}/cancel`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedUpdatedAt:row.updatedAt})}),
};

import {staffBffRead,staffBffRequest} from '@/lib/http/staff-bff';
import type {RoomServiceOrderDto} from '../dtos/room-service.dto';
import type {RoomServiceTarget} from '../model/room-service-order';
export function readRoomServiceOrders(propertyId:string,signal?:AbortSignal):Promise<RoomServiceOrderDto[]> {return staffBffRead(`/api/staff/room-service/orders?${new URLSearchParams({propertyId})}`,signal);}
export function transitionRoomServiceOrder(propertyId:string,id:string,expectedUpdatedAt:string,targetStatus:RoomServiceTarget,signal?:AbortSignal):Promise<RoomServiceOrderDto> {
 return staffBffRequest(`/api/staff/room-service/orders/${encodeURIComponent(id)}/status?${new URLSearchParams({propertyId})}`,{method:'PUT',json:{expectedUpdatedAt,targetStatus},signal});
}

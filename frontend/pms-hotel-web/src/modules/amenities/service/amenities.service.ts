import {staffBffRead,staffBffRequest} from '@/lib/http/staff-bff';
import type {AmenitiesOrderDto} from '../dtos/amenities.dto';
import type {AmenitiesTarget} from '../model/amenities-order';
export function readAmenitiesOrders(propertyId:string,signal?:AbortSignal):Promise<AmenitiesOrderDto[]> {return staffBffRead(`/api/staff/amenities/requests?${new URLSearchParams({propertyId})}`,signal);}
export function transitionAmenitiesOrder(propertyId:string,id:string,expectedUpdatedAt:string,targetStatus:AmenitiesTarget,signal?:AbortSignal):Promise<AmenitiesOrderDto> {
 return staffBffRequest(`/api/staff/amenities/requests/${encodeURIComponent(id)}/status?${new URLSearchParams({propertyId})}`,{method:'PUT',json:{expectedUpdatedAt,targetStatus},signal});
}

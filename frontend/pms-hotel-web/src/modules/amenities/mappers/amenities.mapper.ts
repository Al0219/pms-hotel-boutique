import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import type { AmenitiesOrderDto } from '../dtos/amenities.dto';
import type { AmenitiesOrder } from '../model/amenities-order';
const uuid=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const text=(v:unknown)=>typeof v==='string'&&v.trim().length>0;
export function projectAmenitiesOrders(value:unknown,propertyId:string):AmenitiesOrderDto[] {
 if(!Array.isArray(value))throw new DomainMappingError('INVALID_AMENITIES_ORDERS');
 const ids=new Set<string>();
 return value.map(raw=>{
  const r=raw as AmenitiesOrderDto;
  if(!r||!uuid.test(r.id)||ids.has(r.id)||r.propertyId!==propertyId||!text(r.confirmationCode)||!(r.roomCode===null||text(r.roomCode))
   ||!/^\d{4}-\d{2}-\d{2}$/.test(r.serviceDate)||!Number.isFinite(Date.parse(r.serviceDate))||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.deliveryTime)
   ||!['OPEN','IN_PROGRESS','DONE','CANCELLED'].includes(r.status)||typeof r.updatedAt!=='string'||!Number.isFinite(Date.parse(r.updatedAt))
   ||!(r.notes===null||typeof r.notes==='string'&&r.notes.length<=500)||!Array.isArray(r.items)||!r.items.length||r.items.length>5)throw new DomainMappingError('INVALID_AMENITIES_ORDER');
  const products=new Set<string>();const items=r.items.map(line=>{
   if(!line||!uuid.test(line.itemId)||products.has(line.itemId)||!text(line.itemName)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>5)throw new DomainMappingError('INVALID_AMENITIES_LINE');
   products.add(line.itemId);return {itemId:line.itemId,itemName:line.itemName,quantity:line.quantity};
  });
  ids.add(r.id);return {id:r.id,propertyId,confirmationCode:r.confirmationCode,roomCode:r.roomCode,serviceDate:r.serviceDate,deliveryTime:r.deliveryTime,notes:r.notes,status:r.status,updatedAt:r.updatedAt,items};
 });
}
export function mapAmenitiesOrders(value:unknown,propertyId:string):AmenitiesOrder[] {
 return projectAmenitiesOrders(value,propertyId).map(row=>({id:row.id,propertyId,reference:row.confirmationCode,roomLabel:row.roomCode,serviceDate:row.serviceDate,deliveryTime:row.deliveryTime,notes:row.notes,status:row.status,updatedAt:row.updatedAt,
 items:row.items.map(line=>({itemId:line.itemId,itemName:line.itemName,quantity:line.quantity}))}));
}

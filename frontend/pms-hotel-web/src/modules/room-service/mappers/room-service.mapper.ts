import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import type { RoomServiceOrderDto } from '../dtos/room-service.dto';
import type { RoomServiceOrder } from '../model/room-service-order';
const uuid=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const minor=(v:number)=>Number.isSafeInteger(v)&&v>=0;
const text=(v:unknown)=>typeof v==='string'&&v.trim().length>0;
export function projectRoomServiceOrders(value:unknown,propertyId:string):RoomServiceOrderDto[] {
 if(!Array.isArray(value))throw new DomainMappingError('INVALID_ROOM_SERVICE_ORDERS');
 const ids=new Set<string>();
 return value.map(raw=>{
  const r=raw as RoomServiceOrderDto;
  if(!r||!uuid.test(r.id)||ids.has(r.id)||r.propertyId!==propertyId||!text(r.confirmationCode)||!(r.roomCode===null||text(r.roomCode))||r.currency!=='GTQ'||!minor(r.totalMinor)
   ||!/^\d{4}-\d{2}-\d{2}$/.test(r.serviceDate)||!Number.isFinite(Date.parse(r.serviceDate))||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.deliveryTime)
   ||!['OPEN','IN_PROGRESS','DONE','CANCELLED'].includes(r.status)||typeof r.updatedAt!=='string'||!Number.isFinite(Date.parse(r.updatedAt))
   ||!(r.notes===null||typeof r.notes==='string'&&r.notes.length<=500)||!Array.isArray(r.items)||!r.items.length||r.items.length>6)throw new DomainMappingError('INVALID_ROOM_SERVICE_ORDER');
  const products=new Set<string>();const items=r.items.map(line=>{
   if(!line||!uuid.test(line.productId)||products.has(line.productId)||!text(line.productName)||!['BREAKFAST','LUNCH','DINNER','BEVERAGES'].includes(line.mealPeriod)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>5||!minor(line.unitPriceMinor)||!minor(line.lineTotalMinor)||line.lineTotalMinor!==line.quantity*line.unitPriceMinor)throw new DomainMappingError('INVALID_ROOM_SERVICE_LINE');
   products.add(line.productId);return {productId:line.productId,productName:line.productName,mealPeriod:line.mealPeriod,quantity:line.quantity,unitPriceMinor:line.unitPriceMinor,lineTotalMinor:line.lineTotalMinor};
  });
  if(items.reduce((sum,line)=>sum+line.lineTotalMinor,0)!==r.totalMinor)throw new DomainMappingError('INVALID_ROOM_SERVICE_TOTAL');
  ids.add(r.id);return {id:r.id,propertyId,confirmationCode:r.confirmationCode,roomCode:r.roomCode,serviceDate:r.serviceDate,deliveryTime:r.deliveryTime,currency:'GTQ',totalMinor:r.totalMinor,notes:r.notes,status:r.status,updatedAt:r.updatedAt,items};
 });
}
export function mapRoomServiceOrders(value:unknown,propertyId:string):RoomServiceOrder[] {
 return projectRoomServiceOrders(value,propertyId).map(row=>({id:row.id,propertyId,reference:row.confirmationCode,roomLabel:row.roomCode,serviceDate:row.serviceDate,deliveryTime:row.deliveryTime,totalMinor:row.totalMinor,notes:row.notes,status:row.status,updatedAt:row.updatedAt,
 items:row.items.map(line=>({productId:line.productId,productName:line.productName,quantity:line.quantity,unitPriceMinor:line.unitPriceMinor,lineTotalMinor:line.lineTotalMinor}))}));
}

import { DomainMappingError } from '@/domain/errors/DomainMappingError';
import type { ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import type { RoomServiceMenu, RoomServicePeriod } from '../../domain/models/RoomServiceMenu';
import type { PersistedRoomServiceOrder } from '../../domain/models/PersistedRoomServiceOrder';
import type { RoomServiceProductDto, RoomServiceOrderDto } from '../dtos/RoomServiceDto';
const periods = ['BREAKFAST','LUNCH','DINNER','BEVERAGES'];
const money = (value: number) => Number.isSafeInteger(value) && value >= 0;
const nonBlank = (value: string) => typeof value === 'string' && value.trim().length > 0;
function invalid(): never { throw new DomainMappingError('roomService'); }
export function mapRoomServiceMenu(dtos: RoomServiceProductDto[]): RoomServiceMenu {
  if (!Array.isArray(dtos)) return invalid();
  const ids=new Set<string>();
  return { items: dtos.map(row => {
    if (!row || !nonBlank(row.id) || ids.has(row.id) || !nonBlank(row.name) || row.currency!=='GTQ' || !money(row.unitPriceMinor) || typeof row.available!=='boolean'
      || !Array.isArray(row.periods) || !row.periods.length || row.periods.some(period=>!periods.includes(period))) return invalid();
    ids.add(row.id);
    // Preserve the existing cart identity field: in real mode its value is the opaque persisted product ID.
    return { fixtureKey: row.id, name: row.name, periods: row.periods as RoomServicePeriod[], priceAmount: row.unitPriceMinor/100, available: row.available };
  }) };
}
export function mapRoomServiceOrder(row: RoomServiceOrderDto, context: ActiveReservationContext): PersistedRoomServiceOrder {
  if (!row || !nonBlank(row.id) || row.reservationId!==context.reservationId || row.stayId!==context.reservationStayId || !nonBlank(row.confirmationCode)
    || row.currency!=='GTQ' || !money(row.totalMinor) || !['OPEN','IN_PROGRESS','DONE','CANCELLED'].includes(row.status)
    || !/^\d{4}-\d{2}-\d{2}$/.test(row.serviceDate) || !Number.isFinite(Date.parse(row.serviceDate)) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.deliveryTime)
    || !(row.notes===null || typeof row.notes==='string' && row.notes.length<=500)
    || [row.createdAt,row.updatedAt,row.modifiableUntil].some(value=>typeof value!=='string'||!Number.isFinite(Date.parse(value)))
    || !Array.isArray(row.items) || !row.items.length || row.items.length>6) return invalid();
  const ids=new Set<string>();
  const items=row.items.map(line=>{
    if(!line || !nonBlank(line.productId) || ids.has(line.productId) || !nonBlank(line.productName) || !periods.includes(line.mealPeriod)
      || !Number.isInteger(line.quantity) || line.quantity<1 || line.quantity>5 || !money(line.unitPriceMinor) || !money(line.lineTotalMinor) || line.lineTotalMinor!==line.quantity*line.unitPriceMinor) return invalid();
    ids.add(line.productId);return {productId:line.productId,productName:line.productName,mealPeriod:line.mealPeriod as RoomServicePeriod,quantity:line.quantity,unitPriceMinor:line.unitPriceMinor,lineTotalMinor:line.lineTotalMinor};
  });
  if(items.reduce((sum,line)=>sum+line.lineTotalMinor,0)!==row.totalMinor) return invalid();
  return {id:row.id,reservationId:row.reservationId,stayId:row.stayId,confirmationCode:row.confirmationCode,serviceDate:row.serviceDate,deliveryTime:row.deliveryTime,totalMinor:row.totalMinor,notes:row.notes,status:row.status as PersistedRoomServiceOrder['status'],createdAt:row.createdAt,updatedAt:row.updatedAt,modifiableUntil:row.modifiableUntil,items};
}

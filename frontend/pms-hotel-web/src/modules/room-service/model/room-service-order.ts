export interface RoomServiceOrder {
 id:string;propertyId:string;reference:string;roomLabel:string|null;serviceDate:string;deliveryTime:string;totalMinor:number;notes:string|null;status:'OPEN'|'IN_PROGRESS'|'DONE'|'CANCELLED';updatedAt:string;
 items:{productId:string;productName:string;quantity:number;unitPriceMinor:number;lineTotalMinor:number}[];
}
export type RoomServiceTarget='IN_PROGRESS'|'DONE';
export const roomServiceStatuses={OPEN:'Solicitado',IN_PROGRESS:'En proceso',DONE:'Completado',CANCELLED:'Cancelado'};

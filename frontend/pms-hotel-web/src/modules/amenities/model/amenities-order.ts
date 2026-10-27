export interface AmenitiesOrder {
 id:string;propertyId:string;reference:string;roomLabel:string|null;serviceDate:string;deliveryTime:string;notes:string|null;status:'OPEN'|'IN_PROGRESS'|'DONE'|'CANCELLED';updatedAt:string;
 items:{itemId:string;itemName:string;quantity:number}[];
}
export type AmenitiesTarget='IN_PROGRESS'|'DONE';
export const amenitiesStatuses={OPEN:'Solicitado',IN_PROGRESS:'En proceso',DONE:'Completado',CANCELLED:'Cancelado'};

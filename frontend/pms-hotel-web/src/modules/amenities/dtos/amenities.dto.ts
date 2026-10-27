export interface AmenitiesOrderDto {
 id:string;propertyId:string;confirmationCode:string;roomCode:string|null;serviceDate:string;deliveryTime:string;notes:string|null;status:'OPEN'|'IN_PROGRESS'|'DONE'|'CANCELLED';updatedAt:string;
 items:{itemId:string;itemName:string;quantity:number}[];
}

export interface RoomServiceOrderDto {
 id:string;propertyId:string;confirmationCode:string;roomCode:string|null;serviceDate:string;deliveryTime:string;currency:string;totalMinor:number;notes:string|null;status:'OPEN'|'IN_PROGRESS'|'DONE'|'CANCELLED';updatedAt:string;
 items:{productId:string;productName:string;mealPeriod:string;quantity:number;unitPriceMinor:number;lineTotalMinor:number}[];
}

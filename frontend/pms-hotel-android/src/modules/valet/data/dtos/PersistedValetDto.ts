/** Confirmed Backend contract62. No fixture identity crosses this boundary. */
export interface VehicleDetailsDto {make:string;model:string;platePrefix:string;plateBody:string;color:string|null}
export interface ValetVehicleDto extends VehicleDetailsDto {id:string;savedVehicleId:string;propertyId:string;stayId:string;location:string;createdAt:string;updatedAt:string;hasActiveRequest:boolean}
export interface ValetOrderDto {id:string;propertyId:string;reservationId:string;stayId:string;confirmationCode:string;roomCode:string|null;vehicleId:string;vehicle:VehicleDetailsDto;serviceDate:string;deliveryTime:string;status:string;createdAt:string;updatedAt:string;modifiableUntil:string}

export interface SavedVehicleDto extends VehicleDetailsDto {id:string;createdAt:string;updatedAt:string;canAssociate:boolean}

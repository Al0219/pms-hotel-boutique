import type { VehiclePlatePrefix } from '../session/SessionVehicle';
export interface VehicleDetails {make:string;model:string;platePrefix:VehiclePlatePrefix;plateBody:string;color:string|null}
export interface PersistedVehicle extends VehicleDetails {id:string;savedVehicleId:string;propertyId:string;stayId:string;location:'PARKED'|'WITH_GUEST';createdAt:string;updatedAt:string;hasActiveRequest:boolean}
export interface PersistedValetRequest {id:string;propertyId:string;reservationId:string;stayId:string;confirmationCode:string;roomCode:string|null;vehicleId:string;vehicle:VehicleDetails;serviceDate:string;deliveryTime:string;status:'OPEN'|'IN_PROGRESS'|'DONE'|'CANCELLED';createdAt:string;updatedAt:string;modifiableUntil:string}
export interface VehicleRegistration extends VehicleDetails {location:'PARKED'|'WITH_GUEST'}
export interface ValetSchedule {serviceDate:string;deliveryTime:string}

export interface SavedVehicle extends VehicleDetails {id:string;createdAt:string;updatedAt:string;canAssociate:boolean}

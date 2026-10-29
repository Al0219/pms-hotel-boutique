import {DomainMappingError} from '@/domain/errors/DomainMappingError';
import type {ActiveReservationContext} from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import type {PersistedValetRequest,PersistedVehicle,VehicleDetails,SavedVehicle} from '../../domain/PersistedValet';
import type {ValetOrderDto,ValetVehicleDto,VehicleDetailsDto,SavedVehicleDto} from '../dtos/PersistedValetDto';
import {vehiclePlatePrefixes} from '../../session/vehicleValidation';
const uuid=/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const text=(v:unknown,max:number)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
function invalid():never{throw new DomainMappingError('valet');}
function details(r:VehicleDetailsDto):VehicleDetails {
 if(!r||!text(r.make,40)||!text(r.model,40)||!vehiclePlatePrefixes.includes(r.platePrefix as VehicleDetails['platePrefix'])||!/^\d{2,3}[A-Z]{3}$/.test(r.plateBody)||!(r.color===null||text(r.color,30)))return invalid();
 return {make:r.make,model:r.model,platePrefix:r.platePrefix as VehicleDetails['platePrefix'],plateBody:r.plateBody,color:r.color};
}
function timestamps(values:unknown[]){return values.every(v=>typeof v==='string'&&Number.isFinite(Date.parse(v)));}
export function mapPersistedVehicle(r:ValetVehicleDto,c:ActiveReservationContext):PersistedVehicle {
 if(!r||!uuid.test(r.id)||!uuid.test(r.savedVehicleId)||!uuid.test(r.propertyId)||r.stayId!==c.reservationStayId||!['PARKED','WITH_GUEST'].includes(r.location)||typeof r.hasActiveRequest!=='boolean'||!timestamps([r.createdAt,r.updatedAt]))return invalid();
 return {...details(r),id:r.id,savedVehicleId:r.savedVehicleId,propertyId:r.propertyId,stayId:r.stayId,location:r.location as PersistedVehicle['location'],createdAt:r.createdAt,updatedAt:r.updatedAt,hasActiveRequest:r.hasActiveRequest};
}
export function mapPersistedValetRequest(r:ValetOrderDto,c:ActiveReservationContext):PersistedValetRequest {
 if(!r||!uuid.test(r.id)||!uuid.test(r.propertyId)||!uuid.test(r.vehicleId)||r.reservationId!==c.reservationId||r.stayId!==c.reservationStayId||!text(r.confirmationCode,32)||!(r.roomCode===null||text(r.roomCode,100))||!['OPEN','IN_PROGRESS','DONE','CANCELLED'].includes(r.status)||!/^\d{4}-\d{2}-\d{2}$/.test(r.serviceDate)||!timestamps([r.serviceDate,r.createdAt,r.updatedAt,r.modifiableUntil])||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.deliveryTime))return invalid();
 return {id:r.id,propertyId:r.propertyId,reservationId:r.reservationId,stayId:r.stayId,confirmationCode:r.confirmationCode,roomCode:r.roomCode,vehicleId:r.vehicleId,vehicle:details(r.vehicle),serviceDate:r.serviceDate,deliveryTime:r.deliveryTime,status:r.status as PersistedValetRequest['status'],createdAt:r.createdAt,updatedAt:r.updatedAt,modifiableUntil:r.modifiableUntil};
}

export function mapSavedVehicle(r:SavedVehicleDto):SavedVehicle {
 if(!r||!uuid.test(r.id)||typeof r.canAssociate!=='boolean'||!timestamps([r.createdAt,r.updatedAt]))return invalid();
 return {...details(r),id:r.id,createdAt:r.createdAt,updatedAt:r.updatedAt,canAssociate:r.canAssociate};
}

import {staffBffRead,staffBffRequest} from '@/lib/http/staff-bff';
import type {PersistedValetDto,PersistedVehicleDto} from '../dtos/persisted-valet.dto';
import type {ValetTarget} from '../model/persisted-valet';
const query=(propertyId:string)=>new URLSearchParams({propertyId}).toString();
export function readValet(property:string,signal?:AbortSignal):Promise<PersistedValetDto[]>{return staffBffRead(`/api/staff/valet/requests?${query(property)}`,signal);}
export function readVehicles(property:string,signal?:AbortSignal):Promise<PersistedVehicleDto[]>{return staffBffRead(`/api/staff/valet/vehicles?${query(property)}`,signal);}
export function transitionValet(property:string,id:string,expectedUpdatedAt:string,targetStatus:ValetTarget,signal?:AbortSignal):Promise<PersistedValetDto>{return staffBffRequest(`/api/staff/valet/requests/${encodeURIComponent(id)}/status?${query(property)}`,{method:'PUT',json:{expectedUpdatedAt,targetStatus},signal});}
export function returnValet(property:string,id:string,expectedUpdatedAt:string,signal?:AbortSignal):Promise<PersistedVehicleDto>{return staffBffRequest(`/api/staff/valet/vehicles/${encodeURIComponent(id)}/return?${query(property)}`,{method:'POST',json:{expectedUpdatedAt},signal});}

export function releaseValet(property:string,id:string,expectedUpdatedAt:string,signal?:AbortSignal):Promise<PersistedVehicleDto>{return staffBffRequest(`/api/staff/valet/vehicles/${encodeURIComponent(id)}/release?${query(property)}`,{method:'POST',json:{expectedUpdatedAt},signal});}

import type {PersistedVehicle} from './persisted-valet';
export interface VehicleFilters {search:string;location:'ALL'|'PARKED'|'WITH_GUEST';stay:'OPERATIONAL'|'ACTIVE'|'INACTIVE'|'ALL'}
export const initialVehicleFilters:VehicleFilters={search:'',location:'ALL',stay:'OPERATIONAL'};
const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
/** Presentation only: eligibility/visibility is supplied by the authenticated Backend projection. */
export function presentVehicles(rows:readonly PersistedVehicle[],filters:VehicleFilters){
 const words=normalized(filters.search).split(/\s+/).filter(Boolean);
 return rows.filter(r=>(filters.location==='ALL'||r.location===filters.location)&&(filters.stay==='ALL'||(filters.stay==='OPERATIONAL'?r.operationallyVisible:filters.stay==='ACTIVE'?r.stayActive:!r.stayActive))&&words.every(word=>normalized(`${r.make} ${r.model} ${r.platePrefix} ${r.plateBody} ${r.reference} ${r.roomLabel??''}`).includes(word)))
 .sort((a,b)=>Number(b.location==='PARKED')-Number(a.location==='PARKED')||`${a.platePrefix} ${a.plateBody}`.localeCompare(`${b.platePrefix} ${b.plateBody}`)||a.reference.localeCompare(b.reference)||a.id.localeCompare(b.id));
}

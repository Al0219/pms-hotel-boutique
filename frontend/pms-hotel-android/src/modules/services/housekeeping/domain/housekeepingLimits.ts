import {getServiceDateTimeMs} from '@/modules/service-requests/domain/serviceRequestPresentation';
export interface CleaningSchedule {id:string;serviceDate:string;timeSlot:string;status:string}
/** Mirrors Backend UX constraints; server rechecks under the stay lock. */
export function housekeepingLimitError(rows:readonly CleaningSchedule[],date:string,slot:string,exclude?:string,timezone?:string):string|null {
 const active=rows.filter(r=>r.id!==exclude&&['OPEN','IN_PROGRESS','DONE','REQUESTED','ASSIGNED','COMPLETED'].includes(r.status));
 if(active.filter(r=>r.serviceDate===date).length>=2)return 'Máximo 2 limpiezas por día.';
 const start=getServiceDateTimeMs(date,slot,timezone);if(start===null)return 'Selecciona un horario válido.';
 if(active.some(r=>{const other=getServiceDateTimeMs(r.serviceDate,r.timeSlot,timezone);return other!==null&&Math.abs(other-start)<8*60*60*1000;}))return 'Separa las limpiezas al menos 8 horas.';
 return null;
}

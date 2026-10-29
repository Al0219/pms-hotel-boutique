/** Client-side presentation of already-authorized rows; no operational policy or API calls. */
export type RequestState = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type RequestStateFilter = 'PENDING' | 'ALL' | RequestState;
export interface OperationalRequestRow {
  id:string;reference:string;roomLabel:string|null;serviceDate:string;notes:string|null;status:RequestState;
}
export const requestStateLabels = {OPEN:'Solicitado',IN_PROGRESS:'En proceso',DONE:'Completado',CANCELLED:'Cancelado'};
export const initialRequestFilters = { search:'',status:'PENDING' as RequestStateFilter,date:'' };
export type RequestFilters = typeof initialRequestFilters;
const ranks:Record<RequestState,number>={OPEN:0,IN_PROGRESS:1,DONE:2,CANCELLED:3};
const normalize=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
export function presentOperationalRequests<T extends OperationalRequestRow>(rows:readonly T[],filters:RequestFilters,time:(row:T)=>string,searchText?:(row:T)=>string):T[] {
  const search=normalize(filters.search);
  return rows.filter(row=>(filters.status==='ALL'||filters.status==='PENDING'&&(row.status==='OPEN'||row.status==='IN_PROGRESS')||row.status===filters.status)
    &&(!filters.date||row.serviceDate===filters.date)
    &&(!search||normalize([row.reference,row.roomLabel??'',row.notes??'',searchText?.(row)??''].join(' ')).includes(search)))
    .sort((a,b)=>ranks[a.status]-ranks[b.status]||a.serviceDate.localeCompare(b.serviceDate)||time(a).localeCompare(time(b))||a.id.localeCompare(b.id));
}

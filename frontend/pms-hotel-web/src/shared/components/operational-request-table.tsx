"use client";
import {useId,useState,type ReactNode} from 'react';
import {DataTable,type DataTableColumn} from './data-table';
import {StatusBadge,type StatusBadgeVariant} from './status-badge';
import {EntityFilterField,EntityListSurface} from './entity-list-surface';
import {Button} from './button';
import {SvgIcon} from './svg-icon';
import {initialRequestFilters,presentOperationalRequests,requestStateLabels,type OperationalRequestRow,type RequestState,type RequestStateFilter} from './operational-request-table.presentation';
import styles from './operational-request-table.module.css';
const variants:Record<RequestState,StatusBadgeVariant>={OPEN:'warning',IN_PROGRESS:'info',DONE:'success',CANCELLED:'neutral'};
export function useOperationalRequestFilters(){return useState(initialRequestFilters);}
interface Props<T extends OperationalRequestRow> {
 filterState?:ReturnType<typeof useOperationalRequestFilters>;rows:readonly T[];columns:readonly DataTableColumn<T>[];label:string;minWidth?:number;
 emptyMessage?:string;time:(row:T)=>string;searchText?:(row:T)=>string;renderDetails?:(row:T)=>ReactNode;
}
export function OperationalRequestTable<T extends OperationalRequestRow>({rows,columns,label,time,searchText,renderDetails,filterState,minWidth=760,emptyMessage='Sin solicitudes registradas.'}:Props<T>) {
 const localFilters=useOperationalRequestFilters();const [filters,setFilters]=filterState??localFilters;const [expandedId,setExpandedId]=useState<string|null>(null);const prefix=useId();
 const visible=presentOperationalRequests(rows,filters,time,searchText);
 function toggle(id:string){setExpandedId(current=>current===id?null:id);}
 const detailsId=(id:string)=>`${prefix}-${id}-details`;
 const decorated=columns.map((column,index)=>index===0?{...column,render:(row:T)=><div className={styles.reference}>
   {renderDetails?<button type="button" className={styles.toggle} aria-label={`${expandedId===row.id?'Ocultar':'Ver'} artículos de ${row.reference}`} aria-expanded={expandedId===row.id} aria-controls={detailsId(row.id)} onClick={event=>{event.stopPropagation();toggle(row.id);}}><SvgIcon name="chevron" style={{transform:expandedId===row.id?'rotate(180deg)':undefined}}/></button>:null}
   <div>{column.render(row)}<div><StatusBadge variant={variants[row.status]} ariaLabel={`Estado: ${requestStateLabels[row.status]}`}>{requestStateLabels[row.status]}</StatusBadge></div></div>
  </div>}:column);
 const update=(next:Partial<typeof filters>)=>{setFilters(current=>({...current,...next}));setExpandedId(null);};
 return <div className={styles.root}><EntityListSurface label={`Filtros de ${label}`} filterColumns={3} showScrollHint={false}
 filters={<><EntityFilterField label="Buscar" search><input type="search" value={filters.search} placeholder="Reserva, habitación, notas…" onChange={event=>update({search:event.target.value})}/></EntityFilterField>
 <EntityFilterField label="Estado"><select value={filters.status} onChange={event=>update({status:event.target.value as RequestStateFilter})}>
  <option value="PENDING">Pendientes</option><option value="OPEN">Solicitados</option><option value="IN_PROGRESS">En proceso</option><option value="DONE">Completados</option><option value="CANCELLED">Cancelados</option><option value="ALL">Todos</option>
 </select></EntityFilterField><EntityFilterField label="Fecha del servicio"><input type="date" value={filters.date} onChange={event=>update({date:event.target.value})}/></EntityFilterField></>}
 filterActions={<Button variant="outline" onClick={()=>{setFilters(initialRequestFilters);setExpandedId(null);}}>Limpiar filtros</Button>}
 filterFeedback={<p className={styles.feedback} aria-live="polite">{visible.length} de {rows.length} solicitudes</p>}>
 <DataTable columns={decorated} rows={visible} getRowKey={row=>row.id} label={label} minWidth={minWidth} emptyState={rows.length===0?emptyMessage:"Sin solicitudes para los filtros seleccionados."} scrollLabel={`Desplazar ${label}`}
 renderRow={(row,cells)=><tr key={row.id} data-request-state={row.status} tabIndex={renderDetails?0:undefined} aria-expanded={renderDetails?expandedId===row.id:undefined} aria-controls={renderDetails?detailsId(row.id):undefined}
   onClick={renderDetails?event=>{if(!(event.target as Element).closest('button,a,input,select,textarea,[role="button"]'))toggle(row.id);}:undefined}
   onKeyDown={renderDetails?event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();toggle(row.id);}}:undefined}>{cells}</tr>}
 renderExpandedRow={renderDetails?row=>expandedId===row.id?<tr id={detailsId(row.id)}><td colSpan={columns.length}><div className={styles.details} role="region" aria-label={`Artículos de ${row.reference}`}>{renderDetails(row)}</div></td></tr>:null:undefined}/>
 </EntityListSurface></div>;
}

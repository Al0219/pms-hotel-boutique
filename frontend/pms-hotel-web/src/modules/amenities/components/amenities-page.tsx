"use client";
import {useRef,useState} from 'react';
import {useStaffSession} from '@/modules/auth';
import {usePropertyScope} from '@/modules/properties';
import {OperationalRequestTable,Button,ConfirmDialog,type DataTableColumn} from '@/shared/components';
import {HttpStatusError} from '@/lib/http/errors';
import {useAmenitiesOrders} from '../hooks/use-amenities-orders';
import {type AmenitiesOrder,type AmenitiesTarget} from '../model/amenities-order';
import styles from './amenities-page.module.css';
export function AmenitiesPage() {
 const session=useStaffSession();const {ready,scope}=usePropertyScope();
 if(!session.permissions.some(p=>['OPERATIONS_MANAGE','SERVICE_REQUEST_INTAKE'].includes(p)))return <p role="alert">Tu sesión no puede consultar Amenidades.</p>;
 if(!ready)return <p role="status">Preparando la propiedad…</p>;
 if(!scope||scope.kind!=='PROPERTY')return <section className={styles.page}><h1>Amenidades</h1><p>Selecciona un hotel para consultar sus solicitudes.</p></section>;
 const propertyId=scope.propertyIds[0];return <AmenitiesWorkspace key={`${session.id}:${propertyId}`} propertyId={propertyId} sessionId={session.id} canManage={session.permissions.includes('OPERATIONS_MANAGE')}/>;
}
export function AmenitiesWorkspace({propertyId,sessionId,canManage}:{propertyId:string;sessionId:string;canManage:boolean}) {
 const {query,mutation}=useAmenitiesOrders(propertyId,sessionId);const [selection,setSelection]=useState<{row:AmenitiesOrder;targetStatus:AmenitiesTarget}|null>(null);const busy=useRef(false);const [notice,setNotice]=useState('');
 async function refresh(){if(busy.current)return;setSelection(null);setNotice('');mutation.reset();await query.refetch();}
 async function confirm(){if(!selection||busy.current||!canManage)return;busy.current=true;
  try{await mutation.mutateAsync({id:selection.row.id,expectedUpdatedAt:selection.row.updatedAt,targetStatus:selection.targetStatus});setSelection(null);setNotice('Estado de la solicitud actualizada.');}
  catch{/* Render safe error and retain confirmation; no optimistic success. */}finally{busy.current=false;}
 }
 const columns:DataTableColumn<AmenitiesOrder>[]=[
  {key:'reservation',header:'Reserva / Habitación',render:row=>`${row.reference} · ${row.roomLabel??'Por asignar'}`},
  {key:'schedule',header:'Fecha / Entrega',render:row=>`${row.serviceDate} · ${row.deliveryTime}`},
  {key:'notes',header:'Notas',render:row=>row.notes??'—'},
 ];
 columns.push({key:'actions',header:'Acciones',render:row=>canManage&&(row.status==='OPEN'||row.status==='IN_PROGRESS')?<Button size="sm" disabled={mutation.isPending} onClick={()=>{mutation.reset();setSelection({row,targetStatus:row.status==='OPEN'?'IN_PROGRESS':'DONE'});}}>{row.status==='OPEN'?'Iniciar solicitud':'Marcar como completado'}</Button>:'—'});
 const action=selection?.targetStatus==='IN_PROGRESS'?'Iniciar solicitud':'Marcar como completado';
 return <section className={styles.page}><header className={styles.header}><h1>Amenidades</h1><Button variant="outline" disabled={query.isFetching||mutation.isPending} onClick={()=>void refresh()}>Actualizar solicitudes</Button></header>
 {notice?<p role="status">{notice}</p>:null}<div className={styles.panel}>
 {query.fetchStatus==='paused'?<p role="status">Sin conexión. Conéctate y actualiza.</p>:query.isPending?<p role="status">Consultando solicitudes…</p>:query.isError?<p role="alert">No pudimos consultar las solicitudes. Revisa tu conexión y acceso y pulsa Actualizar solicitudes.</p>:<OperationalRequestTable emptyMessage="Sin solicitudes Amenidades." columns={columns} rows={query.data??[]} label="Solicitudes Amenidades" minWidth={760} time={row=>row.deliveryTime}
 searchText={row=>row.items.map(line=>line.itemName).join(' ')}
 renderDetails={row=><ul className={styles.lines}>{row.items.map(line=><li key={line.itemId}>{line.itemName} × {line.quantity}</li>)}</ul>}/>}
 </div>{selection?<ConfirmDialog title={action} confirmLabel={mutation.isError?'Reintentar':action} busyLabel="Guardando…" busy={mutation.isPending} confirmDisabled={mutation.error instanceof HttpStatusError&&mutation.error.status===409}
 body={<><p>{selection.row.reference} · {selection.row.roomLabel??'Por asignar'}</p><p>Se actualizará únicamente el estado de la solicitud.</p>{mutation.isError?<div role="alert"><p>{mutation.error instanceof HttpStatusError&&mutation.error.status===409?'La solicitud cambió. Actualiza antes de continuar.':'No pudimos confirmar el resultado. Reintenta o actualiza.'}</p><Button variant="outline" onClick={()=>void refresh()}>Actualizar solicitudes</Button></div>:null}</>}
 onConfirm={()=>void confirm()} onCancel={()=>{if(!busy.current){setSelection(null);mutation.reset();}}}/>:null}</section>;
}

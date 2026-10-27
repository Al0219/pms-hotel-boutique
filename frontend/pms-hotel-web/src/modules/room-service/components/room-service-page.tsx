"use client";
import {useRef,useState} from 'react';
import {useStaffSession} from '@/modules/auth';
import {usePropertyScope} from '@/modules/properties';
import {OperationalRequestTable,Button,ConfirmDialog,type DataTableColumn} from '@/shared/components';
import {HttpStatusError} from '@/lib/http/errors';
import {useRoomServiceOrders} from '../hooks/use-room-service-orders';
import {type RoomServiceOrder,type RoomServiceTarget} from '../model/room-service-order';
import styles from './room-service-page.module.css';
const money=(minor:number)=>`Q ${(minor/100).toFixed(2)}`;
export function RoomServicePage() {
 const session=useStaffSession();const {ready,scope}=usePropertyScope();
 if(!session.permissions.some(p=>['OPERATIONS_MANAGE','SERVICE_REQUEST_INTAKE'].includes(p)))return <p role="alert">Tu sesión no puede consultar Room Service.</p>;
 if(!ready)return <p role="status">Preparando la propiedad…</p>;
 if(!scope||scope.kind!=='PROPERTY')return <section className={styles.page}><h1>Room Service</h1><p>Selecciona un hotel para consultar sus pedidos.</p></section>;
 const propertyId=scope.propertyIds[0];return <RoomServiceWorkspace key={`${session.id}:${propertyId}`} propertyId={propertyId} sessionId={session.id} canManage={session.permissions.includes('OPERATIONS_MANAGE')}/>;
}
export function RoomServiceWorkspace({propertyId,sessionId,canManage}:{propertyId:string;sessionId:string;canManage:boolean}) {
 const {query,mutation}=useRoomServiceOrders(propertyId,sessionId);const [selection,setSelection]=useState<{row:RoomServiceOrder;targetStatus:RoomServiceTarget}|null>(null);const busy=useRef(false);const [notice,setNotice]=useState('');
 async function refresh(){if(busy.current)return;setSelection(null);setNotice('');mutation.reset();await query.refetch();}
 async function confirm(){if(!selection||busy.current||!canManage)return;busy.current=true;
  try{await mutation.mutateAsync({id:selection.row.id,expectedUpdatedAt:selection.row.updatedAt,targetStatus:selection.targetStatus});setSelection(null);setNotice('Estado del pedido actualizado.');}
  catch{/* Render safe error and retain confirmation; no optimistic success. */}finally{busy.current=false;}
 }
 const columns:DataTableColumn<RoomServiceOrder>[]=[
  {key:'reservation',header:'Reserva / Habitación',render:row=>`${row.reference} · ${row.roomLabel??'Por asignar'}`},
  {key:'schedule',header:'Fecha / Entrega',render:row=>`${row.serviceDate} · ${row.deliveryTime}`},
  {key:'total',header:'Total GTQ',render:row=>money(row.totalMinor)},
  {key:'notes',header:'Notas',render:row=>row.notes??'—'},
 ];
 columns.push({key:'actions',header:'Acciones',render:row=>canManage&&(row.status==='OPEN'||row.status==='IN_PROGRESS')?<Button size="sm" disabled={mutation.isPending} onClick={()=>{mutation.reset();setSelection({row,targetStatus:row.status==='OPEN'?'IN_PROGRESS':'DONE'});}}>{row.status==='OPEN'?'Iniciar pedido':'Marcar como completado'}</Button>:'—'});
 const action=selection?.targetStatus==='IN_PROGRESS'?'Iniciar pedido':'Marcar como completado';
 return <section className={styles.page}><header className={styles.header}><h1>Room Service</h1><Button variant="outline" disabled={query.isFetching||mutation.isPending} onClick={()=>void refresh()}>Actualizar pedidos</Button></header>
 {notice?<p role="status">{notice}</p>:null}<div className={styles.panel}>
 {query.fetchStatus==='paused'?<p role="status">Sin conexión. Conéctate y actualiza.</p>:query.isPending?<p role="status">Consultando pedidos…</p>:query.isError?<p role="alert">No pudimos consultar los pedidos. Revisa tu conexión y acceso y pulsa Actualizar pedidos.</p>:<OperationalRequestTable emptyMessage="Sin pedidos Room Service." columns={columns} rows={query.data??[]} label="Pedidos Room Service" minWidth={1000} time={row=>row.deliveryTime}
 searchText={row=>row.items.map(line=>line.productName).join(' ')}
 renderDetails={row=><ul className={styles.lines}>{row.items.map(line=><li key={line.productId}>{line.productName} × {line.quantity} · {money(line.unitPriceMinor)} c/u · {money(line.lineTotalMinor)}</li>)}</ul>}/>}
 </div>{selection?<ConfirmDialog title={action} confirmLabel={mutation.isError?'Reintentar':action} busyLabel="Guardando…" busy={mutation.isPending} confirmDisabled={mutation.error instanceof HttpStatusError&&mutation.error.status===409}
 body={<><p>{selection.row.reference} · {selection.row.roomLabel??'Por asignar'}</p><p>Se actualizará únicamente el estado del pedido.</p>{mutation.isError?<div role="alert"><p>{mutation.error instanceof HttpStatusError&&mutation.error.status===409?'El pedido cambió. Actualiza antes de continuar.':'No pudimos confirmar el resultado. Reintenta o actualiza.'}</p><Button variant="outline" onClick={()=>void refresh()}>Actualizar pedidos</Button></div>:null}</>}
 onConfirm={()=>void confirm()} onCancel={()=>{if(!busy.current){setSelection(null);mutation.reset();}}}/>:null}</section>;
}

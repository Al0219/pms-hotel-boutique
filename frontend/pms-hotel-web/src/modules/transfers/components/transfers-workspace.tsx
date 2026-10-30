'use client';
import {useRef,useState} from 'react';
import {useTransfers} from '../hooks/use-transfers';
import {OperationalRequestTable,useOperationalRequestFilters,Button,ConfirmDialog,type DataTableColumn} from '@/shared/components';
import {type TransferOrder} from '../model/transfer';
export function TransfersWorkspace({propertyId,sessionId,canManage}:{propertyId:string;sessionId:string;canManage:boolean}){
 const filters=useOperationalRequestFilters(),[target,setTarget]=useState<TransferOrder|null>(null),busy=useRef(false);
 const {query,mutation}=useTransfers(propertyId,sessionId);
 const columns:DataTableColumn<TransferOrder>[]=[{key:'reservation',header:'Reserva / Habitación',render:r=>`${r.reference} · ${r.roomLabel??'Por asignar'}`},{key:'route',header:'Recorrido',render:r=>`${r.items[0].origin.displayText} → ${r.items[0].destination.displayText}`},{key:'passengers',header:'Pasajeros',render:r=>r.items[0].passengers},{key:'schedule',header:'Programación',render:r=>`${r.serviceDate} · ${r.deliveryTime}`},{key:'price',header:'Importe GTQ',render:r=>r.items[0].totalMinor==null?'Sin cargo histórico':`${r.status==='DONE'?'Cargo':'Estimado'} Q. ${(r.items[0].totalMinor/100).toFixed(2)}`},{key:'actions',header:'Acciones',render:r=>canManage&&(r.status==='OPEN'||r.status==='IN_PROGRESS')?<Button size="sm" disabled={mutation.isPending} onClick={()=>{mutation.reset();setTarget(r);}}>{r.status==='OPEN'?'Iniciar':'Completar'}</Button>:'—'}];
 return <section aria-label="Traslados"><header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}><h1>Traslados</h1><Button variant="outline" disabled={query.isFetching} onClick={()=>void query.refetch()}>Actualizar</Button></header>{query.isError?<p role="alert">No pudimos consultar los traslados.</p>:null}{query.isPending?<p role="status">Cargando traslados…</p>:null}
 <OperationalRequestTable filterState={filters} label="Traslados" rows={query.data??[]} columns={columns} time={r=>r.deliveryTime} emptyMessage="Sin traslados registrados." searchText={r=>`${r.items[0].origin.displayText} ${r.items[0].destination.displayText}`}/>
 {target?<ConfirmDialog title={target.status==='OPEN'?'Iniciar traslado':'Completar traslado'} confirmLabel="Confirmar" busyLabel="Guardando…" busy={mutation.isPending} body={<>{mutation.isError?<p role="alert">{mutation.error.message}</p>:<p>{target.items[0].origin.displayText} → {target.items[0].destination.displayText}</p>}</>} onCancel={()=>{if(!busy.current)setTarget(null);}} onConfirm={()=>{if(!target||busy.current)return;busy.current=true;mutation.mutate(target,{onSuccess:()=>setTarget(null),onSettled:()=>{busy.current=false;}});}}/>:null}
 </section>;
}

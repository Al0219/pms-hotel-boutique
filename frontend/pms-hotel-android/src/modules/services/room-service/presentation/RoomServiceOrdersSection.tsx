import { ServiceRequestDisclosure, ServiceRequestDisclosureGroup } from '@/modules/service-requests/presentation/ServiceRequestDisclosure';
import {filterPersistedServiceRequests,type ServiceRequestFilter} from '@/modules/service-requests/domain/serviceRequestPresentation';
import { useRef,useState } from 'react';
import { Pressable,Text,View } from 'react-native';
import { router } from 'expo-router';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { HttpError,NetworkError } from '@/data/remote/http/HttpError';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { ConfirmationModal,SwipeToDelete,formatGuestDate } from '@/shared/components';
import { useAppClock } from '@/shared/time';
import { sessionServiceRequestStyles as styles } from '@/modules/service-requests/presentation/sessionServiceRequestStyles';
import { useRoomServiceOrders } from './hooks/useRoomServiceOrders';
import { roomServiceService } from '../data/services/roomServiceServices';
import { mapRoomServiceOrder } from '../data/mappers/mapRoomServiceDto';
import type { PersistedRoomServiceOrder } from '../domain/models/PersistedRoomServiceOrder';
const labels={OPEN:'Solicitado',IN_PROGRESS:'En proceso',DONE:'Completado',CANCELLED:'Cancelado'};
export function RoomServiceOrdersSection({filter='ALL'}:{filter?:ServiceRequestFilter}) {
 const query=useRoomServiceOrders();return <RoomServiceOrdersContent query={query} filter={filter}/>;
}
export function RoomServiceOrdersContent({query,filter='ALL',showFeedback=true}:{query:ReturnType<typeof useRoomServiceOrders>;filter?:ServiceRequestFilter;showFeedback?:boolean}) {
 const queries=useQueryClient();const {activeReservationContext:context}=useActiveReservationContext();const clock=useAppClock();
 const [target,setTarget]=useState<PersistedRoomServiceOrder|null>(null);const pending=useRef(false);
 const cancellation=useMutation({retry:false,mutationFn:async(row:PersistedRoomServiceOrder)=>{
  if(!context||!roomServiceService.cancelOrder||context.reservationId!==row.reservationId||context.reservationStayId!==row.stayId)throw new Error('Invalid order context');
  const saved=mapRoomServiceOrder(await roomServiceService.cancelOrder(context,row.id,row.updatedAt),context);if(saved.id!==row.id||saved.status!=='CANCELLED')throw new Error('Unconfirmed cancellation');return saved;
 },onSettled:async()=>{await queries.invalidateQueries({queryKey:['guest-room-service']});}});
 const refresh=<Pressable accessibilityRole="button" disabled={query.isFetching} testID="room-service-orders-refresh" onPress={()=>{cancellation.reset();void query.refetch();}}><Text style={styles.summary}>Actualizar pedidos Room Service</Text></Pressable>;
 if(showFeedback&&query.isPending)return <Text testID="room-service-orders-loading">Cargando pedidos Room Service…</Text>;
 if(showFeedback&&query.isError&&!target)return <View testID="room-service-orders-error"><Text>{query.error instanceof NetworkError?'Sin conexión. Conéctate para consultar tus pedidos.':'No pudimos consultar tus pedidos.'}</Text>{refresh}</View>;
 const rows=filterPersistedServiceRequests(query.data??[],filter);
 return <ServiceRequestDisclosureGroup scope={filter}><View testID="room-service-orders-real">{showFeedback?refresh:null}{cancellation.isError&&!target?<Text>No pudimos cancelar el pedido. Actualiza y reintenta.</Text>:null}
 {!rows.length?showFeedback?<Text style={styles.empty}>Sin pedidos Room Service.</Text>:null:rows.map(row=>{
  const editable=row.status==='OPEN'&&clock.nowMs()<Date.parse(row.modifiableUntil);
  const card=<ServiceRequestDisclosure key={row.id} id={`room-service:${row.id}`} title="Room Service"
    summary={`${formatGuestDate(row.serviceDate)} · ${row.deliveryTime}`} total={`Q ${(row.totalMinor/100).toFixed(2)}`}
    status={labels[row.status]} testID={`room-service-order-${row.id}`}
    edit={editable?{label:'Editar pedido Room Service',disabled:cancellation.isPending,onPress:()=>router.push({pathname:'/services/room-service',params:{editRequestId:row.id,returnTo:'requests'}})}:undefined}>
    {row.items.map(line=><Text key={line.productId} style={styles.summary}>{line.productName} × {line.quantity} · Q {(line.lineTotalMinor/100).toFixed(2)}</Text>)}
    {row.notes?<Text style={styles.summary}>{row.notes}</Text>:null}
  </ServiceRequestDisclosure>;
  return editable?<SwipeToDelete key={row.id} enabled={!cancellation.isPending} deleteLabel="Cancelar pedido" testID={`room-service-order-swipe-${row.id}`} onDelete={()=>{if(clock.nowMs()<Date.parse(row.modifiableUntil)){cancellation.reset();setTarget(row);}}}>{card}</SwipeToDelete>:card;
 })}
 <ConfirmationModal visible={target!==null} title="Cancelar pedido" body={cancellation.isError?'No pudimos confirmar la cancelación. Revisa tu conexión y reintenta.':'El pedido permanecerá en tu historial con estado Cancelado.'} confirmLabel={cancellation.isPending?'Cancelando…':cancellation.isError?'Reintentar':'Cancelar pedido'} destructive testID="room-service-cancel-confirmation"
 onCancel={()=>{if(!pending.current){setTarget(null);cancellation.reset();}}} onConfirm={()=>{
  if(!target||pending.current)return;pending.current=true;cancellation.mutate(target,{onSuccess:()=>setTarget(null),onError:error=>{if(error instanceof HttpError&&error.status===409)setTarget(null);},onSettled:()=>{pending.current=false;}});
 }}/></View></ServiceRequestDisclosureGroup>;
}

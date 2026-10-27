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
import { useAmenitiesRequests } from './hooks/useAmenitiesRequests';
import { amenitiesService } from '../data/services/amenitiesServices';
import { mapAmenitiesRequest } from '../data/mappers/mapAmenitiesDto';
import type { PersistedAmenitiesRequest } from '../domain/PersistedAmenitiesRequest';
const labels={OPEN:'Solicitado',IN_PROGRESS:'En proceso',DONE:'Completado',CANCELLED:'Cancelado'};
export function AmenitiesRequestsSection({filter='ALL'}:{filter?:ServiceRequestFilter}) {
 const query=useAmenitiesRequests();return <AmenitiesRequestsContent query={query} filter={filter}/>;
}
type ContentProps = {query:ReturnType<typeof useAmenitiesRequests>;filter?:ServiceRequestFilter;showFeedback?:boolean};
export function AmenitiesRequestsContent(props: ContentProps) {
 const {activeReservationContext:context}=useActiveReservationContext();
 return <AmenitiesRequestsBody key={`${context?.reservationId}:${context?.reservationStayId}`} {...props}/>;
}
function AmenitiesRequestsBody({query,filter='ALL',showFeedback=true}:ContentProps) {
 const queries=useQueryClient();const {activeReservationContext:context}=useActiveReservationContext();const clock=useAppClock();
 const [target,setTarget]=useState<PersistedAmenitiesRequest|null>(null);const pending=useRef(false);
 const cancellation=useMutation({retry:false,mutationFn:async(row:PersistedAmenitiesRequest)=>{
  if(!context||!amenitiesService.cancelRequest||context.reservationId!==row.reservationId||context.reservationStayId!==row.stayId)throw new Error('Invalid order context');
  const saved=mapAmenitiesRequest(await amenitiesService.cancelRequest(context,row.id,row.updatedAt),context);if(saved.id!==row.id||saved.status!=='CANCELLED')throw new Error('Unconfirmed cancellation');return saved;
 },onSettled:async()=>{await queries.invalidateQueries({queryKey:['guest-amenities']});}});
 const refresh=<Pressable accessibilityRole="button" disabled={query.isFetching} testID="amenities-requests-refresh" onPress={()=>{cancellation.reset();void query.refetch();}}><Text style={styles.summary}>Actualizar solicitudes Amenidades</Text></Pressable>;
 if(showFeedback&&query.isPending)return <Text testID="amenities-requests-loading">Cargando solicitudes Amenidades…</Text>;
 if(showFeedback&&query.isError&&!target)return <View testID="amenities-requests-error"><Text>{query.error instanceof NetworkError?'Sin conexión. Conéctate para consultar tus solicitudes.':'No pudimos consultar tus solicitudes.'}</Text>{refresh}</View>;
 const rows=filterPersistedServiceRequests(query.data??[],filter);
 return <ServiceRequestDisclosureGroup scope={filter}><View testID="amenities-requests-real">{showFeedback?refresh:null}{cancellation.isError&&!target?<Text>No pudimos cancelar la solicitud. Actualiza y reintenta.</Text>:null}
 {!rows.length?showFeedback?<Text style={styles.empty}>Sin solicitudes Amenidades.</Text>:null:rows.map(row=>{
  const editable=row.status==='OPEN'&&clock.nowMs()<Date.parse(row.modifiableUntil);
  const card=<ServiceRequestDisclosure key={row.id} id={`amenities:${row.id}`} title="Amenidades"
    summary={`${formatGuestDate(row.serviceDate)} · ${row.deliveryTime}`}
    status={labels[row.status]} testID={`amenities-request-${row.id}`}
    edit={editable?{label:'Editar solicitud Amenidades',disabled:cancellation.isPending,onPress:()=>router.push({pathname:'/services/amenities',params:{editRequestId:row.id,returnTo:'requests'}})}:undefined}>
    {row.items.map(line=><Text key={line.itemId} style={styles.summary}>{line.itemName} × {line.quantity}</Text>)}

    {row.notes?<Text style={styles.summary}>{row.notes}</Text>:null}
  </ServiceRequestDisclosure>;
  return editable?<SwipeToDelete key={row.id} enabled={!cancellation.isPending} deleteLabel="Cancelar solicitud" testID={`amenities-request-swipe-${row.id}`} onDelete={()=>{if(clock.nowMs()<Date.parse(row.modifiableUntil)){cancellation.reset();setTarget(row);}}}>{card}</SwipeToDelete>:card;
 })}
 <ConfirmationModal visible={target!==null} title="Cancelar solicitud" body={cancellation.isError?'No pudimos confirmar la cancelación. Revisa tu conexión y reintenta.':'La solicitud permanecerá en tu historial con estado Cancelado.'} confirmLabel={cancellation.isPending?'Cancelando…':cancellation.isError?'Reintentar':'Cancelar solicitud'} destructive testID="amenities-cancel-confirmation"
 onCancel={()=>{if(!pending.current){setTarget(null);cancellation.reset();}}} onConfirm={()=>{
  if(!target||pending.current)return;pending.current=true;cancellation.mutate(target,{onSuccess:()=>setTarget(null),onError:error=>{if(error instanceof HttpError&&error.status===409)setTarget(null);},onSettled:()=>{pending.current=false;}});
 }}/></View></ServiceRequestDisclosureGroup>;
}

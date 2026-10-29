import { ServiceRequestDisclosure, ServiceRequestDisclosureGroup } from '@/modules/service-requests/presentation/ServiceRequestDisclosure';
import {filterPersistedServiceRequests,type ServiceRequestFilter} from '@/modules/service-requests/domain/serviceRequestPresentation';
import { useRef,useState } from 'react';
import { Pressable,Text,View } from 'react-native';
import { router } from 'expo-router';
import { HttpError,NetworkError } from '@/data/remote/http/HttpError';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { ConfirmationModal,SwipeToDelete,formatGuestDate } from '@/shared/components';
import { useAppClock } from '@/shared/time';
import { sessionServiceRequestStyles as styles } from '@/modules/service-requests/presentation/sessionServiceRequestStyles';
import {useValetRequests,useValetMutations} from './hooks/usePersistedValet';
import type {PersistedValetRequest} from '../domain/PersistedValet';
const labels={OPEN:'Solicitado',IN_PROGRESS:'En proceso',DONE:'Completado',CANCELLED:'Cancelado'};
export function ValetRequestsSection({filter='ALL'}:{filter?:ServiceRequestFilter}) {
 const query=useValetRequests();return <ValetRequestsContent query={query} filter={filter}/>;
}
type ContentProps = {query:ReturnType<typeof useValetRequests>;filter?:ServiceRequestFilter;showFeedback?:boolean};
export function ValetRequestsContent(props: ContentProps) {
 const {activeReservationContext:context}=useActiveReservationContext();
 return <ValetRequestsBody key={`${context?.reservationId}:${context?.reservationStayId}`} {...props}/>;
}
function ValetRequestsBody({query,filter='ALL',showFeedback=true}:ContentProps) {
 const clock=useAppClock();const {cancel:cancellation}=useValetMutations();
 const [target,setTarget]=useState<PersistedValetRequest|null>(null);const pending=useRef(false);
 const refresh=<Pressable accessibilityRole="button" disabled={query.isFetching} testID="valet-requests-refresh" onPress={()=>{cancellation.reset();void query.refetch();}}><Text style={styles.summary}>Actualizar solicitudes Valet</Text></Pressable>;
 if(showFeedback&&query.isPending)return <Text testID="valet-requests-loading">Cargando solicitudes Valet…</Text>;
 if(showFeedback&&query.isError&&!target)return <View testID="valet-requests-error"><Text>{query.error instanceof NetworkError?'Sin conexión. Conéctate para consultar tus solicitudes.':'No pudimos consultar tus solicitudes.'}</Text>{refresh}</View>;
 const rows=filterPersistedServiceRequests(query.data??[],filter);
 return <ServiceRequestDisclosureGroup scope={filter}><View testID="valet-requests-real">{showFeedback?refresh:null}{cancellation.isError&&!target?<Text>No pudimos cancelar la solicitud. Actualiza y reintenta.</Text>:null}
 {!rows.length?showFeedback?<Text style={styles.empty}>Sin solicitudes Valet.</Text>:null:rows.map(row=>{
  const editable=row.status==='OPEN'&&clock.nowMs()<Date.parse(row.modifiableUntil);
  const card=<ServiceRequestDisclosure key={row.id} id={`valet:${row.id}`} title="Valet"
    summary={`${formatGuestDate(row.serviceDate)} · ${row.deliveryTime}`}
    status={labels[row.status]} testID={`valet-request-${row.id}`}
    edit={editable?{label:'Editar solicitud Valet',disabled:cancellation.isPending,onPress:()=>router.push({pathname:'/valet',params:{editRequestId:row.id,returnTo:'requests'}})}:undefined}>
    <Text style={styles.summary}>{row.vehicle.make} {row.vehicle.model} · {row.vehicle.platePrefix} {row.vehicle.plateBody}</Text>
    {row.vehicle.color?<Text style={styles.summary}>{row.vehicle.color}</Text>:null}
  </ServiceRequestDisclosure>;
  return editable?<SwipeToDelete key={row.id} enabled={!cancellation.isPending} deleteLabel="Cancelar solicitud" testID={`valet-request-swipe-${row.id}`} onDelete={()=>{if(clock.nowMs()<Date.parse(row.modifiableUntil)){cancellation.reset();setTarget(row);}}}>{card}</SwipeToDelete>:card;
 })}
 <ConfirmationModal visible={target!==null} title="Cancelar solicitud" body={cancellation.isError?'No pudimos confirmar la cancelación. Revisa tu conexión y reintenta.':'La solicitud permanecerá en tu historial con estado Cancelado.'} confirmLabel={cancellation.isPending?'Cancelando…':cancellation.isError?'Reintentar':'Cancelar solicitud'} destructive testID="valet-cancel-confirmation"
 onCancel={()=>{if(!pending.current){setTarget(null);cancellation.reset();}}} onConfirm={()=>{
  if(!target||pending.current)return;pending.current=true;cancellation.mutate(target,{onSuccess:()=>setTarget(null),onError:error=>{if(error instanceof HttpError&&error.status===409)setTarget(null);},onSettled:()=>{pending.current=false;}});
 }}/></View></ServiceRequestDisclosureGroup>;
}

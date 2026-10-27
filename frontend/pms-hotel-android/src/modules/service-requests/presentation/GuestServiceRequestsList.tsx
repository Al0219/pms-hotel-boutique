import {Pressable,Text,View} from 'react-native';
import {NetworkError} from '@/data/remote/http/HttpError';
import {useHousekeepingRequests} from '@/modules/services/housekeeping/presentation/hooks/useHousekeepingRequests';
import {HousekeepingRequestsContent} from '@/modules/services/housekeeping/presentation/HousekeepingRequestsSection';
import {useRoomServiceOrders} from '@/modules/services/room-service/presentation/hooks/useRoomServiceOrders';
import {RoomServiceOrdersContent} from '@/modules/services/room-service/presentation/RoomServiceOrdersSection';
import {filterPersistedServiceRequests,noRegisteredServicesText,serviceRequestFilters,type ServiceRequestFilter} from '../domain/serviceRequestPresentation';
import {sessionServiceRequestStyles as styles} from './sessionServiceRequestStyles';

/** Coordinate feedback only. Existing queries/cache, cards and mutations remain the source of truth. */
export function GuestServiceRequestsList({filter='ALL',additionalCount=0,additionalFilteredCount=0}:{filter?:ServiceRequestFilter;additionalCount?:number;additionalFilteredCount?:number}) {
 const housekeeping=useHousekeepingRequests();const roomService=useRoomServiceOrders();
 const pending=housekeeping.isPending||roomService.isPending;
 const fetching=housekeeping.isFetching||roomService.isFetching;
 const paused=housekeeping.fetchStatus==='paused'||roomService.fetchStatus==='paused';
 const error=housekeeping.isError||roomService.isError;
 const offline=paused||housekeeping.error instanceof NetworkError||roomService.error instanceof NetworkError;
 const total=(housekeeping.data?.length??0)+(roomService.data?.length??0)+additionalCount;
 const shown=filterPersistedServiceRequests(housekeeping.data??[],filter).length+filterPersistedServiceRequests(roomService.data??[],filter).length+additionalFilteredCount;
 const settled=!pending&&!fetching&&!paused&&!error;
 const empty=total===0?noRegisteredServicesText:serviceRequestFilters.find(option=>option.value===filter)?.emptyText;
 return <View testID="guest-services-list">
  <Pressable accessibilityRole="button" accessibilityLabel="Actualizar servicios" disabled={fetching} testID="guest-services-refresh" onPress={()=>{void Promise.all([housekeeping.refetch({cancelRefetch:false}),roomService.refetch({cancelRefetch:false})]);}}><Text style={styles.summary}>Actualizar servicios</Text></Pressable>
  {error||paused?<Text accessibilityLiveRegion="polite" testID="guest-services-error">{offline?'Sin conexión. Conéctate y actualiza los servicios.':'No pudimos actualizar todos los servicios. Reintenta.'}{total>0?' La información mostrada corresponde a la última consulta disponible.':''}</Text>
   :pending||fetching&&shown===0?<Text accessibilityLiveRegion="polite" testID="guest-services-loading">{pending?'Consultando servicios…':'Actualizando servicios…'}</Text>
   :settled&&shown===0?<Text style={styles.empty} testID="guest-services-empty">{empty}</Text>:null}
  <HousekeepingRequestsContent query={housekeeping} filter={filter} showFeedback={false}/>
  <RoomServiceOrdersContent query={roomService} filter={filter} showFeedback={false}/>
 </View>;
}

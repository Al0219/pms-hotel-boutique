import {useValetRequests,ValetRequestsContent} from '@/modules/valet';
import { ServiceRequestDisclosureGroup } from './ServiceRequestDisclosure';
import {useAmenitiesRequests} from '@/modules/services/amenities/presentation/hooks/useAmenitiesRequests';
import {AmenitiesRequestsContent} from '@/modules/services/amenities/presentation/AmenitiesRequestsSection';
import {Pressable,Text,View} from 'react-native';
import {NetworkError} from '@/data/remote/http/HttpError';
import {useHousekeepingRequests} from '@/modules/services/housekeeping/presentation/hooks/useHousekeepingRequests';
import {HousekeepingRequestsContent} from '@/modules/services/housekeeping/presentation/HousekeepingRequestsSection';
import {useRoomServiceOrders} from '@/modules/services/room-service/presentation/hooks/useRoomServiceOrders';
import {RoomServiceOrdersContent} from '@/modules/services/room-service/presentation/RoomServiceOrdersSection';
import {filterPersistedServiceRequests,noRegisteredServicesText,serviceRequestFilters,type ServiceRequestFilter} from '../domain/serviceRequestPresentation';
import {sessionServiceRequestStyles as styles} from './sessionServiceRequestStyles';

/** Coordinate feedback only. Existing queries/cache, cards and mutations remain the source of truth. */
export function GuestServiceRequestsList({filter='ALL',additionalCount=0,additionalFilteredCount=0,showRefresh=true}:{filter?:ServiceRequestFilter;additionalCount?:number;additionalFilteredCount?:number;showRefresh?:boolean}) {
 const housekeeping=useHousekeepingRequests();const roomService=useRoomServiceOrders();const amenities=useAmenitiesRequests();const valet=useValetRequests();
 const pending=housekeeping.isPending||roomService.isPending||amenities.isPending||valet.isPending;
 const fetching=housekeeping.isFetching||roomService.isFetching||amenities.isFetching||valet.isFetching;
 const paused=housekeeping.fetchStatus==='paused'||roomService.fetchStatus==='paused'||amenities.fetchStatus==='paused'||valet.fetchStatus==='paused';
 const error=housekeeping.isError||roomService.isError||amenities.isError||valet.isError;
 const offline=paused||housekeeping.error instanceof NetworkError||roomService.error instanceof NetworkError||amenities.error instanceof NetworkError||valet.error instanceof NetworkError;
 const total=(housekeeping.data?.length??0)+(roomService.data?.length??0)+(amenities.data?.length??0)+(valet.data?.length??0)+additionalCount;
 const shown=filterPersistedServiceRequests(housekeeping.data??[],filter).length+filterPersistedServiceRequests(roomService.data??[],filter).length+filterPersistedServiceRequests(amenities.data??[],filter).length+filterPersistedServiceRequests(valet.data??[],filter).length+additionalFilteredCount;
 const settled=!pending&&!fetching&&!paused&&!error;
 const empty=total===0?noRegisteredServicesText:serviceRequestFilters.find(option=>option.value===filter)?.emptyText;
 return <ServiceRequestDisclosureGroup scope={filter}><View testID="guest-services-list">
  {showRefresh ? <Pressable accessibilityRole="button" accessibilityLabel="Actualizar servicios" disabled={fetching} testID="guest-services-refresh" onPress={()=>{void Promise.all([housekeeping.refetch({cancelRefetch:false}),roomService.refetch({cancelRefetch:false}),amenities.refetch({cancelRefetch:false}),valet.refetch({cancelRefetch:false})]);}}><Text style={styles.summary}>Actualizar servicios</Text></Pressable> : null}
  {error||paused?<Text accessibilityLiveRegion="polite" testID="guest-services-error">{offline?'Sin conexión. Conéctate y actualiza los servicios.':'No pudimos actualizar todos los servicios. Reintenta.'}{total>0?' La información mostrada corresponde a la última consulta disponible.':''}</Text>
   :pending||fetching&&shown===0?<Text accessibilityLiveRegion="polite" testID="guest-services-loading">{pending?'Consultando servicios…':'Actualizando servicios…'}</Text>
   :settled&&shown===0?<Text style={styles.empty} testID="guest-services-empty">{empty}</Text>:null}
  <HousekeepingRequestsContent query={housekeeping} filter={filter} showFeedback={false}/>
  <RoomServiceOrdersContent query={roomService} filter={filter} showFeedback={false}/>
  <ValetRequestsContent query={valet} filter={filter} showFeedback={false}/>
  <AmenitiesRequestsContent query={amenities} filter={filter} showFeedback={false}/>
 </View></ServiceRequestDisclosureGroup>;
}

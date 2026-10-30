import {useQueryClient} from '@tanstack/react-query';
import {RealTransferLauncher} from './RealTransfers';
import {ActionLabel} from '@/shared/components/ActionLabel';
import {useServiceCreationGate,ServiceCreationNotice} from '@/modules/checkout/presentation/hooks/useServiceCreationGate';
import {useEffect,useRef,useState} from 'react';
import {router,useLocalSearchParams} from 'expo-router';
import {RefreshControl,Modal,Pressable,ScrollView,Text,View} from 'react-native';
import {useActiveReservationContext} from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import {useGuestAuthSession} from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import {GuestRootHeader,GuestNavigationShell,useGuestNotice} from '@/modules/navigation';
import {useCurrentStay} from '@/modules/stay/presentation/hooks/useCurrentStay';
import {ServiceDatePicker,TimeWheelPicker} from '@/shared/components';
import {useAppClock} from '@/shared/time';
import type {StayService} from '@/modules/stay';
import {getEffectiveCheckoutAt,getFirstAvailableServiceDate,getNearestServiceTime,getStayServiceDateWindow,isServiceWithinEffectiveCheckout,parseServiceDate} from '@/modules/service-requests';
import {HttpError,NetworkError} from '@/data/remote/http/HttpError';
import {VehicleModal,RegisterVehicleModal,type RegisterVehicleModalHandle} from './ValetVehicleModals';
import {useValetVehicles,useValetRequests,useValetMutations,useSavedValetVehicles} from './hooks/usePersistedValet';
import type {PersistedVehicle,PersistedValetRequest,SavedVehicle} from '../domain/PersistedValet';
import type {SessionVehicle} from '../session/SessionVehicle';
import {valetStyles as styles} from './valetStyles';
const times=Array.from({length:1440},(_,i)=>`${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}`);
function displayVehicle(v:PersistedVehicle):SessionVehicle{return {sessionVehicleId:v.id,make:v.make,model:v.model,platePrefix:v.platePrefix,plateBody:v.plateBody,...(v.color?{color:v.color}:{}),status:v.location};}
export function RealValetScreen({stayService}:{stayService?:StayService}={}){const {activeReservationContext:c}=useActiveReservationContext();const {session}=useGuestAuthSession();return <RealValetWorkspace key={`${session?.accountId}:${c?.reservationId}:${c?.reservationStayId}`} stayService={stayService}/>;}
function RealValetWorkspace({stayService}:{stayService?:StayService}){
 const serviceGate=useServiceCreationGate();
 const queries=useQueryClient();const {session}=useGuestAuthSession();const {activeReservationContext:context}=useActiveReservationContext();const [refreshing,setRefreshing]=useState(false);
 const clock=useAppClock();const stay=useCurrentStay(stayService);const vehicles=useValetVehicles();const savedVehicles=useSavedValetVehicles();const history=useValetRequests();const mutations=useValetMutations();
 const {editRequestId,returnTo}=useLocalSearchParams<{editRequestId?:string;returnTo?:string}>();const {showServiceRequestSuccess}=useGuestNotice();
 const [associating,setAssociating]=useState<SavedVehicle>();const [associationLocation,setAssociationLocation]=useState<'PARKED'|'WITH_GUEST'|null>(null);const [vehicleNotice,setVehicleNotice]=useState('');
 const [editingVehicle,setEditingVehicle]=useState<PersistedVehicle>();const [editingRequest,setEditingRequest]=useState<PersistedValetRequest>();
 const [registering,setRegistering]=useState(false);const [requesting,setRequesting]=useState(false);const [selected,setSelected]=useState('');
 const [date,setDate]=useState('');const [time,setTime]=useState<string|null>(null);const [datePicker,setDatePicker]=useState(false);const [timePicker,setTimePicker]=useState(false);
 const [scheduleError,setScheduleError]=useState(false);const form=useRef<RegisterVehicleModalHandle>(null);const busy=useRef(false);const loaded=useRef<string|undefined>(undefined);const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const {refetch:refetchVehicles}=vehicles;const {refetch:refetchSaved}=savedVehicles;
 const timezone=stay.data?.timezone??'';const checkout=stay.data?getEffectiveCheckoutAt(stay.data,[],timezone):null;
 const window=stay.data?getStayServiceDateWindow(stay.data.arrival,stay.data.departure,clock.nowMs(),timezone):null;
 const first=stay.data?getFirstAvailableServiceDate(clock.nowMs(),times,stay.data.arrival,stay.data.departure,checkout,timezone):null;
 const allowed=(d:string,t:string)=>!!stay.data&&isServiceWithinEffectiveCheckout({arrival:stay.data.arrival,effectiveCheckoutAtMs:checkout,nowMs:clock.nowMs(),serviceDate:d,startTime:t,timezone});
 const editable=(row:PersistedValetRequest)=>row.status==='OPEN'&&clock.nowMs()<Date.parse(row.modifiableUntil);
 useEffect(()=>{if(!editRequestId||loaded.current===editRequestId)return;const row=history.data?.find(r=>r.id===editRequestId);if(!row||row.status!=='OPEN'||clock.nowMs()>=Date.parse(row.modifiableUntil))return;const timer=setTimeout(()=>{loaded.current=editRequestId;setEditingRequest({...row});setSelected(row.vehicleId);setDate(row.serviceDate);setTime(row.deliveryTime);setRequesting(true);},0);return()=>clearTimeout(timer);},[editRequestId,history.data,clock]);
 // Staff changes also invalidate the custody view while this route is visible.
 useEffect(()=>{if(history.dataUpdatedAt){void refetchVehicles({cancelRefetch:false});void refetchSaved({cancelRefetch:false});}},[history.dataUpdatedAt,refetchVehicles,refetchSaved]);
 function createRequest(){mutations.order.reset();mutations.resetIntent();setEditingRequest(undefined);setSelected('');setDate(first??'');setTime(first&&stay.data?getNearestServiceTime(first,times,clock.nowMs(),undefined,stay.data.arrival,stay.data.departure,checkout,timezone):null);setScheduleError(false);setRequesting(true);}
 function createVehicle(){mutations.vehicle.reset();mutations.resetIntent();setEditingVehicle(undefined);form.current?.resetDraft();setRegistering(true);}
 function editVehicle(v:PersistedVehicle){if(v.hasActiveRequest)return;mutations.vehicle.reset();setEditingVehicle({...v});form.current?.loadDraft(displayVehicle(v));setRegistering(true);}
 async function submit(){if(serviceGate.blocked&&!editingRequest||busy.current||!time||!allowed(date,time)||editingRequest&&!editable(editingRequest)){setScheduleError(true);return;}busy.current=true;try{await mutations.order.mutateAsync({vehicleId:selected,input:{serviceDate:date,deliveryTime:time},editing:editingRequest});if(!mounted.current)return;setRequesting(false);showServiceRequestSuccess(editingRequest?'UPDATED':'CREATED');router.replace(returnTo==='requests'?'/services/requests':'/account');}catch{/* Keep draft, version and intent for explicit retry. */}finally{busy.current=false;}}
 const errorText=(error:unknown)=>error instanceof HttpError&&error.status===409?'El vehículo o la solicitud cambió, tiene una solicitud activa o ya no permite cambios. Actualiza antes de continuar.':error instanceof NetworkError?'Sin conexión. Conéctate y reintenta.':'No pudimos confirmar el resultado. Reintenta o consulta Mis servicios antes de crear otra solicitud.';
 const all=vehicles.data??[];const options=all.filter(v=>!v.hasActiveRequest||v.id===editingRequest?.vehicleId||mutations.order.isError&&v.id===selected).map(displayVehicle);
 return <View style={styles.screen} testID="valet-real-screen"><GuestRootHeader title="Valet"/><ScrollView style={styles.scroll} contentContainerStyle={styles.content} testID="valet-pull-refresh" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);void Promise.all([vehicles.refetch(),savedVehicles.refetch(),history.refetch(),stay.refetch(),queries.refetchQueries({queryKey:['guest-transfers',session?.accountId,context?.reservationId,context?.reservationStayId]}),queries.refetchQueries({queryKey:['guest-stay-journey',session?.accountId,context?.reservationId,context?.reservationStayId]})]).finally(()=>setRefreshing(false));}}/>}>
 {vehicles.isPending||savedVehicles.isPending||history.isPending?<Text>Cargando vehículos…</Text>:null}
 {vehicles.isError||savedVehicles.isError||history.isError?<Text accessibilityLiveRegion="polite">No pudimos actualizar tus vehículos y solicitudes.</Text>:null}

 <View style={styles.card} testID="valet-vehicles-section"><Text style={styles.cardHeading}>Vehículos de esta estadía</Text>
 {vehicles.isSuccess&&!all.length?<Text>Aún no tienes vehículos asociados a esta estadía.</Text>:null}
 {all.map(v=><View style={styles.detailList} key={v.id}><Text style={styles.bodyText}>{v.make} {v.model}{v.color?` · ${v.color}`:''}</Text><Text>{v.platePrefix} {v.plateBody} · {v.location==='PARKED'?'En parqueo':'Conmigo'}</Text><Pressable accessibilityRole="button" disabled={v.hasActiveRequest} onPress={()=>editVehicle(v)} testID={`valet-edit-${v.id}`} style={styles.secondaryButton}><ActionLabel label="Editar vehículo" textStyle={styles.secondaryButtonLabel}/></Pressable>{v.hasActiveRequest?<Text>Tiene una solicitud activa.</Text>:null}{v.location==='WITH_GUEST'?<Text>El personal confirmará el retorno al parqueo.</Text>:null}</View>)}
 <Pressable accessibilityRole="button" disabled={!vehicles.isSuccess||!savedVehicles.isSuccess} onPress={createVehicle} style={styles.secondaryButton} testID="valet-register-vehicle"><ActionLabel label="Registrar vehículo" textStyle={styles.secondaryButtonLabel}/></Pressable></View>
 {vehicleNotice?<Text accessibilityLiveRegion="polite">{vehicleNotice}</Text>:null}
 <View style={styles.card} testID="valet-saved-vehicles"><Text style={styles.cardHeading}>Vehículos guardados</Text><Text>Reutiliza un vehículo de tu cuenta en esta estadía. Confirma su ubicación actual.</Text>
 {(savedVehicles.data??[]).filter(v=>!all.some(row=>row.savedVehicleId===v.id)).map(v=><View key={v.id} style={styles.detailList}><Text>{v.make} {v.model} · {v.platePrefix} {v.plateBody}</Text><Pressable accessibilityRole="button" accessibilityState={{disabled:!v.canAssociate}} disabled={!v.canAssociate} onPress={()=>{mutations.associate.reset();mutations.resetIntent();setAssociationLocation(null);setAssociating({...v});}} testID={`valet-associate-${v.id}`} style={styles.secondaryButton}><ActionLabel label="Usar en esta estadía" textStyle={styles.secondaryButtonLabel}/></Pressable>{!v.canAssociate?<Text>Tiene una estancia operativa, custodia o solicitud pendiente.</Text>:null}</View>)}
 </View>
 <ServiceCreationNotice message={serviceGate.message}/><Text style={styles.cardHeading}>Servicios</Text><Pressable accessibilityRole="button" disabled={serviceGate.blocked||!vehicles.isSuccess||!history.isSuccess} onPress={()=>all.length?createRequest():createVehicle()} style={styles.card} testID="valet-vehicle-card"><Text style={styles.cardHeading}>Solicitar mi vehículo</Text><Text>{all.length?'Selecciona un vehículo en parqueo.':'Registra un vehículo antes de solicitarlo.'}</Text></Pressable>
 <RealTransferLauncher/>
 </ScrollView><GuestNavigationShell/>
 <RegisterVehicleModal ref={form} visible={registering} editing={!!editingVehicle} lockLocation={!!editingVehicle} submitting={mutations.vehicle.isPending} error={mutations.vehicle.isError?errorText(mutations.vehicle.error):undefined}
 vehicles={(savedVehicles.data??[]).filter(v=>v.id!==editingVehicle?.savedVehicleId)} onClose={()=>{if(!busy.current)setRegistering(false);}} onRegister={async input=>{if(busy.current)return false;busy.current=true;try{await mutations.vehicle.mutateAsync({input:{make:input.make,model:input.model,platePrefix:input.platePrefix,plateBody:input.plateBody,color:input.color||null,location:input.status},editing:editingVehicle});return mounted.current;}catch{return false;}finally{busy.current=false;}}}/>
 <Modal visible={!!associating} transparent animationType="slide" onRequestClose={()=>{if(!busy.current)setAssociating(undefined);}}><View style={styles.modalBackdrop}><View style={styles.modalSheet} accessibilityViewIsModal><ScrollView><Text accessibilityRole="header" style={styles.cardHeading}>Asociar vehículo a esta estadía</Text><Text>{associating?.make} {associating?.model} · {associating?.platePrefix} {associating?.plateBody}</Text><Text>¿Dónde está el vehículo actualmente?</Text>
 {(['PARKED','WITH_GUEST'] as const).map(location=><Pressable key={location} accessibilityRole="radio" accessibilityState={{checked:associationLocation===location,disabled:mutations.associate.isPending}} disabled={mutations.associate.isPending} onPress={()=>setAssociationLocation(location)} style={styles.secondaryButton}><Text>{location==='PARKED'?'En parqueo':'Conmigo'}{associationLocation===location?' ✓':''}</Text></Pressable>)}
 {mutations.associate.isError?<Text accessibilityLiveRegion="polite">{errorText(mutations.associate.error)}</Text>:null}
 <Pressable accessibilityRole="button" disabled={!associationLocation||mutations.associate.isPending} testID="valet-confirm-association" onPress={async()=>{if(!associating||!associationLocation||busy.current)return;busy.current=true;try{await mutations.associate.mutateAsync({saved:associating,location:associationLocation});if(mounted.current){setAssociating(undefined);setVehicleNotice('Vehículo asociado a esta estadía.');}}catch{/* Keep version and key for retry. */}finally{busy.current=false;}}} style={styles.secondaryButton}><Text>Confirmar asociación</Text></Pressable><Pressable accessibilityRole="button" disabled={mutations.associate.isPending} onPress={()=>setAssociating(undefined)}><Text>Cancelar asociación</Text></Pressable></ScrollView></View></View></Modal>
 <VehicleModal visible={requesting} activeKey={selected} vehicles={options} onSelect={id=>{if(!editingRequest)setSelected(id);}} onClose={()=>{if(!busy.current){setRequesting(false);if(editRequestId)router.replace(returnTo==='requests'?'/services/requests':'/account');}}} noAvailability={!first} onOpenDatePicker={()=>setDatePicker(true)} onOpenTimePicker={()=>setTimePicker(true)} serviceDate={date} requestedTime={time} requestedTimeAllowed={!!time&&allowed(date,time)} scheduleError={scheduleError} error={mutations.order.isError?errorText(mutations.order.error):undefined} lockVehicle={!!editingRequest} submitting={mutations.order.isPending} onSubmit={()=>void submit()}/>

 <ServiceDatePicker visible={datePicker&&!!window} value={date} minimumDate={window?parseServiceDate(window.minimumDate)??clock.getNow():clock.getNow()} maximumDate={window?parseServiceDate(window.maximumDate)??undefined:undefined} onCancel={()=>setDatePicker(false)} onConfirm={d=>{setDate(d);setDatePicker(false);}} testID="valet-request-date-picker"/>
 <TimeWheelPicker visible={timePicker} mode="time" value={time??'09:00'} title="Elegir hora" isValueDisabled={t=>!allowed(date,t)} onCancel={()=>setTimePicker(false)} onConfirm={t=>{if(allowed(date,t)){setTime(t);setTimePicker(false);}}} testID="valet-request-time-wheel"/>
 </View>;
}

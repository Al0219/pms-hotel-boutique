import {useEffect,useRef,useState} from 'react';
import {Modal,Pressable,ScrollView,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {useGuestAuthSession} from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import {useActiveReservationContext} from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import {useRealStayJourney} from '@/modules/checkout/presentation/hooks/useRealStayJourney';
import {useServiceCreationGate} from '@/modules/checkout/presentation/hooks/useServiceCreationGate';
import {ServiceDatePicker,TimeWheelPicker,ConfirmationModal,SwipeToDelete} from '@/shared/components';
import {formatServiceDate,parseServiceDate,filterPersistedServiceRequests,type ServiceRequestFilter} from '@/modules/service-requests/domain/serviceRequestPresentation';
import {TransferModal,PlaceSelector} from './TransferModals';
import {useTransfers,useTransferCatalog,useTransferPrices,useTransferMutations} from './hooks/useTransfers';
import {useTransferRouteEstimate} from './hooks/useTransferRouteEstimate';
import {GoogleMapsLinkingService} from '../data/services/GoogleMapsLinkingService';
import type {TransferOrder} from '../domain/Transfer';
import {valetStyles as styles} from './valetStyles';
export function RealTransferLauncher(){const {session}=useGuestAuthSession();const {activeReservationContext:c}=useActiveReservationContext();return <TransferWorkspace key={`${session?.accountId}:${c?.reservationId}:${c?.reservationStayId}`}/>;}
function TransferWorkspace(){
 const catalog=useTransferCatalog(),prices=useTransferPrices(),history=useTransfers(),gate=useServiceCreationGate(),journey=useRealStayJourney(),{save}=useTransferMutations();
 const {transferEditId}=useLocalSearchParams<{transferEditId?:string}>(),edited=history.data?.find(r=>r.id===transferEditId);
 const [visible,setVisible]=useState(false),[destinationKey,setDestination]=useState('place-airport'),[pickupKey,setPickup]=useState<string|null>(null),[scheduled,setScheduled]=useState(()=>new Date(Date.now()+3600000)),[passengers,setPassengers]=useState(2),[selector,setSelector]=useState<'destination'|'pickup'|null>(null),[datePicker,setDatePicker]=useState(false),[timePicker,setTimePicker]=useState(false),[mapError,setMapError]=useState(false);
 const now=useTransferNow();
 const loaded=useRef<string|null>(null),busy=useRef(false);
 const places=catalog.data??[],destination=places.find(p=>p.key===destinationKey)??null,pickup=places.find(p=>p.key===pickupKey)??null,origin=destination?.type==='HOTEL'?pickup:places.find(p=>p.type==='HOTEL')??null;
 const route=useTransferRouteEstimate(origin?.key??null,destination?.key??null),price=prices.data?.find(p=>p.originKey===origin?.key&&p.destinationKey===destination?.key),fare=price?{estimatedPrice:price.totalMinor/100,estimatedPriceText:`Q. ${(price.totalMinor/100).toFixed(2)}`} :null;
 const date=formatServiceDate(scheduled),time=`${String(scheduled.getHours()).padStart(2,'0')}:${String(scheduled.getMinutes()).padStart(2,'0')}`,stay=journey.state.data?.stay;
 const valid=!!stay&&date>=stay.arrival&&date<=stay.departure&&!(date===stay.departure&&time>'12:00')&&scheduled.getTime()>=now+((edited&&date===edited.serviceDate&&time===edited.deliveryTime)?25:30)*60000&&(!gate.blocked||!!edited)&&(edited?edited.canModify:true);
 useEffect(()=>{if(!edited||loaded.current===edited.id)return;loaded.current=edited.id;const timer=setTimeout(()=>{setDestination(edited.items[0].destination.key);setPickup(edited.items[0].origin.type==='PLACE'?edited.items[0].origin.key:null);setPassengers(edited.items[0].passengers);setScheduled(new Date(`${edited.serviceDate}T${edited.deliveryTime}:00`));setVisible(true);},0);return()=>clearTimeout(timer);},[edited]);
 function close(){if(busy.current)return;setVisible(false);if(transferEditId)router.replace('/services/requests');}
 async function submit(){if(!valid||!fare||!origin||!destination||busy.current)return;busy.current=true;try{await save.mutateAsync({input:{originKey:origin.key,destinationKey:destination.key,serviceDate:date,deliveryTime:time,passengers,notes:null},editing:edited});setVisible(false);router.replace('/services/requests');}catch{/* Preserve draft/key. */}finally{busy.current=false;}}
 return <><Pressable accessibilityRole="button" disabled={gate.blocked||!places.length||!prices.isSuccess||catalog.isError||history.isError} onPress={()=>{save.reset();setVisible(true);}} style={styles.card} testID="valet-transfer-card"><Text style={styles.cardHeading}>Solicitar traslado</Text><Text>Hotel → Destino · Recogida → Hotel</Text></Pressable>
 {catalog.isError?<Pressable accessibilityRole="button" onPress={()=>void catalog.refetch()}><Text>No pudimos consultar lugares. Reintentar</Text></Pressable>:catalog.isSuccess&&!places.length?<Text>No hay traslados configurados para este hotel.</Text>:null}
 <TransferModal visible={visible} dateText={date} timeText={time} destination={destination} pickup={pickup} origin={origin} passengers={passengers} fare={fare} mapError={mapError} noAvailability={false} scheduleInvalid={!valid} scheduleIsValid={valid} route={route} reservation={{isSuccess:false,isPending:save.isPending,isError:save.isError,error:save.error}} onClose={close} onOpenDatePicker={()=>setDatePicker(true)} onOpenTimePicker={()=>setTimePicker(true)} onOpenSelector={setSelector} onPassengers={setPassengers} onReserve={()=>void submit()} onRetryRoute={()=>void route.refetch()} onReset={()=>save.reset()} onOpenMap={()=>{if(origin&&destination)void new GoogleMapsLinkingService().openRoute(origin,destination).then(ok=>setMapError(!ok));}} demonstration/>
 <PlaceSelector visible={!!selector} target={selector} places={places} selectedKey={selector==='pickup'?pickupKey:destinationKey} onClose={()=>setSelector(null)} onSelect={p=>{if(selector==='pickup')setPickup(p.key);else setDestination(p.key);setSelector(null);}}/>
 <ServiceDatePicker visible={datePicker} value={date} minimumDate={parseServiceDate(stay?.arrival??date)??new Date()} maximumDate={parseServiceDate(stay?.departure??date)??new Date()} onCancel={()=>setDatePicker(false)} onConfirm={d=>{const picked=parseServiceDate(d);if(!picked)return;const next=new Date(scheduled);next.setFullYear(picked.getFullYear(),picked.getMonth(),picked.getDate());setScheduled(next);setDatePicker(false);}} testID="real-transfer-date"/>
 <TimeWheelPicker visible={timePicker} mode="time" value={time} title="Hora del traslado" onCancel={()=>setTimePicker(false)} onConfirm={v=>{const next=new Date(scheduled);const [h,m]=v.split(':').map(Number);next.setHours(h,m,0,0);setScheduled(next);setTimePicker(false);}} testID="real-transfer-time"/>
 </>;
}
type HistoryProps={query:ReturnType<typeof useTransfers>;filter?:ServiceRequestFilter;showFeedback?:boolean};
export function TransferRequestsContent(props:HistoryProps){const {session}=useGuestAuthSession();const {activeReservationContext:c}=useActiveReservationContext();return <TransferRequestsBody key={`${session?.accountId}:${c?.reservationId}:${c?.reservationStayId}`} {...props}/>;}
function TransferRequestsBody({query,filter='ALL',showFeedback=true}:HistoryProps){
 const {cancel}=useTransferMutations(),[target,setTarget]=useState<TransferOrder|null>(null),[detailId,setDetailId]=useState<string|null>(null),[notice,setNotice]=useState(''),pending=useRef(false);
 const now=useTransferNow(),detail=query.data?.find(row=>row.id===detailId);
 const labels={OPEN:'Solicitado',IN_PROGRESS:'En proceso',DONE:'Completado',CANCELLED:'Cancelado'};
 const editable=(row:TransferOrder,time:number)=>row.canModify&&row.status==='OPEN'&&time<Date.parse(row.modifiableUntil);
 function open(row:TransferOrder,time:number){if(pending.current)return;if(editable(row,time))router.push({pathname:'/valet',params:{transferEditId:row.id}});else setDetailId(row.id);}
 function askCancel(row:TransferOrder,time:number){if(pending.current)return;if(!editable(row,time)){setNotice('El traslado ya no se puede modificar.');void query.refetch();return;}cancel.reset();setNotice('');setTarget(row);}
 function content(row:TransferOrder){return <><Text>{row.items[0].origin.displayText} → {row.items[0].destination.displayText}</Text><Text>{row.serviceDate} · {row.deliveryTime} · {row.items[0].passengers} pasajeros</Text><Text>{row.items[0].totalMinor==null?'Sin cargo histórico':`${row.status==='DONE'?'Cargo':row.status==='CANCELLED'?'Cancelado':'Estimado'} Q. ${(row.items[0].totalMinor/100).toFixed(2)}`}</Text>{row.notes?<Text>{row.notes}</Text>:null}</>;}
 return <View testID="transfer-history">{showFeedback&&query.isError?<Text>No pudimos actualizar los traslados.</Text>:null}{notice?<Text accessibilityLiveRegion="polite">{notice}</Text>:null}{filterPersistedServiceRequests(query.data??[],filter).map(r=>{
  const canModify=editable(r,now);
  const card=<Pressable key={r.id} accessible accessibilityRole="button" accessibilityLabel={`${canModify?'Editar traslado':'Ver detalle del traslado'} · ${labels[r.status]}`} accessibilityHint={`${r.items[0].origin.displayText} a ${r.items[0].destination.displayText}. ${r.serviceDate}, ${r.deliveryTime}.`} accessibilityState={{disabled:cancel.isPending}} disabled={cancel.isPending} accessibilityActions={[{name:'activate',label:canModify?'Editar traslado':'Ver detalle del traslado'},...(canModify?[{name:'cancel',label:'Cancelar traslado'}]:[])]} onAccessibilityAction={({nativeEvent})=>{if(nativeEvent.actionName==='activate')open(r,Date.now());if(nativeEvent.actionName==='cancel'&&canModify)askCancel(r,Date.now());}} onPress={()=>open(r,Date.now())} style={styles.card} testID={`transfer-request-${r.id}`}><Text style={styles.cardHeading}>Traslado · {labels[r.status]}</Text>{content(r)}</Pressable>;
  return canModify?<SwipeToDelete key={r.id} deleteLabel="Cancelar traslado" enabled={!cancel.isPending} onDelete={()=>askCancel(r,Date.now())} testID={`transfer-swipe-${r.id}`}>{card}</SwipeToDelete>:card;
 })}
 <Modal transparent animationType="fade" visible={!!detail} onRequestClose={()=>setDetailId(null)}><View style={styles.modalBackdrop}><ScrollView contentContainerStyle={styles.modalScroll}><View style={styles.modalSheet} accessibilityViewIsModal testID="transfer-readonly-detail"><Pressable accessibilityRole="button" accessibilityLabel="Cerrar detalle del traslado" onPress={()=>setDetailId(null)} style={styles.secondaryButton}><Text>×</Text></Pressable>{detail?<><Text style={styles.cardHeading}>Traslado · {labels[detail.status]}</Text>{content(detail)}</>:null}</View></ScrollView></View></Modal>
 <ConfirmationModal testID="transfer-cancel-confirm" visible={!!target} title="Cancelar traslado" body={cancel.isError?'No pudimos confirmar. Reintenta con la misma solicitud.':'El traslado permanecerá en tu historial.'} confirmLabel={cancel.isPending?'Cancelando…':'Cancelar traslado'} busy={cancel.isPending} onCancel={()=>{if(!pending.current)setTarget(null);}} onConfirm={()=>{if(!target||pending.current)return;if(!editable(target,Date.now())){setTarget(null);setNotice('El traslado ya no se puede modificar.');void query.refetch();return;}pending.current=true;cancel.mutate(target,{onSuccess:()=>setTarget(null),onSettled:()=>{pending.current=false;}});}}/>
 </View>;
}

function useTransferNow(){const [now,setNow]=useState(()=>Date.now());useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(timer);},[]);return now;}

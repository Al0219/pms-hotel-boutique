import {mapDocumentFile} from '../../domain/DocumentFile';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {useQuery,useQueryClient,type QueryKey} from '@tanstack/react-query';
import {environment} from '@/config/environment';
import {HttpError} from '@/data/remote/http/HttpError';
import {useGuestAuthSession} from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import {useActiveReservationContext} from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import {stayJourneyService as service} from '../../data/http/HttpStayJourneyService';
import {mapJourneyDocument,mapJourneyRequests,mapJourneyState,mapJourneySummary,mapSimulatedReceipt} from '../../data/mappers/mapStayJourney';
import {journeyAttemptStore,journeyOperationKey,type JourneyAttempt} from '../../data/device/JourneyAttemptStore';
import type {SimulatedPaymentInput} from '../../domain/StayJourney';

export function useJourneyScope(){const {session,sessionExpired}=useGuestAuthSession();const {activeReservationContext:context}=useActiveReservationContext();const accountId=session?.accountId;return{accountId,context,identity:`${accountId}:${context?.reservationId}:${context?.reservationStayId}`,enabled:!environment.useMockApi&&!!accountId&&!!context&&!sessionExpired};}
function useLive<T>(queryKey:QueryKey,enabled:boolean,queryFn:()=>Promise<T>){
 const [focused,setFocused]=useState(false),[foreground,setForeground]=useState(AppState.currentState==='active');
 useEffect(()=>{const listener=AppState.addEventListener('change',s=>setForeground(s==='active'));return()=>listener.remove();},[]);
 const query=useQuery({queryKey,enabled,queryFn,retry:false,refetchIntervalInBackground:false,refetchInterval:enabled&&focused&&foreground?10000:false});
 const {refetch}=query;useFocusEffect(useCallback(()=>{setFocused(true);if(enabled)void refetch({cancelRefetch:false});return()=>setFocused(false);},[enabled,refetch]));return query;
}
export function useRealStayJourney(financial=false,loadDocument=false){
 const scope=useJourneyScope(),{context,accountId,enabled}=scope;const client=useQueryClient();
 const prefix=['guest-stay-journey',accountId,context?.reservationId,context?.reservationStayId];
 const state=useLive([...prefix,'state'],enabled,async()=>mapJourneyState(await service.read(context!,'state'),context!));
 useEffect(()=>{if(enabled&&state.isSuccess)void client.invalidateQueries({queryKey:['stay',context?.reservationId,context?.reservationStayId],exact:true});},[enabled,state.isSuccess,state.data?.stay.status,client,context?.reservationId,context?.reservationStayId]);
 const property=state.isSuccess?state.data.stay.propertyId:undefined;
 const summary=useLive([...prefix,'summary'],enabled&&financial&&!!property,async()=>mapJourneySummary(await service.read(context!,'summary'),context!,property!));
 const document=useLive([...prefix,'document'],enabled&&financial&&loadDocument&&!!property&&state.data?.stay.status==='CHECKED_OUT',async()=>mapJourneyDocument(await service.read(context!,'document'),context!,property!));
 const file=useLive([...prefix,'file'],enabled&&loadDocument&&!!document.data,async()=>{try{return mapDocumentFile(await service.read(context!,'document-file'),document.data!.id);}catch(error){if(error instanceof HttpError&&error.status===404)return null;throw error;}});
 async function issueFile(){if(!context||!document.data)throw new Error('Document unavailable');const result=mapDocumentFile(await service.issueFile(context),document.data.id);client.setQueryData([...prefix,'file'],result);return result;}
 const [pendingPayment,setPendingPayment]=useState<JourneyAttempt|null>(null),[pendingRequest,setPendingRequest]=useState<JourneyAttempt|null>(null),[ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const active=useRef(false),inFlight=useRef(false),payment=useRef<JourneyAttempt|null>(null),request=useRef<JourneyAttempt|null>(null);
 useEffect(()=>{
  active.current=true;let mounted=true;
  if(enabled&&context&&accountId){const storageScope={accountId,context};Promise.all([journeyAttemptStore.read(storageScope,'payment'),journeyAttemptStore.read(storageScope,'request')]).then(([p,r])=>{if(!mounted)return;payment.current=p;request.current=r;setPendingPayment(p);setPendingRequest(r);setReady(true);}).catch(()=>{if(mounted)setError('No se pudo recuperar una operación pendiente. Revisa el folio antes de continuar.');});}
  return()=>{active.current=false;mounted=false;};
 },[enabled,accountId,context]);
 async function refresh(){await Promise.all([client.invalidateQueries({queryKey:prefix}),client.invalidateQueries({queryKey:['stay',context?.reservationId,context?.reservationStayId]})]);}
 async function perform(kind:'payment'|'request',input?:SimulatedPaymentInput|'CHECK_IN'|'CHECK_OUT'){
  if(!enabled||!context||!accountId||!ready||inFlight.current)return;
  const ref=kind==='payment'?payment:request;let attempt=ref.current;
  if(!attempt){
   if(kind==='payment'&&input&&typeof input==='object')attempt={kind,key:journeyOperationKey(),input:{amount:input.amount,currency:'GTQ',instrumentToken:input.instrumentToken}};
   else if(kind==='request'&&typeof input==='string'&&state.data)attempt={kind,key:journeyOperationKey(),input:{kind:input,expectedUpdatedAt:state.data.stay.updatedAt}};
  }
  if(!attempt||attempt.kind!==kind)return;
  inFlight.current=true;setBusy(true);setError('');setMessage('');const storageScope={accountId,context};
  try{
   await journeyAttemptStore.write(storageScope,attempt);if(!active.current)return;
   ref.current=attempt;if(kind==='payment')setPendingPayment(attempt);else setPendingRequest(attempt);
   if(attempt.kind==='payment'){
    const receipt=mapSimulatedReceipt(await service.pay(context,attempt.input,attempt.key));if(!active.current)return;
    const [whole,decimal='']=attempt.input.amount.split('.');
    if(receipt.folioId!==summary.data?.folioId||receipt.amount!==`${BigInt(whole)}.${decimal.padEnd(2,'0')}`)throw new Error('Invalid receipt scope');
    await journeyAttemptStore.clear(storageScope,kind);if(!active.current)return;
    ref.current=null;setPendingPayment(null);setMessage(receipt.result==='APPROVED'?'Pago simulado aprobado y registrado.':receipt.result==='DECLINED'?'Pago simulado rechazado. No se registró ningún pago.':'Fallo de procesamiento simulado. No se registró ningún pago.');
   }else{
    const row=mapJourneyRequests([await service.request(context,attempt.input,attempt.key)])[0];if(!active.current)return;if(row.kind!==attempt.input.kind)throw new Error('Invalid request result');
    await journeyAttemptStore.clear(storageScope,kind);if(!active.current)return;ref.current=null;setPendingRequest(null);setMessage(row.status==='DONE'?'Solicitud ya confirmada por Staff.':'Solicitud enviada. Staff debe confirmar; la estancia conserva su estado actual.');
   }
   await refresh();return true;
  }catch(failure){
   if(!active.current)return;
   if(failure instanceof HttpError&&[400,409].includes(failure.status??0)){
    // A definitive business rejection is not a lost response; an already committed replay returns its receipt.
    try{await journeyAttemptStore.clear(storageScope,kind);}catch{setError('No se pudo conservar el resultado. Recupera la misma operación.');return;}ref.current=null;if(kind==='payment')setPendingPayment(null);else setPendingRequest(null);
    setError('El servidor rechazó la operación. Actualiza y revisa el estado, importe y saldo.');await refresh();
   }else setError('No pudimos confirmar el resultado. Conservamos la referencia: recupera la misma operación antes de enviar otra.');
  }finally{inFlight.current=false;if(active.current)setBusy(false);}
 }
 return{...scope,state,summary,document,file,issueFile,pendingPayment,pendingRequest,ready,busy,message,error,refresh,pay:(input?:SimulatedPaymentInput)=>perform('payment',input),request:(kind?:'CHECK_IN'|'CHECK_OUT')=>perform('request',kind)};
}

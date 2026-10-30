import {ActionLabel} from '@/shared/components/ActionLabel';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {router} from 'expo-router';
import {Modal,Pressable,RefreshControl,ScrollView,Text,View} from 'react-native';
import {HttpError} from '@/data/remote/http/HttpError';
import {guestFeatureIcons} from '@/modules/navigation/guestFeatureIcons';
import {GuestChildHeader} from '@/modules/navigation';
import {ConfirmationModal} from '@/shared/components';
import {useJourneyScope,useRealStayJourney} from './hooks/useRealStayJourney';
import type {JourneySummary} from '../domain/StayJourney';
import {minor} from '../domain/syntheticPayment';
import {ticketLine,ticketMoney} from '../domain/journeyTicket';
import {ExpoInvoiceDocumentService} from '../data/device/ExpoInvoiceDocumentService';
import type {InvoiceDocumentService} from '../data/services/InvoiceDocumentService';
import {SyntheticPaymentForm} from './SyntheticPaymentForm';
import {journeyStyles as s} from './journeyStyles';
const pdfService=new ExpoInvoiceDocumentService();
function Button({children,onPress,disabled=false,testID}:{children:ReactNode;onPress:()=>void;disabled?:boolean;testID?:string}){return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[s.button,disabled&&s.disabled]} testID={testID}>{typeof children==='string'?<ActionLabel label={children} textStyle={s.buttonText}/>:<Text style={s.buttonText}>{children}</Text>}</Pressable>;}
function errorText(error:unknown){return error instanceof HttpError&&error.status===404?'El acceso financiero está limitado al responsable verificado de la reserva.':error instanceof HttpError&&error.status===409?'Este recorrido requiere una reserva estándar, una estancia y contabilidad GTQ verificable.':'No pudimos consultar los datos reales. Revisa conexión y sesión; no se utilizarán datos de demostración.';}
function FinancialSummary({value,provisional=false}:{value:JourneySummary;provisional?:boolean}){return <View style={s.card} testID="journey-financial-summary">
 <Text style={s.heading}>{provisional?'Resumen provisional':'Folio de la reserva'}</Text>
 <View style={s.ticketRow}><Text style={s.ticketType}>TIPO</Text><Text style={s.ticketLabel}>CARGO</Text><Text style={s.ticketPrice}>PRECIO</Text></View>
 {value.movements.map(line=>{const item=ticketLine(line);return <View style={s.ticketRow} key={line.id}><Text style={s.ticketType}>{item.type}</Text><Text style={s.ticketLabel}>{item.label}</Text><Text style={s.ticketPrice}>{item.price}</Text></View>;})}
 <View style={s.totalRow}><Text style={s.body}>Total de cargos</Text><Text style={s.body}>{ticketMoney(value.charges)}</Text></View>
 <View style={s.totalRow}><Text style={s.body}>Pagos acumulados</Text><Text style={s.body}>{ticketMoney(value.payments)}</Text></View>
 {value.adjustments!=='0.00'?<View style={s.totalRow}><Text style={s.body}>Ajustes</Text><Text style={s.body}>{ticketMoney(value.adjustments)}</Text></View>:null}
 <View style={s.totalRow}><Text style={s.heading}>Saldo restante</Text><Text style={s.heading}>{ticketMoney(value.balance)}</Text></View>
 {!value.verifiable?<Text style={s.error}>Saldo no verificable.</Text>:null}
 {value.pendingOrders>0?<Text style={s.error}>Room Service pendiente: {value.pendingOrders}.</Text>:null}
 {value.unpostedOrders>0?<Text style={s.error}>Pedidos entregados pendientes de contabilizar.</Text>:null}
 </View>;}
export function RealJourneyAccountActions(){const scope=useJourneyScope();return scope.enabled?<AccountActions key={scope.identity}/>:null;}
function AccountActions(){
 const journey=useRealStayJourney();const state=journey.state.data;const [confirming,setConfirming]=useState(false);
 const pending=state?.requests.some(r=>r.kind==='CHECK_IN'&&r.status==='OPEN');
 const allowed=journey.state.isSuccess&&state?.stay.status==='RESERVED'&&state.currentDate>=state.stay.arrival&&state.currentDate<state.stay.departure;
 async function submit(){const success=await journey.request('CHECK_IN');if(success)setConfirming(false);}
 return <View style={s.card} testID="account-real-journey">
  {journey.state.isLoading?<Text style={s.body}>Consultando estado de estancia…</Text>:journey.state.isError?<Text style={s.error}>{errorText(journey.state.error)}</Text>:state?<Text style={s.body}>{state.stay.status==='CHECKED_OUT'?'Salida confirmada por Staff.':state.stay.status==='IN_HOUSE'?'Entrada confirmada por Staff.':'Entrada pendiente de confirmación.'}</Text>:null}
  {pending?<Text style={s.body}>Entrada solicitada · Pendiente de Staff</Text>:null}
  {state?.requests.some(r=>r.kind==='CHECK_OUT'&&r.status==='OPEN')?<Text style={s.body}>Salida solicitada · Pendiente de Staff</Text>:null}
  {journey.pendingRequest?<Button disabled={!journey.ready||journey.busy} onPress={()=>void journey.request()} testID="account-recover-stay-request">Recuperar solicitud pendiente</Button>:state?.stay.status==='RESERVED'?<Button disabled={!allowed||pending||!journey.ready||journey.busy} onPress={()=>setConfirming(true)} testID="account-request-checkin">Solicitar check-in</Button>:null}
  {state?.stay.status==='RESERVED'&&!allowed?<Text style={s.muted}>La entrada está disponible desde {state.stay.arrival}, según la fecha local del hotel.</Text>:null}
  {state?.stay.status==='IN_HOUSE'||state?.stay.status==='CHECKED_OUT'?<Button onPress={()=>router.push(state.stay.status==='CHECKED_OUT'?'/account/invoice':'/account/checkout')} testID="account-checkout-launcher">{state.stay.status==='CHECKED_OUT'?'Ver documento informativo':'Check-out y gastos'}</Button>:null}
  {journey.message?<Text accessibilityLiveRegion="polite" style={s.body}>{journey.message}</Text>:null}{journey.error?<Text accessibilityLiveRegion="polite" style={s.error}>{journey.error}</Text>:null}
  <ConfirmationModal busy={journey.busy} visible={confirming} title="Solicitar entrada" body="Recepción debe confirmar la entrada y verificar la habitación. Esta solicitud no inicia la estancia." confirmLabel={journey.busy?'Enviando…':'Enviar solicitud'} testID="journey-checkin-confirm" onCancel={()=>{if(!journey.busy)setConfirming(false);}} onConfirm={()=>{if(!journey.busy)void submit();}}/>
 </View>;
}
export function RealCheckoutScreen(){const scope=useJourneyScope();return <CheckoutWorkspace key={scope.identity}/>;}
function CheckoutWorkspace(){
 const journey=useRealStayJourney(true),state=journey.state.data,summary=journey.summary.isSuccess?journey.summary.data:undefined;
 const [paying,setPaying]=useState(false),[confirming,setConfirming]=useState(false),[refreshing,setRefreshing]=useState(false);
 async function pullRefresh(){setRefreshing(true);try{await journey.refresh();}finally{setRefreshing(false);}}
 const out=state?.stay.status==='CHECKED_OUT',open=state?.requests.some(r=>r.kind==='CHECK_OUT'&&r.status==='OPEN');
 const due=summary?minor(summary.balance):null;
 const canPay=summary?.verifiable&&summary.unpostedOrders===0&&due!==null&&due>0n&&['RESERVED','IN_HOUSE'].includes(state?.stay.status??'');
 async function request(){if(await journey.request('CHECK_OUT'))setConfirming(false);}
 return <View style={s.screen} testID="real-checkout-screen"><GuestChildHeader title="Check-out y gastos" backAccessibilityLabel="Volver a inicio" onBack={()=>router.dismissTo('/account')}/>
  <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void pullRefresh()}/>} testID="journey-scroll">
   {!journey.enabled?<Text style={s.error}>Inicia sesión y selecciona una estancia.</Text>:journey.state.isLoading?<Text style={s.body}>Cargando estancia…</Text>:journey.state.isError?<Text style={s.error}>{errorText(journey.state.error)}</Text>:<>
    {out||open?<Text style={s.heading}>{out?'Salida confirmada por Staff':'Salida solicitada · Pendiente de Staff'}</Text>:null}
    {journey.summary.isLoading?<Text style={s.body}>Consultando folio real…</Text>:journey.summary.isError?<Text style={s.error}>{errorText(journey.summary.error)}</Text>:summary?<FinancialSummary value={summary}/>:null}
    {canPay&&!journey.pendingPayment?<Button disabled={!journey.ready||journey.busy||journey.summary.isFetching} onPress={()=>setPaying(true)} testID="journey-open-payment">Abonar o pagar saldo</Button>:null}
    {journey.pendingPayment?<Button disabled={!journey.ready||journey.busy} onPress={()=>setPaying(true)} testID="journey-recover-payment">Recuperar pago pendiente</Button>:null}
    {journey.pendingRequest?<Button disabled={!journey.ready||journey.busy} onPress={()=>void journey.request()} testID="journey-recover-request">Recuperar solicitud pendiente</Button>:state?.stay.status==='IN_HOUSE'?<Button disabled={open||journey.busy||!journey.ready||!summary} onPress={()=>setConfirming(true)} testID="journey-request-checkout">Solicitar check-out</Button>:null}
    {out?<Button onPress={()=>router.push('/account/invoice')} testID="journey-open-document">Ver documento informativo</Button>:null}
   </>}
   {journey.message?<Text accessibilityLiveRegion="polite" style={s.body}>{journey.message}</Text>:null}{journey.error&&!paying?<Text accessibilityLiveRegion="polite" style={s.error}>{journey.error}</Text>:null}
  </ScrollView>
  <ConfirmationModal busy={journey.busy} icon={guestFeatureIcons.checkout} visible={confirming} title="Solicitar salida" body="La estancia seguirá activa hasta que Staff confirme el saldo cero y registre tu salida." confirmLabel={journey.busy?'Enviando…':'Enviar solicitud de salida'} testID="journey-checkout-confirm" onCancel={()=>{if(!journey.busy)setConfirming(false);}} onConfirm={()=>{if(!journey.busy)void request();}}/>
  <Modal visible={paying} transparent animationType="fade" onRequestClose={()=>{if(!journey.busy)setPaying(false);}}><View style={s.backdrop}><View style={s.modal} accessibilityViewIsModal>
   <Pressable accessibilityRole="button" accessibilityLabel="Cerrar pago" disabled={journey.busy} onPress={()=>setPaying(false)} style={s.closePayment}><Text style={s.heading}>×</Text></Pressable>
   <ScrollView keyboardShouldPersistTaps="handled">{journey.pendingPayment?<View style={s.card}><Text style={s.body}>Operación pendiente de comprobar. Recuperaremos la misma referencia, sin crear un segundo pago.</Text><Button disabled={journey.busy||!journey.ready} onPress={()=>{void journey.pay().then(done=>{if(done)setPaying(false);});}} testID="journey-retry-payment">{journey.busy?'Procesando…':'Recuperar misma operación'}</Button></View>:summary&&state?<SyntheticPaymentForm balance={summary.balance} today={state.currentDate} busy={journey.busy} onSubmit={input=>{void journey.pay(input).then(done=>{if(done)setPaying(false);});}}/>:null}
    {journey.error?<Text style={s.error}>{journey.error}</Text>:null}</ScrollView>
  </View></View></Modal>
 </View>;
}
export function RealInvoiceScreen({documentService=pdfService}:{documentService?:InvoiceDocumentService}={}){const scope=useJourneyScope();return <InvoiceWorkspace key={scope.identity} service={documentService}/>;}
function InvoiceWorkspace({service}:{service:InvoiceDocumentService}){
 const journey=useRealStayJourney(true,true),document=journey.document.isSuccess?journey.document.data:undefined;
 const eligible=journey.state.data?.stay.status==='CHECKED_OUT'&&journey.summary.isSuccess&&journey.summary.data.verifiable&&journey.summary.data.balance==='0.00'&&journey.summary.data.pendingOrders===0&&journey.summary.data.unpostedOrders===0;
 const [,setUri]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const active=useRef(true),running=useRef(false),[lastAction,setLastAction]=useState<'generate'|'open'|'share'|null>(null);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 async function action(kind:'generate'|'open'|'share'){
  if(running.current||!document||!journey.enabled)return;running.current=true;setLastAction(kind);setBusy(true);setError('');
  try{if(kind==='generate'){await journey.issueFile();}else{const file=journey.file.data;if(!file||!service.materialize)throw new Error('Original PDF unavailable');const result=await service.materialize(file);if(active.current){setUri(result.uri);await service[kind](result.uri);}}}
  catch{if(active.current)setError(kind==='generate'?'No pudimos generar el PDF. Reintenta con el mismo documento.':kind==='open'?'No se pudo abrir el PDF. Verifica que haya un visor disponible.':'No se pudo compartir el PDF.');}
  finally{running.current=false;if(active.current)setBusy(false);}
 }
 return <View style={s.screen} testID="real-invoice-screen"><GuestChildHeader title="Documento informativo" backAccessibilityLabel="Volver a inicio" onBack={()=>router.dismissTo('/account')}/><ScrollView contentContainerStyle={s.content}>
  {!journey.enabled?<Text style={s.error}>Inicia sesión y selecciona una estancia.</Text>:journey.state.isLoading||journey.document.isFetching?<Text style={s.body}>Consultando documento…</Text>:document?<>
   <View style={s.card}><Text style={s.heading}>{document.snapshot.disclaimer}</Text><Text style={s.body}>Referencia · {document.id}</Text><Text style={s.body}>{new Date(document.issuedAt).toLocaleString('es-GT',{timeZone:document.snapshot.stay.timezone})}</Text></View>
   <FinancialSummary value={document.snapshot}/>
   {journey.file.isLoading?<Text>Consultando PDF original…</Text>:journey.file.isError?<Text style={s.error}>No se pudo recuperar el PDF original.</Text>:journey.file.data?<><Button disabled={busy} onPress={()=>void action('open')} testID="journey-open-pdf">Visualizar documento</Button><Button disabled={busy} onPress={()=>void action('share')} testID="journey-share-pdf">Compartir</Button></>:journey.file.isSuccess&&eligible?<Button disabled={busy||journey.summary.isFetching} onPress={()=>void action('generate')} testID="journey-generate-pdf">Generar documento</Button>:null}

  </>:journey.summary.isSuccess?<FinancialSummary value={journey.summary.data} provisional/>:<Text style={s.error}>{errorText(journey.summary.error??journey.state.error)}</Text>}
  {error&&(lastAction!=='generate'||!journey.file.data)?<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>:null}
  {journey.document.isError&&journey.state.data?.stay.status==='CHECKED_OUT'?<Text style={s.error}>El documento definitivo no está disponible. No se generará uno desde datos locales.</Text>:null}
 </ScrollView></View>;
}

/// <reference types="node" />
import {mapDocumentFile} from '@/modules/checkout/domain/DocumentFile';
/** Optional real TCP integration. Run with the isolated Backend bridge + real Next BFF; never against hotel data. */
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import {randomUUID,createHash} from 'node:crypto';
import {NativeGuestClient,type RefreshStore} from '@/modules/guest-auth/data/http/NativeGuestClient';
import {FetchTransport} from '@/data/remote/http/FetchTransport';
import {NetworkError} from '@/data/remote/http/HttpError';
import type {JsonValue,HttpClient} from '@/data/remote/http/HttpClient';
import {HttpStayJourneyService} from '@/modules/checkout/data/http/HttpStayJourneyService';
import {mapJourneyState,mapJourneySummary,mapJourneyDocument,mapSimulatedReceipt} from '@/modules/checkout/data/mappers/mapStayJourney';
import {journeyInvoice} from '@/modules/checkout/domain/journeyInvoice';
import {buildInvoicePdfHtml} from '@/modules/checkout/domain/buildInvoicePdfHtml';
const fixturePath=process.env.PMS_JOURNEY_E2E_FIXTURE;
const scenario=fixturePath?it:it.skip;
scenario('Native Guest → real HTTP/PostgreSQL → real Web BFF → immutable document and restart',async()=>{
 const nodeFetch=runInThisContext('globalThis.fetch') as typeof fetch,previousFetch=globalThis.fetch;globalThis.fetch=nodeFetch;
 const resultPath=process.env.PMS_JOURNEY_E2E_RESULT!;
 const fixture=JSON.parse(readFileSync(fixturePath!,'utf8')) as {accountId:string;guestEmail:string;guestPassword:string;foreignEmail:string;staffToken:string;opsToken:string;propertyId:string;reservationId:string;reservationStayId:string};
 const origin='http://127.0.0.1:28089',web='http://localhost:3301',context={reservationId:fixture.reservationId,reservationStayId:fixture.reservationStayId};
 let saved:string|null=null,discard=false;const paymentBodies:string[]=[];
 const store:RefreshStore={read:async()=>saved,write:async v=>{saved=v;},clear:async()=>{saved=null;}};
 const raw=new FetchTransport();const transport:HttpClient={async request<T extends JsonValue>(input:RequestInfo|URL,init?:RequestInit):Promise<T>{const value=await raw.request<T>(input,init);if(String(input).endsWith('/journey/payments')){paymentBodies.push(String(init?.body));if(discard){discard=false;throw new NetworkError('Discarded response after commit');}}return value;}};
 const native=new NativeGuestClient(transport,store,()=>origin),service=new HttpStayJourneyService(native);
 const key=()=>randomUUID();
 const backendStay=`/api/v1/guest-auth/account/reservations/${context.reservationId}/stays/${context.reservationStayId}`;
 const bff=`/api/staff/stay-journey/${context.reservationId}/${context.reservationStayId}`;
 async function staff(path:string,body?:object,operator=false,method='POST'){
  const response=await nodeFetch(web+path,{method:body?method:'GET',headers:{cookie:`pms_staff_access=${operator?fixture.opsToken:fixture.staffToken}`,origin:web,'content-type':'application/json','idempotency-key':key()},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json() as Record<string,unknown>};
 }
 async function state(){return mapJourneyState(await service.read(context,'state'),context);}
 async function summary(){return mapJourneySummary(await service.read(context,'summary'),context,fixture.propertyId);}
 async function travel(action:'check-in'|'check-out'){const value=(await state()).stay;return staff(`/api/staff/reservations/${context.reservationId}/stays/${context.reservationStayId}/${action}?propertyId=${fixture.propertyId}`,{expectedStatus:value.status,expectedUpdatedAt:value.updatedAt,expectedRoomId:value.roomId});}
 function result(pass:boolean){writeFileSync(resultPath+'.tmp',JSON.stringify({pass}));renameSync(resultPath+'.tmp',resultPath);}
 try{
  expect((await native.login({email:fixture.guestEmail,password:fixture.guestPassword})).accountId).toBe(fixture.accountId);
  const initial=await state();expect(initial.stay.status).toBe('RESERVED');
  await service.request(context,{kind:'CHECK_IN',expectedUpdatedAt:initial.stay.updatedAt},key());
  const inbox=await staff(bff+`/requests?propertyId=${fixture.propertyId}`);expect(inbox.status).toBe(200);expect(inbox.body).toEqual(expect.arrayContaining([expect.objectContaining({kind:'CHECK_IN',status:'OPEN'})]));
  expect((await travel('check-in')).status).toBe(200);expect((await state()).stay.status).toBe('IN_HOUSE');
  const inside=await state();
  const menu=await native.request<{id:string;code:string}[]>(backendStay+'/room-service-menu');const coffee=menu.find(p=>p.code==='coffee')!;
  const day=new Date(inside.stay.arrival+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+1);
  const order=await native.request<{id:string;updatedAt:string;totalMinor:number}>(backendStay+'/room-service-orders',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key()},body:JSON.stringify({serviceDate:day.toISOString().slice(0,10),deliveryTime:'09:00',items:[{productId:coffee.id,quantity:2,mealPeriod:'BEVERAGES'}],notes:''})});
  await service.request(context,{kind:'CHECK_OUT',expectedUpdatedAt:inside.stay.updatedAt},key());
  expect((await travel('check-out')).status).toBe(409);
  await expect(native.request(backendStay+'/room-service-orders',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key()},body:JSON.stringify({serviceDate:day.toISOString().slice(0,10),deliveryTime:'09:00',items:[{productId:coffee.id,quantity:2,mealPeriod:'BEVERAGES'}],notes:''})})).rejects.toMatchObject({status:409});
  expect(mapSimulatedReceipt(await service.pay(context,{amount:'1.00',currency:'GTQ',instrumentToken:'demo_card_declined'},key())).movementId).toBeNull();
  const rejected=await staff(bff+`/payments?propertyId=${fixture.propertyId}`,{amount:'1.00',currency:'GTQ',instrumentToken:'demo_gateway_error'});expect(rejected.body.result).toBe('ERROR');expect(rejected.body.movementId).toBeNull();
  const payKey=key(),full={amount:'100.00',currency:'GTQ' as const,instrumentToken:'demo_visa_approved'};discard=true;
  await expect(service.pay(context,full,payKey)).rejects.toBeInstanceOf(NetworkError);
  expect(mapSimulatedReceipt(await service.pay(context,full,payKey)).result).toBe('APPROVED');
  expect((await summary()).balance).toBe('0.00');expect((await summary()).pendingOrders).toBe(1);
  const blocked=await travel('check-out');expect(blocked.status).toBe(409);expect(blocked.body.code).toBe('PENDING_BILLABLE_ORDERS');
  const transition=`/api/staff/room-service/orders/${order.id}/status?propertyId=${fixture.propertyId}`;
  const started=await staff(transition,{expectedUpdatedAt:order.updatedAt,targetStatus:'IN_PROGRESS'},true,'PUT');expect(started.status).toBe(200);
  const done=await staff(transition,{expectedUpdatedAt:started.body.updatedAt,targetStatus:'DONE'},true,'PUT');expect(done.status).toBe(200);
  expect((await staff(transition,{expectedUpdatedAt:started.body.updatedAt,targetStatus:'DONE'},true,'PUT')).status).toBe(200);
  const charged=await summary();expect(charged.movements.filter(m=>m.kind==='CHARGE')).toHaveLength(2);expect(charged.pendingOrders).toBe(0);
  expect((await staff(bff+`/summary?propertyId=${fixture.propertyId}`)).body).toEqual(charged);
  expect(mapSimulatedReceipt(await service.pay(context,{amount:'10.00',currency:'GTQ',instrumentToken:'demo_visa_approved'},key())).result).toBe('APPROVED');
  const partial=await summary();expect((await staff(bff+`/summary?propertyId=${fixture.propertyId}`)).body).toEqual(partial);
  const paid=await staff(bff+`/payments?propertyId=${fixture.propertyId}`,{amount:partial.balance,currency:'GTQ',instrumentToken:'demo_mastercard_approved'});expect(paid.status).toBe(200);expect(paid.body.result).toBe('APPROVED');expect((await summary()).balance).toBe('0.00');
  expect((await travel('check-out')).status).toBe(200);expect((await state()).stay.status).toBe('CHECKED_OUT');
  const document=mapJourneyDocument(await service.read(context,'document'),context,fixture.propertyId);
  const webDocument=await staff(bff+`/document?propertyId=${fixture.propertyId}`);expect(webDocument.status).toBe(200);expect(webDocument.body).toEqual(document);
  const [nativeIssued,webIssued]=await Promise.all([service.issueFile(context),staff(bff+`/document-file?propertyId=${fixture.propertyId}`,{})]);
  expect(webIssued.status).toBe(200);const original=mapDocumentFile(nativeIssued,document.id);expect(webIssued.body).toEqual(original);
  expect(createHash('sha256').update(Buffer.from(original.pdfBase64,'base64')).digest('hex')).toBe(original.sha256);
  expect(mapDocumentFile(await service.read(context,'document-file'),document.id)).toEqual(original);
  const restarted=new NativeGuestClient(new FetchTransport(),store,()=>origin);expect((await restarted.restore())?.accountId).toBe(fixture.accountId);
  const recovered=mapJourneyDocument(await new HttpStayJourneyService(restarted).read(context,'document'),context,fixture.propertyId);expect(recovered).toEqual(document);expect(mapDocumentFile(await new HttpStayJourneyService(restarted).read(context,'document-file'),document.id)).toEqual(original);
  const html=buildInvoicePdfHtml(journeyInvoice(recovered));expect(html).toContain(document.id);expect(html).toContain('Documento informativo — sin validez fiscal');expect(html).toContain(`Pagos: Q${document.snapshot.payments}`);expect(html).toContain('Saldo: Q0.00');
  let foreignStore:string|null=null;const foreign=new NativeGuestClient(new FetchTransport(),{read:async()=>foreignStore,write:async v=>{foreignStore=v;},clear:async()=>{foreignStore=null;}},()=>origin);
  await foreign.login({email:fixture.foreignEmail,password:fixture.guestPassword});await expect(new HttpStayJourneyService(foreign).read(context,'summary')).rejects.toMatchObject({status:404});await foreign.logout();
  expect(paymentBodies.every(body=>Object.keys(JSON.parse(body)).sort().join(',')==='amount,currency,instrumentToken')).toBe(true);expect(paymentBodies.join('')).not.toMatch(/4242424242424242|cvv|holder|expiry/);
  await restarted.logout();await expect(new HttpStayJourneyService(restarted).read(context,'document')).rejects.toMatchObject({status:401});result(true);
 }catch(error){result(false);throw error;}finally{globalThis.fetch=previousFetch;}
},150000);

import {DomainMappingError} from '@/domain/errors/DomainMappingError';
import type {ActiveReservationContext} from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import type {JourneyState,JourneyDocument,JourneyRequest,JourneySummary,SimulatedPaymentReceipt} from '../../domain/StayJourney';
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
function invalid():never{throw new DomainMappingError('stay-journey');}
function obj(v:unknown):Record<string,unknown>{return v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:invalid();}
function text(v:unknown):string{return typeof v==='string'&&v.trim()?v:invalid();}
function id(v:unknown):string{const s=text(v);return uuid.test(s)?s:invalid();}
function time(v:unknown):string{const s=text(v);return Number.isFinite(Date.parse(s))?s:invalid();}
function date(v:unknown):string{const s=text(v);return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().startsWith(s)?s:invalid();}
function money(v:unknown):string{const s=text(v);return /^-?\d{1,17}\.\d{2}$/.test(s)?s:invalid();}
function count(v:unknown):number{return typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:invalid();}
function array(v:unknown):unknown[]{return Array.isArray(v)?v:invalid();}
function stay(v:unknown,c:ActiveReservationContext,property?:string):JourneySummary['stay']{
 const s=obj(v);if(s.reservationId!==c.reservationId||s.stayId!==c.reservationStayId||(property&&s.propertyId!==property)||!['RESERVED','IN_HOUSE','CHECKED_OUT','CANCELLED','NO_SHOW'].includes(String(s.status)))invalid();
 const timezone=text(s.timezone);try{new Intl.DateTimeFormat('es-GT',{timeZone:timezone}).format(new Date());}catch{invalid();}
 return {propertyId:id(s.propertyId),reservationId:id(s.reservationId),stayId:id(s.stayId),confirmationCode:text(s.confirmationCode),status:text(s.status),updatedAt:time(s.updatedAt),roomId:s.roomId===null?null:id(s.roomId),arrival:date(s.arrival),departure:date(s.departure),timezone};
}
export function mapJourneyRequests(v:unknown):JourneyRequest[]{return array(v).map(value=>{const r=obj(value);if(!['CHECK_IN','CHECK_OUT'].includes(String(r.kind))||!['OPEN','DONE'].includes(String(r.status)))invalid();return{id:id(r.id),kind:r.kind as JourneyRequest['kind'],status:r.status as JourneyRequest['status'],createdAt:time(r.createdAt),completedAt:r.completedAt===null?null:time(r.completedAt)};});}
export function mapJourneyState(v:unknown,c:ActiveReservationContext):JourneyState{const r=obj(v);return{stay:stay(r.stay,c),currentDate:date(r.currentDate),requests:mapJourneyRequests(r.requests)};}
export function mapJourneySummary(v:unknown,c:ActiveReservationContext,property:string):JourneySummary{
 const r=obj(v);if(r.currency!=='GTQ'||typeof r.verifiable!=='boolean'||r.disclaimer!=='Documento informativo — sin validez fiscal')invalid();
 return{stay:stay(r.stay,c,property),folioId:id(r.folioId),currency:'GTQ',balance:money(r.balance),charges:money(r.charges),payments:money(r.payments),adjustments:money(r.adjustments),verifiable:r.verifiable,pendingOrders:count(r.pendingOrders),unpostedOrders:count(r.unpostedOrders),documentId:r.documentId===null?null:id(r.documentId),disclaimer:r.disclaimer,
  requests:mapJourneyRequests(r.requests),movements:array(r.movements).map(value=>{const m=obj(value);if(!['CHARGE','PAYMENT','ADJUSTMENT'].includes(String(m.kind)))invalid();return{id:id(m.id),kind:m.kind as JourneySummary['movements'][number]['kind'],description:text(m.description),amount:money(m.amount),createdAt:time(m.createdAt)};})};
}
export function mapJourneyDocument(v:unknown,c:ActiveReservationContext,property:string):JourneyDocument{const r=obj(v),snapshot=mapJourneySummary(r.snapshot,c,property);if(snapshot.stay.status!=='CHECKED_OUT'||snapshot.balance!=='0.00'||!snapshot.verifiable)invalid();return{id:id(r.id),issuedAt:time(r.issuedAt),snapshot};}
export function mapSimulatedReceipt(v:unknown):SimulatedPaymentReceipt{
 const r=obj(v);if(!['APPROVED','DECLINED','ERROR'].includes(String(r.result))||r.currency!=='GTQ'||(r.result==='APPROVED')!==(r.movementId!==null))invalid();
 return{operationId:id(r.operationId),folioId:id(r.folioId),result:r.result as SimulatedPaymentReceipt['result'],amount:money(r.amount),currency:'GTQ',movementId:r.movementId===null?null:id(r.movementId),completedAt:time(r.completedAt)};
}

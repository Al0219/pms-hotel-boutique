import {nativeGuestClient,NativeGuestClient} from '@/modules/guest-auth/data/http/NativeGuestClient';
import type {ActiveReservationContext} from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import type {StayJourneyDto,JourneyPaymentDto,JourneyRequestDto} from '../dto/StayJourneyDto';
import type {SimulatedPaymentInput} from '../../domain/StayJourney';
function base(c:ActiveReservationContext){return `/api/v1/guest-auth/account/reservations/${encodeURIComponent(c.reservationId)}/stays/${encodeURIComponent(c.reservationStayId)}/journey`;}
export class HttpStayJourneyService{
 constructor(private readonly client:NativeGuestClient=nativeGuestClient){}
 read(c:ActiveReservationContext,resource:'state'|'summary'|'document'|'document-file'){return this.client.request<StayJourneyDto>(`${base(c)}/${resource}`);}
 issueFile(c:ActiveReservationContext){return this.client.request<StayJourneyDto>(`${base(c)}/document-file`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});}
 request(c:ActiveReservationContext,input:JourneyRequestDto,key:string){const dto:JourneyRequestDto={kind:input.kind,expectedUpdatedAt:input.expectedUpdatedAt};return this.client.request<StayJourneyDto>(`${base(c)}/requests`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(dto)});}
 pay(c:ActiveReservationContext,input:SimulatedPaymentInput,key:string){const dto:JourneyPaymentDto={amount:input.amount,currency:input.currency,instrumentToken:input.instrumentToken};return this.client.request<StayJourneyDto>(`${base(c)}/payments`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(dto)});}
}
export const stayJourneyService=new HttpStayJourneyService();

import * as SecureStore from 'expo-secure-store';
import {requireApiBaseUrl} from '@/config/environment';
import type {ActiveReservationContext} from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import type {JourneyPaymentDto,JourneyRequestDto} from '../dto/StayJourneyDto';
import {simulationTokens,minor} from '../../domain/syntheticPayment';
export type JourneyAttempt={key:string;kind:'payment';input:JourneyPaymentDto}|{key:string;kind:'request';input:JourneyRequestDto};
export interface AttemptScope{accountId:string;context:ActiveReservationContext}
function hash(s:string){let v=2166136261;for(let i=0;i<s.length;i++)v=Math.imul(v^s.charCodeAt(i),16777619);return(v>>>0).toString(16);}
function storageKey(s:AttemptScope,kind:JourneyAttempt['kind']){return `pms.journey.${hash(requireApiBaseUrl())}.${s.accountId}.${s.context.reservationId}.${s.context.reservationStayId}.${kind}`;}
function clean(value:unknown,kind:JourneyAttempt['kind']):JourneyAttempt{
 if(!value||typeof value!=='object')throw new Error('Invalid saved operation');const r=value as Record<string,unknown>;
 if(typeof r.key!=='string'||!/^[-A-Za-z0-9]{16,100}$/.test(r.key)||r.kind!==kind||!r.input||typeof r.input!=='object')throw new Error('Invalid saved operation');
 const input=r.input as Record<string,unknown>;
 if(kind==='payment'){
  const amount=typeof input.amount==='string'?minor(input.amount):null;
  if(typeof input.amount!=='string'||amount===null||amount<=0n||input.currency!=='GTQ'||!simulationTokens.includes(input.instrumentToken as typeof simulationTokens[number]))throw new Error('Invalid saved operation');
  return{key:r.key,kind,input:{amount:input.amount,currency:'GTQ',instrumentToken:input.instrumentToken as string}};
 }
 if(!['CHECK_IN','CHECK_OUT'].includes(String(input.kind))||typeof input.expectedUpdatedAt!=='string'||!Number.isFinite(Date.parse(input.expectedUpdatedAt)))throw new Error('Invalid saved operation');
 return{key:r.key,kind,input:{kind:input.kind as JourneyRequestDto['kind'],expectedUpdatedAt:input.expectedUpdatedAt}};
}
export const journeyAttemptStore={
 async read(scope:AttemptScope,kind:JourneyAttempt['kind']):Promise<JourneyAttempt|null>{const raw=await SecureStore.getItemAsync(storageKey(scope,kind));if(!raw)return null;const r=JSON.parse(raw);if(r.backend!==requireApiBaseUrl())throw new Error('Saved operation belongs to another backend');return clean(r.attempt,kind);},
 async write(scope:AttemptScope,attempt:JourneyAttempt){await SecureStore.setItemAsync(storageKey(scope,attempt.kind),JSON.stringify({backend:requireApiBaseUrl(),attempt:clean(attempt,attempt.kind)}));},
 async clear(scope:AttemptScope,kind:JourneyAttempt['kind']){await SecureStore.deleteItemAsync(storageKey(scope,kind));},
};
export function journeyOperationKey(){return `journey-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;}

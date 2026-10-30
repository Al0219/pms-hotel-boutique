import * as SecureStore from 'expo-secure-store';
import {requireApiBaseUrl} from '@/config/environment';

import type {TransferInput} from '../../domain/Transfer';
import type {ActiveReservationContext} from '@/modules/guest-auth/domain/models/ActiveReservationContext';
function hash(value:string){let n=2166136261;for(let i=0;i<value.length;i++)n=Math.imul(n^value.charCodeAt(i),16777619);return(n>>>0).toString(16);}
function identity(account:string,context:ActiveReservationContext,input:TransferInput){const signature=JSON.stringify([requireApiBaseUrl(),account,context.reservationId,context.reservationStayId,input]);return{signature,key:`pms.transfer.${hash(signature)}`};}
/** Only a synthetic operation key and transfer intent; never transport credentials. */
export const transferAttempts={
 async obtain(account:string,c:ActiveReservationContext,input:TransferInput){const {key,signature}=identity(account,c,input);const saved=await SecureStore.getItemAsync(key);if(saved){const row=JSON.parse(saved);if(row.signature!==signature||typeof row.operationKey!=='string'||!/^[-A-Za-z0-9]{16,100}$/.test(row.operationKey))throw new Error('Invalid saved transfer attempt');return row.operationKey as string;}const operationKey=`transfer-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;await SecureStore.setItemAsync(key,JSON.stringify({signature,operationKey}));return operationKey;},
 async clear(account:string,c:ActiveReservationContext,input:TransferInput){await SecureStore.deleteItemAsync(identity(account,c,input).key);},
};

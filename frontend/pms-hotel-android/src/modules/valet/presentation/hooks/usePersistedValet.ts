import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {useMutation,useQuery,useQueryClient,type QueryKey} from '@tanstack/react-query';
import {environment} from '@/config/environment';
import {useGuestAuthSession} from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import {useActiveReservationContext} from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import {useGuestServiceRequests} from '@/modules/service-requests';
import {persistedValetService as service} from '../../data/http/HttpPersistedValetService';
import {mapPersistedValetRequest,mapPersistedVehicle,mapSavedVehicle} from '../../data/mappers/mapPersistedValet';
import type {PersistedVehicle,VehicleRegistration,ValetSchedule,PersistedValetRequest,SavedVehicle} from '../../domain/PersistedValet';
function useContext(){const {session,sessionExpired}=useGuestAuthSession();const {activeReservationContext:context}=useActiveReservationContext();return {context,enabled:!environment.useMockApi&&!!session&&!sessionExpired&&!!context,scope:[session?.accountId,context?.reservationId,context?.reservationStayId]};}
export function useValetRequests(){const {context,enabled,scope}=useContext();return useGuestServiceRequests({queryKey:['guest-valet',...scope],enabled,queryFn:async()=>{if(!context)throw new Error('Select stay');const rows=await service.orders(context);if(!Array.isArray(rows))throw new Error('Invalid valet history');return rows.map(row=>mapPersistedValetRequest(row,context));}});}
/** Custody may change without a ServiceRequest (VAL-05), so its cadence is independent. */
function useValetCustodyQuery<T>({queryKey,enabled,queryFn}:{queryKey:QueryKey;enabled:boolean;queryFn:()=>Promise<T[]>}){
 const [focused,setFocused]=useState(false);const [foreground,setForeground]=useState(()=>AppState.currentState==='active');
 useEffect(()=>{if(environment.useMockApi)return;const listener=AppState.addEventListener('change',state=>setForeground(state==='active'));return()=>listener.remove();},[]);
 const query=useQuery({queryKey,enabled,queryFn,retry:false,refetchIntervalInBackground:false,refetchInterval:current=>enabled&&focused&&foreground&&current.state.fetchStatus==='idle'?10000:false});
 const {refetch}=query;useFocusEffect(useCallback(()=>{setFocused(true);if(enabled&&foreground)void refetch({cancelRefetch:false});return()=>setFocused(false);},[enabled,foreground,refetch]));return query;
}
export function useValetVehicles(){const {context,enabled,scope}=useContext();return useValetCustodyQuery({queryKey:['guest-valet-vehicles',...scope],enabled,queryFn:async()=>{if(!context)throw new Error('Select stay');const rows=await service.vehicles(context);if(!Array.isArray(rows))throw new Error('Invalid vehicles');return rows.map(row=>mapPersistedVehicle(row,context));}});}
export function useSavedValetVehicles(){const {enabled,scope}=useContext();return useValetCustodyQuery({queryKey:['guest-valet-saved',scope[0]],enabled,queryFn:async()=>{const rows=await service.savedVehicles();if(!Array.isArray(rows))throw new Error('Invalid saved vehicles');return rows.map(mapSavedVehicle);}});}
export function useValetMutations(){
 const {context,scope}=useContext();const queries=useQueryClient();const intent=useRef<{signature:string;key:string}|null>(null);const registration=useRef<{signature:string;key:string}|null>(null);const association=useRef<{signature:string;key:string}|null>(null);
 const refresh=async()=>{await Promise.all([queries.invalidateQueries({queryKey:['guest-valet',...scope]}),queries.invalidateQueries({queryKey:['guest-valet-vehicles',...scope]}),queries.invalidateQueries({queryKey:['guest-valet-saved',scope[0]]})]);};
 function key(ref:typeof intent,input:unknown){const signature=JSON.stringify([scope,input]);if(ref.current?.signature!==signature)ref.current={signature,key:`valet-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`};return ref.current.key;}
 const vehicle=useMutation({retry:false,mutationFn:async({input,editing}:{input:VehicleRegistration;editing?:PersistedVehicle})=>{if(!context)throw new Error('Select stay');
  const {location,...details}=input;const dto=editing?await service.editVehicle(context,editing.id,details,editing.updatedAt):await service.register(context,{...details,location},key(registration,input));const saved=mapPersistedVehicle(dto,context);if(editing&&saved.id!==editing.id)throw new Error('Unexpected vehicle');return saved;
 },onSettled:refresh});
 const associate=useMutation({retry:false,mutationFn:async({saved,location}:{saved:SavedVehicle;location:'PARKED'|'WITH_GUEST'})=>{if(!context)throw new Error('Select stay');const input={savedVehicleId:saved.id,expectedVehicleUpdatedAt:saved.updatedAt,location};const row=mapPersistedVehicle(await service.associate(context,input,key(association,input)),context);if(row.savedVehicleId!==saved.id)throw new Error('Unexpected vehicle');return row;},onSettled:refresh});
 const order=useMutation({retry:false,mutationFn:async({vehicleId,input,editing}:{vehicleId:string;input:ValetSchedule;editing?:PersistedValetRequest})=>{if(!context)throw new Error('Select stay');const dto=editing?await service.edit(context,editing.id,input,editing.updatedAt):await service.create(context,vehicleId,input,key(intent,{vehicleId,...input}));const saved=mapPersistedValetRequest(dto,context);if(editing&&saved.id!==editing.id)throw new Error('Unexpected request');return saved;},onSettled:refresh});
 const cancel=useMutation({retry:false,mutationFn:async(row:PersistedValetRequest)=>{if(!context)throw new Error('Select stay');const saved=mapPersistedValetRequest(await service.cancel(context,row.id,row.updatedAt),context);if(saved.id!==row.id||saved.status!=='CANCELLED')throw new Error('Unexpected cancellation');return saved;},onSettled:refresh});
 return {vehicle,associate,order,cancel,resetIntent:()=>{intent.current=null;registration.current=null;association.current=null;}};
}

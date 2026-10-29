import {useEffect,useRef} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {readValet,readVehicles,transitionValet,returnValet,releaseValet} from '../service/persisted-valet.service';
import {mapPersistedValet,mapPersistedVehicles} from '../mappers/persisted-valet.mapper';
import type {ValetTarget} from '../model/persisted-valet';
export function usePersistedValet(property:string,session:string){
 const queryKey=['staff-valet',session,property];const client=useQueryClient();const pending=useRef<AbortController|null>(null);useEffect(()=>()=>pending.current?.abort(),[property,session]);
 const query=useQuery({queryKey,retry:false,refetchInterval:10000,refetchIntervalInBackground:false,queryFn:async({signal})=>({orders:mapPersistedValet(await readValet(property,signal),property),vehicles:mapPersistedVehicles(await readVehicles(property,signal),property)})});
 const mutation=useMutation({retry:false,mutationFn:async(input:{kind:'STATUS';id:string;expectedUpdatedAt:string;targetStatus:ValetTarget}|{kind:'RETURN'|'RELEASE';id:string;expectedUpdatedAt:string})=>{
 const controller=new AbortController();pending.current=controller;try{
  if(input.kind==='STATUS'){const dto=await transitionValet(property,input.id,input.expectedUpdatedAt,input.targetStatus,controller.signal);const row=mapPersistedValet([dto],property)[0];if(row.id!==input.id||row.status!==input.targetStatus)throw new Error('Unexpected transition');}
  else {const dto=await (input.kind==='RETURN'?returnValet:releaseValet)(property,input.id,input.expectedUpdatedAt,controller.signal);const row=mapPersistedVehicles([dto],property)[0];if(row.id!==input.id||row.location!==(input.kind==='RETURN'?'PARKED':'WITH_GUEST'))throw new Error('Unexpected custody');}
  if(controller.signal.aborted)throw new Error('Context changed');
 }finally{if(pending.current===controller)pending.current=null;}
 },onSettled:async()=>{await client.invalidateQueries({queryKey,exact:true});}});return {query,mutation};
}

import {useEffect,useRef} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {readAmenitiesOrders,transitionAmenitiesOrder} from '../service/amenities.service';
import {mapAmenitiesOrders} from '../mappers/amenities.mapper';
import type {AmenitiesTarget} from '../model/amenities-order';
export function useAmenitiesOrders(propertyId:string,sessionId:string) {
 const queryKey=['staff-amenities',sessionId,propertyId];const queries=useQueryClient();const pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>pending.current?.abort(),[propertyId,sessionId]);
 const query=useQuery({queryKey,retry:false,queryFn:async({signal})=>mapAmenitiesOrders(await readAmenitiesOrders(propertyId,signal),propertyId)});
 const mutation=useMutation({retry:false,mutationFn:async(input:{id:string;expectedUpdatedAt:string;targetStatus:AmenitiesTarget})=>{
  const controller=new AbortController();pending.current=controller;
  try {const dto=await transitionAmenitiesOrder(propertyId,input.id,input.expectedUpdatedAt,input.targetStatus,controller.signal);
   if(controller.signal.aborted)throw new Error('Context changed');const row=mapAmenitiesOrders([dto],propertyId)[0];if(row.id!==input.id||row.status!==input.targetStatus)throw new Error('Unexpected transition');return row;
  }finally{if(pending.current===controller)pending.current=null;}
 },onSettled:async()=>{await queries.invalidateQueries({queryKey,exact:true});}});
 return {query,mutation};
}

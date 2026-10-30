import {useEffect,useRef} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {readRoomServiceOrders,transitionRoomServiceOrder} from '../service/room-service.service';
import {mapRoomServiceOrders} from '../mappers/room-service.mapper';
import type {RoomServiceTarget} from '../model/room-service-order';
export function useRoomServiceOrders(propertyId:string,sessionId:string) {
 const queryKey=['staff-room-service',sessionId,propertyId];const queries=useQueryClient();const pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>pending.current?.abort(),[propertyId,sessionId]);
 const query=useQuery({queryKey,retry:false,queryFn:async({signal})=>mapRoomServiceOrders(await readRoomServiceOrders(propertyId,signal),propertyId)});
 const mutation=useMutation({retry:false,mutationFn:async(input:{id:string;expectedUpdatedAt:string;targetStatus:RoomServiceTarget})=>{
  const controller=new AbortController();pending.current=controller;
  try {const dto=await transitionRoomServiceOrder(propertyId,input.id,input.expectedUpdatedAt,input.targetStatus,controller.signal);
   if(controller.signal.aborted)throw new Error('Context changed');const row=mapRoomServiceOrders([dto],propertyId)[0];if(row.id!==input.id||row.status!==input.targetStatus)throw new Error('Unexpected transition');return row;
  }finally{if(pending.current===controller)pending.current=null;}
 },onSettled:async()=>{await Promise.all([queries.invalidateQueries({queryKey,exact:true}),queries.invalidateQueries({queryKey:['staff-folio']}),queries.invalidateQueries({queryKey:['staff-stay-journey']})]);}});
 return {query,mutation};
}

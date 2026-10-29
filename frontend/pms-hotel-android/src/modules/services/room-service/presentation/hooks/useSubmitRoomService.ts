import { useRef } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { environment } from '@/config/environment';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { roomServiceService } from '../../data/services/roomServiceServices';
import { mapRoomServiceOrder } from '../../data/mappers/mapRoomServiceDto';
import type { RoomServiceService } from '../../data/services/RoomServiceService';
import type { RoomServiceOrderDto } from '../../data/dtos/RoomServiceDto';
import type { RoomServiceRequest } from '../../domain/models/RoomServiceRequest';
function useRealSubmitRoomService(service: RoomServiceService = roomServiceService, editing?: {id:string;updatedAt:string}) {
  const {activeReservationContext:context}=useActiveReservationContext();const queries=useQueryClient();
  const intent=useRef<{signature:string;key:string}|null>(null);
  return useMutation({retry:false, mutationFn:async(input:RoomServiceRequest)=>{
    if(environment.useMockApi)return service.submitRequest(input);
    if(!context)throw new Error('Select a stay');
    let dto:RoomServiceOrderDto;
    if(editing) { if(!service.updateOrder)throw new Error('Real update unavailable');dto=await service.updateOrder(input,context,editing.id,editing.updatedAt); }
    else { const signature=JSON.stringify([context,input]);if(intent.current?.signature!==signature)intent.current={signature,key:`rs-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`};
      dto=await service.submitRequest(input,context,intent.current.key) as RoomServiceOrderDto; }
    const saved=mapRoomServiceOrder(dto,context);if(editing&&saved.id!==editing.id)throw new Error('Unexpected order identity');return saved;
  },onSuccess:async()=>{if(!environment.useMockApi)await queries.invalidateQueries({queryKey:['guest-room-service']});},
  onError:async()=>{if(!environment.useMockApi&&editing)await queries.invalidateQueries({queryKey:['guest-room-service']});}});
}

function useMockSubmitRoomService(service:RoomServiceService=roomServiceService) {
 return useMutation({mutationFn:(input:RoomServiceRequest)=>service.submitRequest(input),retry:false});
}
export function useSubmitRoomService(service?:RoomServiceService,editing?:{id:string;updatedAt:string}) {
 const useSubmit=environment.useMockApi?useMockSubmitRoomService:useRealSubmitRoomService;
 return useSubmit(service,editing);
}

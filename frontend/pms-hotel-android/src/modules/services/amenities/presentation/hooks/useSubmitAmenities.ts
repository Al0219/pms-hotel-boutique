import { useRef } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { environment } from '@/config/environment';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { amenitiesService } from '../../data/services/amenitiesServices';
import { mapAmenitiesRequest } from '../../data/mappers/mapAmenitiesDto';
import type { AmenitiesService } from '../../data/services/AmenitiesService';
import type { AmenitiesRequestDto } from '../../data/dtos/AmenitiesDto';
import type { AmenitiesRequest } from '../../domain/AmenitiesRequest';
function useRealSubmitAmenities(service: AmenitiesService = amenitiesService, editing?: {id:string;updatedAt:string}) {
  const {activeReservationContext:context}=useActiveReservationContext();const queries=useQueryClient();
  const intent=useRef<{signature:string;key:string}|null>(null);
  return useMutation({retry:false, mutationFn:async(input:AmenitiesRequest)=>{
    if(environment.useMockApi)return service.submitRequest(input);
    if(!context)throw new Error('Select a stay');
    let dto:AmenitiesRequestDto;
    if(editing) { if(!service.updateRequest)throw new Error('Real update unavailable');dto=await service.updateRequest(input,context,editing.id,editing.updatedAt); }
    else { const signature=JSON.stringify([context,input]);if(intent.current?.signature!==signature)intent.current={signature,key:`amenities-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`};
      dto=await service.submitRequest(input,context,intent.current.key) as AmenitiesRequestDto; }
    const saved=mapAmenitiesRequest(dto,context);if(editing&&saved.id!==editing.id)throw new Error('Unexpected order identity');return saved;
  },onSuccess:async()=>{if(!environment.useMockApi)await queries.invalidateQueries({queryKey:['guest-amenities']});},
  onError:async()=>{if(!environment.useMockApi&&editing)await queries.invalidateQueries({queryKey:['guest-amenities']});}});
}

function useMockSubmitAmenities(service:AmenitiesService=amenitiesService) {
 return useMutation({mutationFn:(input:AmenitiesRequest)=>service.submitRequest(input),retry:false});
}
export function useSubmitAmenities(service?:AmenitiesService,editing?:{id:string;updatedAt:string}) {
 const useSubmit=environment.useMockApi?useMockSubmitAmenities:useRealSubmitAmenities;
 return useSubmit(service,editing);
}

import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {transferAttempts} from '../../data/device/TransferAttemptStore';
import {HttpError} from '@/data/remote/http/HttpError';
import {environment} from '@/config/environment';
import {useGuestAuthSession} from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import {useActiveReservationContext} from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import {useGuestServiceRequests} from '@/modules/service-requests/presentation/useGuestServiceRequests';
import {transferService as service} from '../../data/http/HttpTransferService';
import {mapTransfer,mapTransferPlace,mapTransferPrice,type TransferInput,type TransferOrder} from '../../domain/Transfer';
function useScope(){const {session,sessionExpired}=useGuestAuthSession();const {activeReservationContext:context}=useActiveReservationContext();return{context,enabled:!environment.useMockApi&&!!session&&!sessionExpired&&!!context,key:['guest-transfers',session?.accountId,context?.reservationId,context?.reservationStayId]};}
export function useTransfers(){const {context,enabled,key}=useScope();return useGuestServiceRequests({queryKey:key,enabled,queryFn:async()=>{const rows=await service.list(context!);if(!Array.isArray(rows))throw new Error('Invalid transfers');return rows.map(r=>mapTransfer(r,context!));}});}
export function useTransferPrices(){const {context,enabled,key}=useScope();return useQuery({queryKey:[...key,'prices'],enabled,retry:false,queryFn:async()=>{const rows=await service.prices(context!);if(!Array.isArray(rows))throw new Error('Invalid prices');return rows.map(mapTransferPrice);}});}
export function useTransferCatalog(){const {context,enabled,key}=useScope();return useQuery({queryKey:[...key,'catalog'],enabled,retry:false,queryFn:async()=>{const rows=await service.catalog(context!);if(!Array.isArray(rows))throw new Error('Invalid catalog');return rows.map(mapTransferPlace);}});}
export function useTransferMutations(){const {context,key}=useScope();const client=useQueryClient();const refresh=()=>Promise.all([client.invalidateQueries({queryKey:key}),client.invalidateQueries({queryKey:['guest-stay-journey',...key.slice(1)]})]);
 const save=useMutation({retry:false,mutationFn:async({input,editing}:{input:TransferInput;editing?:TransferOrder})=>{if(!context)throw new Error('Select stay');const account=key[1];if(!account)throw new Error('Active account required');const operationKey=editing?'transfer-edit-not-an-intake':await transferAttempts.obtain(account,context,input);
  try{const row=mapTransfer(await service.save(context,input,operationKey,editing),context);if(!editing)await transferAttempts.clear(account,context,input);return row;}catch(error){if(!editing&&error instanceof HttpError&&typeof error.status==='number'&&[400,403,404,409].includes(error.status))await transferAttempts.clear(account,context,input);throw error;}
 },onSettled:refresh});
 const cancel=useMutation({retry:false,mutationFn:async(row:TransferOrder)=>{if(!context)throw new Error('Select stay');return mapTransfer(await service.cancel(context,row),context);},onSettled:refresh});return{save,cancel};}

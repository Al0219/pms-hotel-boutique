import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {readTransfers,transitionTransfer} from '../service/transfers.service';
import type {TransferOrder} from '../model/transfer';
export function useTransfers(property:string,session:string){const client=useQueryClient(),queryKey=['staff-transfers',session,property];
 const query=useQuery({queryKey,retry:false,refetchInterval:10000,queryFn:({signal})=>readTransfers(property,signal)});
 const mutation=useMutation({retry:false,mutationFn:(row:TransferOrder)=>transitionTransfer(property,row),onSettled:()=>Promise.all([client.invalidateQueries({queryKey}),client.invalidateQueries({queryKey:['staff-stay-journey']}),client.invalidateQueries({queryKey:['staff-folio',session,property]})])});return{query,mutation};}

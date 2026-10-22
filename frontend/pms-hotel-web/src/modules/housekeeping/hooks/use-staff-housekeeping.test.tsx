import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
const transport=vi.hoisted(() => ({read:vi.fn(),change:vi.fn()}));
vi.mock('../service/staff-housekeeping.service',() => ({readStaffHousekeeping:transport.read,changeStaffHousekeeping:transport.change}));
import { useStaffHousekeeping } from './use-staff-housekeeping';
const propertyId='22222222-2222-4222-8222-222222222222';
const room={propertyId,roomId:'33333333-3333-4333-8333-333333333333',roomCode:'101',roomTypeId:'44444444-4444-4444-8444-444444444444',roomTypeName:'Deluxe',tracked:true,status:'CLEAN' as const,dnd:false,updatedAt:'2035-01-01T12:00:00.123456Z'};
function setup() {
  const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
  const wrapper=({children}:{children:ReactNode}) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return {client,wrapper};
}
beforeEach(() => {transport.read.mockReset().mockResolvedValue({propertyId,rooms:[room]});transport.change.mockReset();});
it('isolates sessions and rejects a response from a different hotel',async () => {
  const {client,wrapper}=setup();const first=renderHook(() => useStaffHousekeeping(propertyId,'first-session'),{wrapper});
  await waitFor(() => expect(first.result.current.query.isSuccess).toBe(true));first.unmount();
  transport.read.mockResolvedValue({propertyId:'55555555-5555-4555-8555-555555555555',rooms:[]});
  const second=renderHook(() => useStaffHousekeeping(propertyId,'second-session'),{wrapper});
  await waitFor(() => expect(second.result.current.query.isError).toBe(true));
  expect(second.result.current.query.data).toBeUndefined();
  expect(client.getQueryData(['staff-housekeeping','first-session',propertyId])).toBeDefined();
});
it('aborts an in-flight write when its workspace is unmounted',async () => {
  let finish:((value:typeof room)=>void)|undefined;let signal:AbortSignal|undefined;
  transport.change.mockImplementation((_property,_change,requestSignal) => {signal=requestSignal;return new Promise(resolve => {finish=resolve;});});
  const {wrapper}=setup();const hook=renderHook(() => useStaffHousekeeping(propertyId,'session'),{wrapper});
  await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true));
  act(() => hook.result.current.mutation.mutate({room,action:'dnd',dnd:true}));
  await waitFor(() => expect(signal).toBeDefined());hook.unmount();expect(signal?.aborted).toBe(true);
  finish?.(room);
});

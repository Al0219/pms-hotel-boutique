import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(() => ({hook:vi.fn(),session:vi.fn(),scope:vi.fn(),change:vi.fn(),refresh:vi.fn()}));
vi.mock('../hooks/use-staff-housekeeping',() => ({useStaffHousekeeping:mocks.hook}));
vi.mock('@/modules/auth',() => ({useStaffSession:mocks.session}));
vi.mock('@/modules/properties',() => ({usePropertyScope:mocks.scope}));
import { HousekeepingWorkspace, StaffHousekeepingPage } from './staff-housekeeping-page';
const propertyId='22222222-2222-4222-8222-222222222222';
const room={propertyId,roomId:'33333333-3333-4333-8333-333333333333',roomCode:'101',roomTypeId:'44444444-4444-4444-8444-444444444444',roomTypeName:'Deluxe',tracked:true,status:'CLEAN',dnd:false,updatedAt:'2035-01-01T12:00:00.123456Z'};
const untracked={...room,roomId:'55555555-5555-4555-8555-555555555555',roomCode:'102',tracked:false,status:null,dnd:null,updatedAt:null};
const props={propertyId,sessionId:'staff-1',propertyName:'Hotel propio',timezone:'America/Guatemala'};
beforeEach(() => {
  mocks.hook.mockReset();mocks.change.mockReset().mockResolvedValue(room);mocks.refresh.mockReset();
  mocks.session.mockReturnValue({id:'staff-1',permissions:['OPERATIONS_MANAGE'],memberships:[{propertyId,active:true,name:'Hotel propio',timezone:'America/Guatemala'}]});
  mocks.scope.mockReturnValue({ready:true,scope:{kind:'PROPERTY',propertyIds:[propertyId]}});
  mocks.hook.mockReturnValue({query:{data:{propertyId,rooms:[room,untracked]},isPending:false,isFetching:false,isError:false,fetchStatus:'idle',refetch:mocks.refresh},mutation:{mutateAsync:mocks.change,reset:vi.fn(),isPending:false,isError:false}});
});
it('does not mount data access without permission or a specific authorized hotel',() => {
  mocks.session.mockReturnValue({permissions:[],memberships:[]});const view=render(<StaffHousekeepingPage />);
  expect(screen.getByRole('alert')).toHaveTextContent('permiso');expect(mocks.hook).not.toHaveBeenCalled();
  mocks.session.mockReturnValue({permissions:['OPERATIONS_MANAGE'],memberships:[]});mocks.scope.mockReturnValue({ready:true,scope:{kind:'ALL_PROPERTIES',propertyIds:[propertyId]}});
  view.rerender(<StaffHousekeepingPage />);expect(screen.getByText(/Selecciona un hotel/)).toBeInTheDocument();expect(mocks.hook).not.toHaveBeenCalled();
});
it('filters real rooms and distinguishes untracked from cleaning state',() => {
  render(<HousekeepingWorkspace {...props} />);fireEvent.change(screen.getByLabelText('Estado de limpieza'),{target:{value:'UNTRACKED'}});
  const list=screen.getByRole('region',{name:'Habitaciones de Housekeeping'});
  expect(within(list).queryByRole('button',{name:/Habitación 101/})).not.toBeInTheDocument();expect(within(list).getByRole('button',{name:/Habitación 102/})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Iniciar seguimiento'})).toBeInTheDocument();
});
it('requires a reason, keeps the persisted version and prevents double submit',async () => {
  render(<HousekeepingWorkspace {...props} />);fireEvent.click(screen.getByRole('button',{name:'Volver a limpieza'}));
  const confirm=screen.getByRole('button',{name:'Guardar cambio'});expect(confirm).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Motivo (obligatorio)'),{target:{value:'Polvo en la mesa'}});
  fireEvent.click(confirm);fireEvent.click(confirm);
  await waitFor(() => expect(mocks.change).toHaveBeenCalledTimes(1));
  expect(mocks.change).toHaveBeenCalledWith({room,action:'status',toStatus:'DIRTY',reason:'Polvo en la mesa'});
});
it('can request DND without modifying cleaning status',async () => {
  render(<HousekeepingWorkspace {...props} />);fireEvent.click(screen.getByRole('button',{name:'Activar No molestar'}));fireEvent.click(screen.getByRole('button',{name:'Guardar cambio'}));
  await waitFor(() => expect(mocks.change).toHaveBeenCalledWith({room,action:'dnd',dnd:true}));
});

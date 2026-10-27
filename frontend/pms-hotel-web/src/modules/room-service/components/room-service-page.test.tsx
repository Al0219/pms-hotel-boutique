import {render,screen,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({read:vi.fn(),transition:vi.fn(),session:vi.fn(),scope:vi.fn()}));
vi.mock('../service/room-service.service',()=>({readRoomServiceOrders:mocks.read,transitionRoomServiceOrder:mocks.transition}));
vi.mock('@/modules/auth',()=>({useStaffSession:mocks.session}));
vi.mock('@/modules/properties',()=>({usePropertyScope:mocks.scope}));
import {RoomServicePage,RoomServiceWorkspace} from './room-service-page';
import {mapRoomServiceOrders} from '../mappers/room-service.mapper';
import {HttpStatusError} from '@/lib/http/errors';
const propertyId='22222222-2222-4222-8222-222222222222';
const dto={id:'33333333-3333-4333-8333-333333333333',propertyId,confirmationCode:'ROOMREAL01',roomCode:'204',serviceDate:'2030-01-02',deliveryTime:'09:00',currency:'GTQ',totalMinor:4000,notes:'Sin azúcar',status:'OPEN',updatedAt:'2030-01-01T08:00:00Z',items:[{productId:'44444444-4444-4444-8444-444444444444',productName:'Café',quantity:2,mealPeriod:'BEVERAGES',unitPriceMinor:2000,lineTotalMinor:4000}]};
function setup(content=<RoomServicePage/>){const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{gcTime:0}}});return {...render(<QueryClientProvider client={client}>{content}</QueryClientProvider>),client};}
beforeEach(()=>{mocks.read.mockReset().mockResolvedValue([dto]);mocks.transition.mockReset();mocks.session.mockReturnValue({id:'staff-one',permissions:['OPERATIONS_MANAGE']});mocks.scope.mockReturnValue({ready:true,scope:{kind:'PROPERTY',propertyIds:[propertyId]}});});
it('renders persisted line snapshots, quantities, total GTQ, schedule and state',async()=>{
 const ui=setup();await screen.findByRole('table',{name:'Pedidos Room Service'});expect(screen.getByText('ROOMREAL01 · 204')).toBeInTheDocument();expect(screen.getByText('Café × 2 · Q 20.00 c/u · Q 40.00')).toBeInTheDocument();expect(screen.getByText('Q 40.00')).toBeInTheDocument();expect(screen.getByText('2030-01-02 · 09:00')).toBeInTheDocument();expect(screen.getByText('Solicitado')).toBeInTheDocument();ui.unmount();ui.client.clear();
});
it('confirms Staff lifecycle and refreshes the actual query without optimistic state',async()=>{
 let row={...dto};mocks.read.mockImplementation(async()=>[row]);mocks.transition.mockImplementation(async(property,id,version,target)=>{expect(property).toBe(propertyId);expect(id).toBe(dto.id);expect(version).toBe(row.updatedAt);row={...row,status:target,updatedAt:target==='DONE'?'2030-01-01T09:01:00Z':'2030-01-01T09:00:00Z'};return row;});
 const ui=setup();await screen.findByText('Solicitado');await userEvent.click(screen.getByRole('button',{name:'Iniciar pedido'}));expect(mocks.transition).not.toHaveBeenCalled();await userEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Iniciar pedido'}));await screen.findByText('En proceso');await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 await userEvent.click(screen.getByRole('button',{name:'Marcar como completado'}));await userEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Marcar como completado'}));await screen.findByText('Completado');expect(mocks.transition).toHaveBeenCalledTimes(2);expect(mocks.read).toHaveBeenCalledTimes(3);ui.unmount();ui.client.clear();
});
it('keeps intake read-only and never queries without a concrete authorized property',async()=>{
 mocks.session.mockReturnValue({id:'intake',permissions:['SERVICE_REQUEST_INTAKE']});const ui=setup();await screen.findByText('Solicitado');expect(screen.queryByRole('button',{name:'Iniciar pedido'})).not.toBeInTheDocument();ui.unmount();ui.client.clear();mocks.read.mockClear();mocks.scope.mockReturnValue({ready:true,scope:{kind:'ALL_PROPERTIES',propertyIds:[propertyId]}});const other=setup();expect(screen.getByText('Selecciona un hotel para consultar sus pedidos.')).toBeInTheDocument();expect(mocks.read).not.toHaveBeenCalled();other.unmount();other.client.clear();
});
it('shows errors and retries the list without a mock fallback',async()=>{
 mocks.read.mockRejectedValue(new Error('offline'));const ui=setup();await screen.findByRole('alert');expect(screen.queryByRole('table')).not.toBeInTheDocument();mocks.read.mockResolvedValue([dto]);await userEvent.click(screen.getByRole('button',{name:'Actualizar pedidos'}));await screen.findByText('Solicitado');ui.unmount();ui.client.clear();
});
it('rejects stale transitions and asks to refresh instead of overwriting',async()=>{
 mocks.transition.mockRejectedValue(new HttpStatusError(409,'Conflict'));const ui=setup(<RoomServiceWorkspace propertyId={propertyId} sessionId="staff" canManage/>);await screen.findByText('Solicitado');await userEvent.click(screen.getByRole('button',{name:'Iniciar pedido'}));await userEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Iniciar pedido'}));await screen.findByRole('alert');expect(within(screen.getByRole('dialog')).getByRole('button',{name:'Reintentar'})).toBeDisabled();expect(screen.getByText('Solicitado')).toBeInTheDocument();ui.unmount();ui.client.clear();
});
it('validates totals and property at the mapper boundary',()=>{expect(()=>mapRoomServiceOrders([{...dto,totalMinor:1}],propertyId)).toThrow();expect(()=>mapRoomServiceOrders([dto],'foreign')).toThrow();expect(mapRoomServiceOrders([dto],propertyId)[0].items[0].quantity).toBe(2);});

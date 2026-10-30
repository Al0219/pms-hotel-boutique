import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {fireEvent,render} from '@testing-library/react-native';
import {router} from 'expo-router';
import {NetworkError} from '@/data/remote/http/HttpError';
import {GuestServiceRequestsList} from '@/modules/service-requests/presentation/GuestServiceRequestsList';
import type {ServiceRequestFilter} from '@/modules/service-requests/domain/serviceRequestPresentation';
jest.mock('@/modules/guest-auth/presentation/GuestAuthSessionProvider',()=>({useGuestAuthSession:()=>({session:{accountId:'guest'}})}));
jest.mock('@/modules/valet/presentation/hooks/useTransfers',()=>({useTransfers:()=>({data:[],isPending:false,isFetching:false,isError:false,error:null,fetchStatus:'idle',refetch:jest.fn()}),useTransferMutations:()=>({cancel:{isPending:false,isError:false,error:null,reset:jest.fn(),mutate:jest.fn()}})}));
const mockHousekeeping=jest.fn(),mockRoomService=jest.fn(),mockAmenities=jest.fn(),mockValet=jest.fn();
jest.mock('@/modules/valet/presentation/hooks/usePersistedValet',()=>({useValetRequests:(...args:unknown[])=>mockValet(...args),useValetMutations:()=>({cancel:{isPending:false,isError:false,error:null,reset:jest.fn(),mutate:jest.fn()}})}));
jest.mock('@/config/environment',()=>({environment:{useMockApi:false},requireApiBaseUrl:()=> 'https://pms.example.test'}));
jest.mock('expo-router',()=>({...jest.requireActual('expo-router'),router:{push:jest.fn()}}));
jest.mock('@/modules/services/amenities/presentation/hooks/useAmenitiesRequests',()=>({useAmenitiesRequests:(...args:unknown[])=>mockAmenities(...args)}));
jest.mock('@/modules/services/housekeeping/presentation/hooks/useHousekeepingRequests',()=>({useHousekeepingRequests:(...args:unknown[])=>mockHousekeeping(...args)}));
jest.mock('@/modules/services/room-service/presentation/hooks/useRoomServiceOrders',()=>({useRoomServiceOrders:(...args:unknown[])=>mockRoomService(...args)}));
jest.mock('@/modules/services/housekeeping/presentation/hooks/useCancelHousekeeping',()=>({useCancelHousekeeping:()=>({isPending:false,isError:false,error:null,reset:jest.fn(),mutate:jest.fn()})}));
jest.mock('@/modules/guest-auth/presentation/ActiveReservationContextProvider',()=>({useActiveReservationContext:()=>({activeReservationContext:{reservationId:'reservation',reservationStayId:'stay'}})}));
const hk={id:'hk',reservationId:'reservation',stayId:'stay',serviceDate:'2030-01-02',timeSlot:'10:00–11:00',cleaningType:'FULL_CLEANING',notes:null,status:'OPEN',createdAt:'2030-01-01T00:00:00Z',updatedAt:'2030-01-01T00:00:00Z',modifiableUntil:'2030-01-02T15:35:00Z'};
const order={id:'order',reservationId:'reservation',stayId:'stay',confirmationCode:'ROOM000001',serviceDate:'2030-01-02',deliveryTime:'10:00',totalMinor:2000,notes:null,status:'OPEN',createdAt:'2030-01-01T00:00:00Z',updatedAt:'2030-01-01T00:00:00Z',modifiableUntil:'2030-01-02T15:35:00Z',items:[{productId:'coffee',productName:'Café',mealPeriod:'BEVERAGES',quantity:1,unitPriceMinor:2000,lineTotalMinor:2000}]};
function state(data:unknown[]=[],extra:Record<string,unknown>={}){return {data,isPending:false,isFetching:false,isError:false,error:null,fetchStatus:'idle',refetch:jest.fn().mockResolvedValue({data}),...extra};}
let client:QueryClient;
function tree(filter:ServiceRequestFilter='ALL',additionalCount=0,additionalFilteredCount=0,showRefresh=true){return <QueryClientProvider client={client}><GuestServiceRequestsList filter={filter} additionalCount={additionalCount} additionalFilteredCount={additionalFilteredCount} showRefresh={showRefresh}/></QueryClientProvider>;}
beforeEach(()=>{mockValet.mockReturnValue(state());mockAmenities.mockReturnValue(state());jest.clearAllMocks();client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{gcTime:0}}});mockHousekeeping.mockReturnValue(state());mockRoomService.mockReturnValue(state());});
afterEach(()=>client.clear());
const obsolete=[/Actualizar solicitudes de limpieza/,/Sin solicitudes de limpieza/,/Actualizar pedidos Room Service/,/Sin pedidos Room Service/];
it('shows one global empty and one discreet refresh only after both successful empty reads',async()=>{
 const ui=await render(tree());expect(ui.getAllByText('No tienes servicios registrados')).toHaveLength(1);for(const text of obsolete)expect(ui.queryByText(text)).toBeNull();expect(ui.getAllByRole('button',{name:'Actualizar servicios'})).toHaveLength(1);
 expect(mockHousekeeping).toHaveBeenCalledTimes(1);expect(mockRoomService).toHaveBeenCalledTimes(1);
});
it.each(['housekeeping','room-service'])('does not show a false empty when only %s has data',async service=>{
 if(service==='housekeeping')mockHousekeeping.mockReturnValue(state([hk]));else mockRoomService.mockReturnValue(state([order]));
 const ui=await render(tree());expect(ui.queryByTestId('guest-services-empty')).toBeNull();expect(ui.getByText(service==='housekeeping'?'Limpieza completa':'Room Service')).toBeTruthy();for(const text of obsolete)expect(ui.queryByText(text)).toBeNull();
});
it.each(['housekeeping','room-service'])('waits for %s loading instead of presenting an empty',async service=>{
 const hook=service==='housekeeping'?mockHousekeeping:mockRoomService;hook.mockReturnValue(state([], {isPending:true,isFetching:true,data:undefined}));
 const ui=await render(tree());expect(ui.getByTestId('guest-services-loading')).toBeTruthy();expect(ui.queryByTestId('guest-services-empty')).toBeNull();expect(ui.getByTestId('guest-services-refresh').props.accessibilityState.disabled).toBe(true);
 hook.mockReturnValue(state());await ui.rerender(tree());expect(ui.getAllByText('No tienes servicios registrados')).toHaveLength(1);
});
it('uses filter-wide messages instead of per-service empties when history exists',async()=>{
 mockHousekeeping.mockReturnValue(state([{...hk,status:'DONE'}]));mockRoomService.mockReturnValue(state([{...order,status:'CANCELLED'}]));
 const ui=await render(tree('ACTIVE'));expect(ui.getByText('No tienes servicios activos.')).toBeTruthy();expect(ui.queryByText('No tienes servicios registrados')).toBeNull();
 await ui.rerender(tree('REQUESTED'));expect(ui.getByText('No tienes servicios solicitados.')).toBeTruthy();
 await ui.rerender(tree('ASSIGNED'));expect(ui.getByText('No tienes servicios asignados.')).toBeTruthy();
 await ui.rerender(tree('COMPLETED'));expect(ui.getByText('Completado')).toBeTruthy();expect(ui.queryByTestId('guest-services-empty')).toBeNull();
 await ui.rerender(tree('ALL'));expect(ui.getByText('Cancelado')).toBeTruthy();expect(ui.getByText('Completado')).toBeTruthy();
});
it('keeps the existing Completed filter message when only active requests exist',async()=>{
 mockHousekeeping.mockReturnValue(state([hk]));mockRoomService.mockReturnValue(state([order]));const ui=await render(tree('COMPLETED'));expect(ui.getAllByText('Aún no tienes servicios completados.')).toHaveLength(1);expect(ui.queryByText('No tienes servicios registrados')).toBeNull();
});
it('coordinates an error or offline state without claiming that the list is empty',async()=>{
 const a=state([], {isError:true,error:new NetworkError()}),b=state();mockHousekeeping.mockReturnValue(a);mockRoomService.mockReturnValue(b);
 const ui=await render(tree());expect(ui.getByTestId('guest-services-error')).toHaveTextContent(/Sin conexión/);expect(ui.queryByTestId('guest-services-empty')).toBeNull();await fireEvent.press(ui.getByTestId('guest-services-refresh'));
 expect(a.refetch).toHaveBeenCalledTimes(1);expect(b.refetch).toHaveBeenCalledTimes(1);expect(a.refetch).toHaveBeenCalledWith({cancelRefetch:false});
});
it('keeps valid cards visible on background refresh/error and does not show a full loading state',async()=>{
 mockHousekeeping.mockReturnValue(state([hk],{isError:true,error:new Error('offline')}));mockRoomService.mockReturnValue(state([order]));
 const ui=await render(tree());expect(ui.getByText('Limpieza completa')).toBeTruthy();expect(ui.getByText('Room Service')).toBeTruthy();expect(ui.getByTestId('guest-services-error')).toHaveTextContent(/última consulta disponible/);expect(ui.queryByTestId('guest-services-empty')).toBeNull();
 mockHousekeeping.mockReturnValue(state([hk],{isFetching:true}));await ui.rerender(tree());expect(ui.queryByTestId('guest-services-loading')).toBeNull();expect(ui.getByText('Limpieza completa')).toBeTruthy();
});
it('does not flash empty messages while refreshing previously empty data or when the query is paused',async()=>{
 mockRoomService.mockReturnValue(state([],{isFetching:true}));const ui=await render(tree());expect(ui.getByText('Actualizando servicios…')).toBeTruthy();expect(ui.queryByTestId('guest-services-empty')).toBeNull();
 mockRoomService.mockReturnValue(state([],{fetchStatus:'paused',isPending:true,data:undefined}));await ui.rerender(tree());expect(ui.getByTestId('guest-services-error')).toHaveTextContent(/Sin conexión/);expect(ui.queryByTestId('guest-services-empty')).toBeNull();
});
it('preserves editing actions on both actual card components',async()=>{
 mockHousekeeping.mockReturnValue(state([hk]));mockRoomService.mockReturnValue(state([order]));const ui=await render(tree());await fireEvent.press(ui.getByTestId('housekeeping-edit-hk'));expect(router.push).toHaveBeenCalledWith({pathname:'/services/housekeeping',params:{editRequestId:'hk',returnTo:'requests'}});
 await fireEvent.press(ui.getByLabelText('Editar pedido Room Service'));expect(router.push).toHaveBeenCalledWith({pathname:'/services/room-service',params:{editRequestId:'order',returnTo:'requests'}});
});
it('updates global filter feedback when polling moves the last active service to DONE',async()=>{
 mockRoomService.mockReturnValue(state([order]));const ui=await render(tree('ACTIVE'));expect(ui.getByText('Solicitado')).toBeTruthy();mockRoomService.mockReturnValue(state([{...order,status:'DONE'}]));await ui.rerender(tree('ACTIVE'));expect(ui.getByText('No tienes servicios activos.')).toBeTruthy();
 await ui.rerender(tree('COMPLETED'));expect(ui.getByText('Completado')).toBeTruthy();expect(ui.queryByLabelText('Editar pedido Room Service')).toBeNull();
});
it('counts any other existing service supplied by the caller before deciding empty feedback',async()=>{
 const ui=await render(tree('ALL',1,1));expect(ui.queryByTestId('guest-services-empty')).toBeNull();await ui.rerender(tree('ACTIVE',1,0));expect(ui.getByText('No tienes servicios activos.')).toBeTruthy();
});

it('includes amenities in global emptiness, filters and the single shared refresh',async()=>{
 const amenity={...order,id:'amenity',items:[{itemId:'towels',itemName:'Toallas adicionales',quantity:2}]};
 const query=state([amenity]);mockAmenities.mockReturnValue(query);
 const ui=await render(tree('ACTIVE'));expect(ui.getByText('Amenidades')).toBeTruthy();expect(ui.queryByText('Toallas adicionales × 2')).toBeNull();expect(ui.queryByText('2 artículos')).toBeNull();await fireEvent.press(ui.getByTestId('amenities-request-amenity-toggle'));expect(ui.getByText('Toallas adicionales × 2')).toBeTruthy();expect(ui.queryByTestId('guest-services-empty')).toBeNull();
 await fireEvent.press(ui.getByTestId('guest-services-refresh'));expect(query.refetch).toHaveBeenCalledTimes(1);
 mockAmenities.mockReturnValue(state([{...amenity,status:'DONE'}]));await ui.rerender(tree('ACTIVE'));expect(ui.getByText('No tienes servicios activos.')).toBeTruthy();await ui.rerender(tree('COMPLETED'));expect(ui.getByText('Completado')).toBeTruthy();
});
it('never reports empty when the amenities query has failed, paused or is fetching',async()=>{
 mockAmenities.mockReturnValue(state([],{isError:true,error:new NetworkError()}));const ui=await render(tree());expect(ui.getByTestId('guest-services-error')).toBeTruthy();expect(ui.queryByTestId('guest-services-empty')).toBeNull();
 mockAmenities.mockReturnValue(state([],{fetchStatus:'paused'}));await ui.rerender(tree());expect(ui.getByTestId('guest-services-error')).toBeTruthy();
 mockAmenities.mockReturnValue(state([],{isFetching:true}));await ui.rerender(tree());expect(ui.getByTestId('guest-services-loading')).toBeTruthy();expect(ui.queryByTestId('guest-services-empty')).toBeNull();
});

const amenity={...order,id:'amenity',notes:'Entregar en puerta',items:[{itemId:'towels',itemName:'Toallas adicionales',quantity:2},{itemId:'pillow',itemName:'Almohada adicional',quantity:1}]};
function allServices(){mockHousekeeping.mockReturnValue(state([{...hk,notes:'Limpieza sin perfume'}]));mockRoomService.mockReturnValue(state([{...order,notes:'Sin azúcar'}]));mockAmenities.mockReturnValue(state([amenity]));}
it('restores direct card editing and reserves expansion to the measured chevron without extra actions',async()=>{
 allServices();const ui=await render(tree());
 expect(ui.getByTestId('housekeeping-request-hk-toggle')).toBeTruthy();

 await fireEvent.press(ui.getByTestId('housekeeping-request-hk-toggle'));expect(router.push).not.toHaveBeenCalled();
 expect(ui.getByTestId('housekeeping-edit-hk')).toHaveStyle({height:192});
 await fireEvent.press(ui.getByTestId('housekeeping-edit-hk'));expect(router.push).toHaveBeenCalledWith({pathname:'/services/housekeeping',params:{editRequestId:'hk',returnTo:'requests'}});
 expect(ui.getAllByLabelText('Editar solicitud de limpieza')).toHaveLength(1);
});
it('keeps expansion through OPEN to IN_PROGRESS sync, without granting edit or changing refresh and filters',async()=>{
 mockRoomService.mockReturnValue(state([order]));const ui=await render(tree('ACTIVE'));
 await fireEvent.press(ui.getByTestId('room-service-order-order-toggle'));
 expect(ui.getByTestId('room-service-order-order-body')).toHaveStyle({height:192});
 await fireEvent.press(ui.getByTestId('guest-services-refresh'));for(const hook of [mockHousekeeping,mockRoomService,mockAmenities,mockValet])expect(hook().refetch).toHaveBeenCalledTimes(1);
 mockRoomService.mockReturnValue(state([{...order,status:'IN_PROGRESS'}]));await ui.rerender(tree('ACTIVE'));

 expect(ui.getByTestId('room-service-order-order-toggle')).toHaveProp('accessibilityState',{expanded:true});expect(ui.queryByLabelText('Editar pedido Room Service')).toBeNull();
 mockRoomService.mockReturnValue(state([{...order,status:'DONE'}]));await ui.rerender(tree('ACTIVE'));expect(ui.queryByTestId('room-service-order-order')).toBeNull();await ui.rerender(tree('COMPLETED'));expect(ui.getByText('Completado')).toBeTruthy();
});

it('hides only the manual refresh for Inicio while retaining queries and synchronized cards',async()=>{
 mockRoomService.mockReturnValue(state([order]));
 const ui=await render(tree('ACTIVE',0,0,false));
 expect(ui.queryByText('Actualizar servicios')).toBeNull();
 expect(ui.queryByRole('button',{name:'Actualizar servicios'})).toBeNull();
 expect(ui.queryByTestId('guest-services-refresh')).toBeNull();
 expect(ui.getByText('Solicitado')).toBeTruthy();
 for(const hook of [mockHousekeeping,mockRoomService,mockAmenities,mockValet])expect(hook).toHaveBeenCalledTimes(1);
 mockRoomService.mockReturnValue(state([{...order,status:'IN_PROGRESS'}]));
 await ui.rerender(tree('ACTIVE',0,0,false));
 expect(ui.getByText('En proceso')).toBeTruthy();
 expect(ui.queryByLabelText('Editar pedido Room Service')).toBeNull();
 expect(ui.queryByText('Actualizar servicios')).toBeNull();
});

it('waits for Valet before global empty and includes its real cards and refresh',async()=>{
 mockValet.mockReturnValue(state([],{isPending:true,isFetching:true}));const ui=await render(tree());expect(ui.queryByTestId('guest-services-empty')).toBeNull();expect(ui.getByTestId('guest-services-loading')).toBeTruthy();
 const row={...order,id:'valet',vehicleId:'vehicle',vehicle:{make:'Toyota',model:'Yaris',platePrefix:'P',plateBody:'123ABC',color:null}};const q=state([row]);mockValet.mockReturnValue(q);await ui.rerender(tree());expect(ui.getByText('Valet')).toBeTruthy();expect(ui.queryByTestId('guest-services-empty')).toBeNull();await fireEvent.press(ui.getByTestId('guest-services-refresh'));expect(q.refetch).toHaveBeenCalledTimes(1);
});
it('does not show false empty for Valet error or offline',async()=>{
 mockValet.mockReturnValue(state([],{isError:true,error:new NetworkError()}));const ui=await render(tree());expect(ui.getByTestId('guest-services-error')).toBeTruthy();expect(ui.queryByTestId('guest-services-empty')).toBeNull();
});

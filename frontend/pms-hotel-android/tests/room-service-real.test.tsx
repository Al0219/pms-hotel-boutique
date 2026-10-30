import { QueryClient,QueryClientProvider,notifyManager,defaultScheduler } from '@tanstack/react-query';
import {act,fireEvent,render,waitFor} from '@testing-library/react-native';
import {type EffectCallback} from 'react';
import {AppState,PanResponder,Text,type GestureResponderEvent,type PanResponderGestureState} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {FetchTransport} from '@/data/remote/http/FetchTransport';
import {HttpError,NetworkError} from '@/data/remote/http/HttpError';
import {NativeGuestClient,nativeGuestClient} from '@/modules/guest-auth/data/http/NativeGuestClient';
import {GuestAuthSessionProvider} from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import {ActiveReservationContextProvider} from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import {SessionServiceRequestsProvider,useSessionServiceRequests} from '@/modules/service-requests';
import {RoomServiceScreen} from '@/modules/services/room-service/presentation/RoomServiceScreen';
import {RoomServiceOrdersSection} from '@/modules/services/room-service/presentation/RoomServiceOrdersSection';
import {HttpRoomServiceService} from '@/modules/services/room-service/data/http/HttpRoomServiceService';
import {mapRoomServiceMenu,mapRoomServiceOrder} from '@/modules/services/room-service/data/mappers/mapRoomServiceDto';
import type {RoomServiceOrderDto,RoomServiceProductDto} from '@/modules/services/room-service/data/dtos/RoomServiceDto';
import {currentStayFixture} from '@/modules/stay/data/mocks/currentStayFixture';
jest.mock('@/modules/checkout/presentation/hooks/useServiceCreationGate',()=>({useServiceCreationGate:()=>({blocked:false,message:''}),ServiceCreationNotice:()=>null}));
jest.mock('@/config/environment',()=>({environment:{useMockApi:false},requireApiBaseUrl:()=> 'https://pms.example.test'}));
jest.mock('expo-router',()=>({...jest.requireActual('expo-router'),router:{push:jest.fn(),replace:jest.fn(),dismissTo:jest.fn()},useLocalSearchParams:jest.fn(()=>({})),useFocusEffect:function useTestFocus(callback:EffectCallback){const React=jest.requireActual<typeof import('react')>('react');React.useEffect(callback,[callback]);}}));
const context={reservationId:'own-reservation',reservationStayId:'own-stay'};
const ids={coffee:'00000000-0000-4000-8000-000000000001',breakfast:'00000000-0000-4000-8000-000000000002',club:'00000000-0000-4000-8000-000000000003'};
const menu:RoomServiceProductDto[]=[{id:ids.coffee,code:'coffee',name:'Café',periods:['BEVERAGES'],unitPriceMinor:2000,currency:'GTQ',available:true},{id:ids.breakfast,code:'continental-breakfast',name:'Desayuno continental',periods:['BREAKFAST'],unitPriceMinor:7500,currency:'GTQ',available:true},{id:ids.club,code:'club-sandwich',name:'Club sándwich',periods:['LUNCH','DINNER'],unitPriceMinor:9000,currency:'GTQ',available:true}];
const dto:RoomServiceOrderDto={id:'order-real',reservationId:context.reservationId,stayId:context.reservationStayId,propertyId:'own-property',confirmationCode:'ROOMREAL01',roomCode:'204',serviceDate:'2030-01-02',deliveryTime:'08:30',currency:'GTQ',totalMinor:2000,notes:'Original',status:'OPEN',createdAt:'2030-01-02T13:00:00Z',updatedAt:'2030-01-02T13:00:00Z',modifiableUntil:'2030-01-02T14:05:00Z',items:[{productId:ids.coffee,productName:'Café',mealPeriod:'BEVERAGES',quantity:1,unitPriceMinor:2000,lineTotalMinor:2000}]};
const stayService={getCurrentStay:async()=>({...currentStayFixture,id:context.reservationStayId,reservationId:context.reservationId,arrival:'2030-01-01',departure:'2030-01-04',timezone:'America/Guatemala',status:'IN_HOUSE'})};
const nowMs=()=>Date.parse('2030-01-02T14:00:00Z');
function Probe(){const {requests}=useSessionServiceRequests();return <Text testID="local-count">{requests.length}</Text>;}
let client:QueryClient;let rows:RoomServiceOrderDto[];let request:jest.SpyInstance;const originalAppState=AppState.currentState;
function tree(content:React.ReactNode){return <QueryClientProvider client={client}><GuestAuthSessionProvider initialSession={{accountId:'real-guest'}}><ActiveReservationContextProvider initialActiveReservationContext={context}><SessionServiceRequestsProvider><Probe/>{content}</SessionServiceRequestsProvider></ActiveReservationContextProvider></GuestAuthSessionProvider></QueryClientProvider>;}
async function setup(edit=false){(useLocalSearchParams as jest.Mock).mockReturnValue(edit?{editRequestId:dto.id}:{});return render(tree(<RoomServiceScreen stayService={stayService} nowMs={nowMs}/>));}
beforeEach(()=>{jest.clearAllMocks();AppState.currentState='active';rows=[dto];client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{retry:false,gcTime:0}}});
 request=jest.spyOn(nativeGuestClient,'request').mockImplementation(async(path,init)=>{if(path.endsWith('/room-service-menu'))return menu;if(init?.method==='POST'||init?.method==='PUT'){const input=JSON.parse(init.body as string);const saved={...dto,...(input.notes!==undefined?{notes:input.notes}:{}),...(input.serviceDate?{serviceDate:input.serviceDate,deliveryTime:input.deliveryTime}:{}),...(path.endsWith('/cancel')?{status:'CANCELLED'}:{}),updatedAt:'2030-01-02T14:00:01Z'};rows=[saved];return saved;}return rows;});
});
afterEach(()=>{client.clear();jest.restoreAllMocks();AppState.currentState=originalAppState;notifyManager.setScheduler(defaultScheduler);jest.useRealTimers();});
async function cart(ui:Awaited<ReturnType<typeof setup>>){await waitFor(()=>expect(ui.getByTestId(`room-service-product-${ids.breakfast}-increment`)).toBeTruthy());await fireEvent.press(ui.getByTestId('room-service-category-selector'));await fireEvent.press(ui.getByTestId('room-service-category-option-BEVERAGES'));await fireEvent.press(ui.getByTestId(`room-service-product-${ids.coffee}-increment`));await fireEvent.press(ui.getByTestId('room-service-cart-button'));await fireEvent.changeText(ui.getByTestId('room-service-notes'),'  Original  ');await fireEvent.press(ui.getByTestId('room-service-next'));}
it('maps persistent products/snapshots and rejects foreign contexts or inconsistent totals',()=>{
 expect(mapRoomServiceMenu(menu).items[0]).toMatchObject({fixtureKey:ids.coffee,priceAmount:20,periods:['BEVERAGES']});expect(mapRoomServiceOrder(dto,context).totalMinor).toBe(2000);
 for(const invalid of [{...dto,stayId:'foreign'},{...dto,totalMinor:1},{...dto,items:[{...dto.items[0],quantity:6}]},{...dto,currency:'USD'}])expect(()=>mapRoomServiceOrder(invalid,context)).toThrow();
});
it('sends authenticated HTTP catalog/create/update/cancel without prices, account or room authority',async()=>{
 request.mockRestore();const fetch=jest.spyOn(globalThis,'fetch');for(const body of [{accessToken:'synthetic',refreshToken:'synthetic-next',accessTokenExpiresInSeconds:900},menu,dto,dto,{...dto,status:'CANCELLED'}])fetch.mockResolvedValueOnce({ok:true,status:200,json:async()=>body} as Response);
 const native=new NativeGuestClient(new FetchTransport(),{read:async()=>JSON.stringify({backend:'https://pms.example.test',refreshToken:'synthetic-refresh'}),write:async()=>{},clear:async()=>{}},()=> 'https://pms.example.test');const service=new HttpRoomServiceService(native);
 await service.getMenu(context);const input={items:[{itemFixtureKey:ids.coffee,quantity:1,mealPeriod:'BEVERAGES' as const}],serviceDate:dto.serviceDate,deliveryTime:dto.deliveryTime,notes:' Original '};await service.submitRequest(input,context,'stable-intent-0001');await service.updateOrder(input,context,dto.id,dto.updatedAt);await service.cancelOrder(context,dto.id,dto.updatedAt);
 const created=fetch.mock.calls.find(([path,init])=>String(path).endsWith('/room-service-orders')&&init?.method==='POST')!;const payload=JSON.parse(created[1]!.body as string);expect(payload).toEqual({serviceDate:dto.serviceDate,deliveryTime:dto.deliveryTime,notes:'Original',items:[{productId:ids.coffee,quantity:1,mealPeriod:'BEVERAGES'}]});expect(created[1]?.headers).toMatchObject({Authorization:'Bearer synthetic','Idempotency-Key':'stable-intent-0001'});
});
it('uses real catalog/cart and creates only after Backend success without a session-only duplicate',async()=>{
 rows=[];const ui=await setup();await cart(ui);await waitFor(()=>expect(ui.getByTestId('room-service-submit').props.accessibilityState.disabled).toBe(false));await fireEvent.press(ui.getByTestId('room-service-submit'));await waitFor(()=>expect(ui.getByTestId('room-service-submit-success')).toBeTruthy());
 expect(ui.getByTestId('local-count')).toHaveTextContent('0');expect(router.replace).toHaveBeenCalledWith('/account');expect(request.mock.calls.filter(([,init])=>init?.method==='POST')).toHaveLength(1);
});
it('preloads persisted edit data and preserves the ID/version without an additional POST',async()=>{
 const original=request.getMockImplementation()!;request.mockImplementation((path,init)=>String(path).endsWith('/room-service-menu')?Promise.resolve(menu.map(item=>({...item,unitPriceMinor:3000}))):original(path,init));
 const ui=await setup(true);await waitFor(()=>expect(ui.getByTestId('room-service-notes')).toHaveProp('value','Original'));expect(ui.getByTestId('room-service-total')).toHaveTextContent('Q 20');await fireEvent.changeText(ui.getByTestId('room-service-notes'),'Actualizada');await fireEvent.press(ui.getByTestId('room-service-next'));await fireEvent.press(ui.getByText('Guardar cambios'));await waitFor(()=>expect(ui.getByTestId('room-service-submit-success')).toBeTruthy());
 const update=request.mock.calls.find(([,init])=>init?.method==='PUT')!;expect(update[0]).toContain(`/room-service-orders/${dto.id}`);expect(JSON.parse(update[1].body)).toMatchObject({expectedUpdatedAt:dto.updatedAt,notes:'Actualizada'});expect(request.mock.calls.some(([,init])=>init?.method==='POST')).toBe(false);
});
it('retains form on offline and retries the same creation intent without false success',async()=>{
 request.mockImplementation(async(path,init)=>{if(path.endsWith('/room-service-menu'))return menu;if(init?.method==='POST')throw new NetworkError();return [];});
 const ui=await setup();await cart(ui);await waitFor(()=>expect(ui.getByTestId('room-service-submit').props.accessibilityState.disabled).toBe(false));await fireEvent.press(ui.getByTestId('room-service-submit'));await waitFor(()=>expect(ui.getByTestId('room-service-submit-offline')).toBeTruthy());await fireEvent.press(ui.getByTestId('room-service-submit'));await waitFor(()=>expect(request.mock.calls.filter(([,init])=>init?.method==='POST')).toHaveLength(2));
 expect(new Set(request.mock.calls.filter(([,init])=>init?.method==='POST').map(([,init])=>init.headers['Idempotency-Key'])).size).toBe(1);expect(ui.queryByTestId('room-service-submit-success')).toBeNull();
});
it('handles concurrent Staff transitions while editing without overwriting the order',async()=>{
 request.mockImplementation(async(path,init)=>{if(path.endsWith('/room-service-menu'))return menu;if(init?.method==='PUT'){rows=[{...dto,status:'IN_PROGRESS'}];throw new HttpError('Conflict',409);}return rows;});
 const ui=await setup(true);await waitFor(()=>expect(ui.getByTestId('room-service-next')).toBeTruthy());await fireEvent.changeText(ui.getByTestId('room-service-notes'),'New');await fireEvent.press(ui.getByTestId('room-service-next'));await fireEvent.press(ui.getByText('Guardar cambios'));await waitFor(()=>expect(ui.getByText('Este pedido ya no admite cambios')).toBeTruthy());expect(ui.queryByTestId('room-service-submit-success')).toBeNull();
});
it('cancels with swipe/confirmation, removes Active and retains Cancelled history with real totals',async()=>{
 const responder=jest.spyOn(PanResponder,'create');const ui=await render(tree(<RoomServiceOrdersSection filter="ACTIVE"/>));await waitFor(()=>expect(ui.getByTestId(`room-service-order-swipe-${dto.id}`)).toBeTruthy());
 await act(async()=>{const c=responder.mock.calls.at(-1)![0];c.onPanResponderRelease?.({} as GestureResponderEvent,{dx:-1000} as PanResponderGestureState);});await fireEvent.press(ui.getByLabelText('Cancelar pedido'));await fireEvent.press(ui.getByTestId('room-service-cancel-confirmation-confirm'));
 await waitFor(()=>expect(ui.queryByTestId(`room-service-order-${dto.id}`)).toBeNull());await ui.rerender(tree(<RoomServiceOrdersSection filter="ALL"/>));await waitFor(()=>expect(ui.getByText('Cancelado')).toBeTruthy());expect(ui.getByText('Total · Q 20.00')).toBeTruthy();expect(ui.getByTestId('local-count')).toHaveTextContent('0');
});
it('automatically synchronizes Staff states and existing filters using the shared polling hook',async()=>{
 jest.useFakeTimers();notifyManager.setScheduler(cb=>cb());const ui=await render(tree(<RoomServiceOrdersSection filter="ACTIVE"/>));await act(async()=>{await jest.advanceTimersByTimeAsync(0);});expect(ui.getByText('Solicitado')).toBeTruthy();
 rows=[{...dto,status:'IN_PROGRESS'}];await act(async()=>{await jest.advanceTimersByTimeAsync(10_000);});expect(ui.getByText('En proceso')).toBeTruthy();rows=[{...dto,status:'DONE'}];await act(async()=>{await jest.advanceTimersByTimeAsync(10_000);});expect(ui.queryByTestId(`room-service-order-${dto.id}`)).toBeNull();
 await ui.rerender(tree(<RoomServiceOrdersSection filter="COMPLETED"/>));expect(ui.getByText('Completado')).toBeTruthy();const count=request.mock.calls.length;await act(async()=>{await jest.advanceTimersByTimeAsync(30_000);});expect(request).toHaveBeenCalledTimes(count);await ui.unmount();
});

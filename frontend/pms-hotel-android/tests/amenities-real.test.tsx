import { QueryClient,QueryClientProvider,notifyManager,defaultScheduler } from '@tanstack/react-query';
import {act,fireEvent,render,waitFor} from '@testing-library/react-native';
import {useEffect,useRef,type EffectCallback} from 'react';
import {AppState,PanResponder,Pressable,Text,type GestureResponderEvent,type PanResponderGestureState,type AppStateStatus} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {FetchTransport} from '@/data/remote/http/FetchTransport';
import {HttpError,NetworkError} from '@/data/remote/http/HttpError';
import {NativeGuestClient,nativeGuestClient} from '@/modules/guest-auth/data/http/NativeGuestClient';
import {GuestAuthSessionProvider,useGuestAuthSession} from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import {ActiveReservationContextProvider,useActiveReservationContext} from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import {SessionServiceRequestsProvider,useSessionServiceRequests} from '@/modules/service-requests';
import {AmenitiesScreen} from '@/modules/services/amenities/presentation/AmenitiesScreen';
import {AmenitiesRequestsSection} from '@/modules/services/amenities/presentation/AmenitiesRequestsSection';
import {HttpAmenitiesService} from '@/modules/services/amenities/data/http/HttpAmenitiesService';
import {mapAmenitiesCatalog,mapAmenitiesRequest} from '@/modules/services/amenities/data/mappers/mapAmenitiesDto';
import type {AmenitiesRequestDto,AmenityCatalogDto} from '@/modules/services/amenities/data/dtos/AmenitiesDto';
import {currentStayFixture} from '@/modules/stay/data/mocks/currentStayFixture';
jest.mock('@/config/environment',()=>({environment:{useMockApi:false},requireApiBaseUrl:()=> 'https://pms.example.test'}));
jest.mock('expo-router',()=>({...jest.requireActual('expo-router'),router:{push:jest.fn(),replace:jest.fn(),dismissTo:jest.fn()},useLocalSearchParams:jest.fn(()=>({})),useFocusEffect:function useTestFocus(callback:EffectCallback){const React=jest.requireActual<typeof import('react')>('react');React.useEffect(callback,[callback]);}}));
const context={reservationId:'own-reservation',reservationStayId:'own-stay'};
const ids={towels:'00000000-0000-4000-8000-000000000001',dental:'00000000-0000-4000-8000-000000000002'};
const menu:AmenityCatalogDto[]=[{id:ids.towels,code:'extra-towels',name:'Toallas adicionales'},{id:ids.dental,code:'dental-kit',name:'Kit dental'}];
const dto:AmenitiesRequestDto={id:'00000000-0000-4000-8000-000000000010',reservationId:context.reservationId,stayId:context.reservationStayId,propertyId:'00000000-0000-4000-8000-000000000011',confirmationCode:'AMENREAL01',roomCode:'204',serviceDate:'2030-01-02',deliveryTime:'08:30',notes:'Original',status:'OPEN',createdAt:'2030-01-02T13:00:00Z',updatedAt:'2030-01-02T13:00:00.123456Z',modifiableUntil:'2030-01-02T14:05:00Z',items:[{itemId:ids.towels,itemName:'Toallas adicionales',quantity:1}]};
const stayService={getCurrentStay:async()=>({...currentStayFixture,id:context.reservationStayId,reservationId:context.reservationId,arrival:'2030-01-01',departure:'2030-01-04',timezone:'America/Guatemala',status:'IN_HOUSE'})};
const nowMs=()=>Date.parse('2030-01-02T14:00:00Z');
function LateCheckoutSeed() {
 const {addRequest}=useSessionServiceRequests();const seeded=useRef(false);
 useEffect(()=>{if(!seeded.current){seeded.current=true;addRequest({kind:'LATE_CHECKOUT',origin:'SERVICES',title:'Late checkout simulado',status:'REQUESTED',details:{type:'LATE_CHECKOUT',serviceDate:'2030-01-02',checkoutUntil:'16:00'}});}},[addRequest]);return null;
}
function Probe(){const {requests}=useSessionServiceRequests();return <Text testID="local-count">{requests.length}</Text>;}
let client:QueryClient;let rows:AmenitiesRequestDto[];let request:jest.SpyInstance;const originalAppState=AppState.currentState;
function tree(content:React.ReactNode){return <QueryClientProvider client={client}><GuestAuthSessionProvider initialSession={{accountId:'real-guest'}}><ActiveReservationContextProvider initialActiveReservationContext={context}><SessionServiceRequestsProvider><Probe/>{content}</SessionServiceRequestsProvider></ActiveReservationContextProvider></GuestAuthSessionProvider></QueryClientProvider>;}
async function setup(edit=false){(useLocalSearchParams as jest.Mock).mockReturnValue(edit?{editRequestId:dto.id}:{});return render(tree(<AmenitiesScreen stayService={stayService} nowMs={nowMs}/>));}
beforeEach(()=>{jest.clearAllMocks();AppState.currentState='active';rows=[dto];client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{retry:false,gcTime:0}}});
 request=jest.spyOn(nativeGuestClient,'request').mockImplementation(async(path,init)=>{if(path.endsWith('/amenities-catalog'))return menu;if(init?.method==='POST'||init?.method==='PUT'){const input=JSON.parse(init.body as string);const saved={...dto,...(input.notes!==undefined?{notes:input.notes}:{}),...(input.serviceDate?{serviceDate:input.serviceDate,deliveryTime:input.deliveryTime}:{}),...(path.endsWith('/cancel')?{status:'CANCELLED'}:{}),updatedAt:'2030-01-02T14:00:01Z'};rows=[saved];return saved;}return rows;});
});
afterEach(()=>{client.clear();jest.restoreAllMocks();AppState.currentState=originalAppState;notifyManager.setScheduler(defaultScheduler);jest.useRealTimers();});
async function cart(ui:Awaited<ReturnType<typeof setup>>){await waitFor(()=>expect(ui.getByTestId(`amenities-item-${ids.towels}-increment`)).toBeTruthy());await fireEvent.press(ui.getByTestId(`amenities-item-${ids.towels}-increment`));await fireEvent.press(ui.getByTestId('amenities-cart-button'));await fireEvent.changeText(ui.getByTestId('amenities-notes'),'  Original  ');await fireEvent.press(ui.getByTestId('amenities-next'));}
it('maps real UUIDs and rejects foreign context, invalid quantities and duplicate items',()=>{
 expect(mapAmenitiesCatalog(menu)[0]).toEqual({fixtureKey:ids.towels,name:'Toallas adicionales'});expect(mapAmenitiesRequest(dto,context).items[0].quantity).toBe(1);
 for(const invalid of [{...dto,stayId:'foreign'},{...dto,status:'REQUESTED'},{...dto,items:[{...dto.items[0],quantity:6}]},{...dto,items:[dto.items[0],dto.items[0]]}])expect(()=>mapAmenitiesRequest(invalid,context)).toThrow();
 expect(()=>mapAmenitiesCatalog([{...menu[0],id:'extra-towels'}])).toThrow();
});
it('sends authenticated HTTP catalog/create/update/cancel without prices, account or room authority',async()=>{
 request.mockRestore();const fetch=jest.spyOn(globalThis,'fetch');for(const body of [{accessToken:'synthetic',refreshToken:'synthetic-next',accessTokenExpiresInSeconds:900},menu,dto,dto,{...dto,status:'CANCELLED'}])fetch.mockResolvedValueOnce({ok:true,status:200,json:async()=>body} as Response);
 const native=new NativeGuestClient(new FetchTransport(),{read:async()=>JSON.stringify({backend:'https://pms.example.test',refreshToken:'synthetic-refresh'}),write:async()=>{},clear:async()=>{}},()=> 'https://pms.example.test');const service=new HttpAmenitiesService(native);
 await service.getCatalog(context);const input={items:[{itemFixtureKey:ids.towels,quantity:1}],serviceDate:dto.serviceDate,deliveryTime:dto.deliveryTime,notes:' Original '};await service.submitRequest(input,context,'stable-intent-0001');await service.updateRequest(input,context,dto.id,dto.updatedAt);await service.cancelRequest(context,dto.id,dto.updatedAt);
 const created=fetch.mock.calls.find(([path,init])=>String(path).endsWith('/amenities-requests')&&init?.method==='POST')!;const payload=JSON.parse(created[1]!.body as string);expect(payload).toEqual({serviceDate:dto.serviceDate,deliveryTime:dto.deliveryTime,notes:'Original',items:[{itemId:ids.towels,quantity:1}]});expect(created[1]?.headers).toMatchObject({Authorization:'Bearer synthetic','Idempotency-Key':'stable-intent-0001'});
});
it('uses real catalog/cart and creates only after Backend success without a session-only duplicate',async()=>{
 rows=[];const ui=await setup();await cart(ui);await waitFor(()=>expect(ui.getByTestId('amenities-submit').props.accessibilityState.disabled).toBe(false));await fireEvent.press(ui.getByTestId('amenities-submit'));await waitFor(()=>expect(ui.getByTestId('amenities-success')).toBeTruthy());
 expect(ui.getByTestId('local-count')).toHaveTextContent('0');expect(router.replace).toHaveBeenCalledWith('/account');expect(request.mock.calls.filter(([,init])=>init?.method==='POST')).toHaveLength(1);
});
it('preloads persisted edit data and preserves ID and exact microsecond version without POST',async()=>{
 const original=request.getMockImplementation()!;request.mockImplementation((path,init)=>String(path).endsWith('/amenities-catalog')?Promise.resolve(menu):original(path,init));
 const ui=await setup(true);await waitFor(()=>expect(ui.getByTestId('amenities-notes')).toHaveProp('value','Original'));expect(ui.queryByText(/Q 20/)).toBeNull();await fireEvent.changeText(ui.getByTestId('amenities-notes'),'Actualizada');await fireEvent.press(ui.getByTestId('amenities-next'));await fireEvent.press(ui.getByTestId('amenities-submit'));await waitFor(()=>expect(ui.getByTestId('amenities-success')).toBeTruthy());
 const update=request.mock.calls.find(([,init])=>init?.method==='PUT')!;expect(update[0]).toContain(`/amenities-requests/${dto.id}`);expect(JSON.parse(update[1].body)).toMatchObject({expectedUpdatedAt:dto.updatedAt,notes:'Actualizada'});expect(request.mock.calls.some(([,init])=>init?.method==='POST')).toBe(false);
});
it('retains form on offline and retries the same creation intent without false success',async()=>{
 request.mockImplementation(async(path,init)=>{if(path.endsWith('/amenities-catalog'))return menu;if(init?.method==='POST')throw new NetworkError();return [];});
 const ui=await setup();await cart(ui);await waitFor(()=>expect(ui.getByTestId('amenities-submit').props.accessibilityState.disabled).toBe(false));await fireEvent.press(ui.getByTestId('amenities-submit'));await waitFor(()=>expect(ui.getByTestId('amenities-submit-offline')).toBeTruthy());await fireEvent.press(ui.getByTestId('amenities-submit'));await waitFor(()=>expect(request.mock.calls.filter(([,init])=>init?.method==='POST')).toHaveLength(2));
 expect(new Set(request.mock.calls.filter(([,init])=>init?.method==='POST').map(([,init])=>init.headers['Idempotency-Key'])).size).toBe(1);expect(ui.queryByTestId('amenities-success')).toBeNull();
});
it('handles concurrent Staff transitions while editing without overwriting the order',async()=>{
 request.mockImplementation(async(path,init)=>{if(path.endsWith('/amenities-catalog'))return menu;if(init?.method==='PUT'){rows=[{...dto,status:'IN_PROGRESS'}];throw new HttpError('Conflict',409);}return rows;});
 const ui=await setup(true);await waitFor(()=>expect(ui.getByTestId('amenities-next')).toBeTruthy());await fireEvent.changeText(ui.getByTestId('amenities-notes'),'New');await fireEvent.press(ui.getByTestId('amenities-next'));await fireEvent.press(ui.getByTestId('amenities-submit'));await waitFor(()=>expect(ui.getByTestId('amenities-edit-state')).toBeTruthy());expect(ui.queryByTestId('amenities-success')).toBeNull();
});
it('cancels with swipe confirmation, removes Active and retains Cancelled history',async()=>{
 const responder=jest.spyOn(PanResponder,'create');const ui=await render(tree(<AmenitiesRequestsSection filter="ACTIVE"/>));await waitFor(()=>expect(ui.getByTestId(`amenities-request-swipe-${dto.id}`)).toBeTruthy());
 await fireEvent.press(ui.getByTestId(`amenities-request-${dto.id}-toggle`));
 await act(async()=>{const c=responder.mock.calls.at(-1)![0];c.onPanResponderRelease?.({} as GestureResponderEvent,{dx:-1000} as PanResponderGestureState);});await fireEvent.press(ui.getByLabelText('Cancelar solicitud'));await fireEvent.press(ui.getByTestId('amenities-cancel-confirmation-confirm'));
 await waitFor(()=>expect(ui.queryByTestId(`amenities-request-${dto.id}`)).toBeNull());await ui.rerender(tree(<AmenitiesRequestsSection filter="ALL"/>));await waitFor(()=>expect(ui.getByText('Cancelado')).toBeTruthy());await fireEvent.press(ui.getByTestId(`amenities-request-${dto.id}-toggle`));expect(ui.getByText('Toallas adicionales × 1')).toBeTruthy();expect(ui.getByTestId('local-count')).toHaveTextContent('0');
});
it('automatically synchronizes Staff states and existing filters using the shared polling hook',async()=>{
 jest.useFakeTimers();notifyManager.setScheduler(cb=>cb());const ui=await render(tree(<AmenitiesRequestsSection filter="ACTIVE"/>));await act(async()=>{await jest.advanceTimersByTimeAsync(0);});expect(ui.getByText('Solicitado')).toBeTruthy();
 rows=[{...dto,status:'IN_PROGRESS'}];await act(async()=>{await jest.advanceTimersByTimeAsync(10_000);});expect(ui.getByText('En proceso')).toBeTruthy();rows=[{...dto,status:'DONE'}];await act(async()=>{await jest.advanceTimersByTimeAsync(10_000);});expect(ui.queryByTestId(`amenities-request-${dto.id}`)).toBeNull();
 await ui.rerender(tree(<AmenitiesRequestsSection filter="COMPLETED"/>));expect(ui.getByText('Completado')).toBeTruthy();const count=request.mock.calls.length;await act(async()=>{await jest.advanceTimersByTimeAsync(30_000);});expect(request).toHaveBeenCalledTimes(count);await ui.unmount();
});

it.each([[],new NetworkError()])('real empty or failed catalog never displays mock fixture articles',async result=>{
 request.mockImplementation(async(path)=>{if(path.endsWith('/amenities-catalog')){if(result instanceof Error)throw result;return result;}return [];});
 const ui=await setup();await waitFor(()=>expect(ui.getByTestId(result instanceof Error?'amenities-catalog-error':'amenities-catalog-empty')).toBeTruthy());expect(ui.queryByText('Toallas adicionales')).toBeNull();expect(ui.queryByText('Pantuflas')).toBeNull();
});
it('uses property time and ignores a simulated late checkout',async()=>{
 const departService={getCurrentStay:async()=>({...await stayService.getCurrentStay(),departure:'2030-01-02'})};
 const ui=await render(tree(<><LateCheckoutSeed/><AmenitiesScreen stayService={departService} nowMs={nowMs}/></>));await cart(ui);expect(ui.getByTestId('amenities-time-selector')).toHaveTextContent('08:30');
 await fireEvent.press(ui.getByTestId('amenities-time-selector'));expect(ui.getByText('Disponible hasta las 12:00')).toBeTruthy();expect(ui.getByTestId('amenities-time-picker-hour-13').props.accessibilityState.disabled).toBe(true);
});
it('stops polling in background and after unmount, refreshing on foreground',async()=>{
 jest.useFakeTimers();notifyManager.setScheduler(cb=>cb());let appChange:((state:AppStateStatus)=>void)|undefined;
 jest.spyOn(AppState,'addEventListener').mockImplementation((_event,handler)=>{appChange=handler;return {remove:jest.fn()};});
 const ui=await render(tree(<AmenitiesRequestsSection/>));await act(async()=>{await jest.advanceTimersByTimeAsync(0);});const count=request.mock.calls.length;
 await act(async()=>appChange?.('background'));await act(async()=>{await jest.advanceTimersByTimeAsync(30_000);});expect(request).toHaveBeenCalledTimes(count);
 rows=[{...dto,status:'IN_PROGRESS'}];await act(async()=>{appChange?.('active');await jest.advanceTimersByTimeAsync(0);});expect(ui.getByText('En proceso')).toBeTruthy();
 await ui.unmount();const end=request.mock.calls.length;await act(async()=>{await jest.advanceTimersByTimeAsync(30_000);});expect(request).toHaveBeenCalledTimes(end);
});

it('allows content editing between 30 and 25 minutes without shifting the saved schedule',async()=>{
 const nearNow=()=>Date.parse('2030-01-02T14:03:00Z');(useLocalSearchParams as jest.Mock).mockReturnValue({editRequestId:dto.id});
 const ui=await render(tree(<AmenitiesScreen stayService={stayService} nowMs={nearNow}/>));await waitFor(()=>expect(ui.getByTestId('amenities-notes')).toHaveProp('value','Original'));
 await fireEvent.changeText(ui.getByTestId('amenities-notes'),'Near cutoff');await fireEvent.press(ui.getByTestId('amenities-next'));expect(ui.getByTestId('amenities-submit').props.accessibilityState.disabled).toBe(false);await fireEvent.press(ui.getByTestId('amenities-submit'));await waitFor(()=>expect(ui.getByTestId('amenities-success')).toBeTruthy());
 expect(JSON.parse(request.mock.calls.find(([,init])=>init?.method==='PUT')![1].body)).toMatchObject({serviceDate:dto.serviceDate,deliveryTime:dto.deliveryTime,expectedUpdatedAt:dto.updatedAt});
});

it('isolates delayed history across active stay and account changes',async()=>{
 let resolve!:(value:AmenitiesRequestDto[])=>void;const delayed=new Promise<AmenitiesRequestDto[]>(done=>{resolve=done;});let count=0;
 request.mockImplementation(async()=>++count===1?delayed:[]);
 function Switch(){const {setActiveReservationContext}=useActiveReservationContext();const {beginSession}=useGuestAuthSession();return <><Pressable testID="switch-stay" onPress={()=>setActiveReservationContext({reservationId:'next-reservation',reservationStayId:'next-stay'})}><Text>Cambiar estancia</Text></Pressable><Pressable testID="switch-account" onPress={()=>beginSession({accountId:'next-account'})}><Text>Cambiar cuenta</Text></Pressable></>;}
 const ui=await render(tree(<><Switch/><AmenitiesRequestsSection/></>));await fireEvent.press(ui.getByTestId('switch-stay'));await act(async()=>resolve([dto]));
 await waitFor(()=>expect(ui.getByText('Sin solicitudes Amenidades.')).toBeTruthy());expect(ui.queryByTestId(`amenities-request-${dto.id}`)).toBeNull();
 await fireEvent.press(ui.getByTestId('switch-account'));await waitFor(()=>expect(client.getQueryCache().find({queryKey:['guest-amenities','next-account','next-reservation','next-stay']})?.state.status).toBe('success'));expect(ui.queryByTestId(`amenities-request-${dto.id}`)).toBeNull();
});

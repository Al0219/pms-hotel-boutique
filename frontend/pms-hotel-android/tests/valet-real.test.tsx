import {QueryClient,QueryClientProvider,notifyManager,defaultScheduler} from '@tanstack/react-query';
import {act,fireEvent,render,waitFor} from '@testing-library/react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {AppClockProvider} from '@/shared/time';
import {currentStayFixture} from '@/modules/stay/data/mocks/currentStayFixture';
import {RealValetScreen} from '@/modules/valet/presentation/RealValetScreen';
import type {EffectCallback} from 'react';
import {AppState} from 'react-native';
import {nativeGuestClient} from '@/modules/guest-auth/data/http/NativeGuestClient';
import {GuestAuthSessionProvider} from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import {ActiveReservationContextProvider} from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import {ValetRequestsSection} from '@/modules/valet/presentation/ValetRequestsSection';
import {mapPersistedValetRequest,mapPersistedVehicle} from '@/modules/valet/data/mappers/mapPersistedValet';
import {HttpPersistedValetService} from '@/modules/valet/data/http/HttpPersistedValetService';
import type {ValetOrderDto,ValetVehicleDto} from '@/modules/valet/data/dtos/PersistedValetDto';
jest.mock('@/modules/checkout/presentation/hooks/useServiceCreationGate',()=>({useServiceCreationGate:()=>({blocked:false,message:''}),ServiceCreationNotice:()=>null}));
jest.mock('@/config/environment',()=>({environment:{useMockApi:false},requireApiBaseUrl:()=> 'https://pms.example.test'}));
jest.mock('expo-router',()=>({...jest.requireActual('expo-router'),router:{push:jest.fn(),replace:jest.fn()},useLocalSearchParams:jest.fn(()=>({})),useFocusEffect:function useTestFocus(callback:EffectCallback){const React=jest.requireActual<typeof import('react')>('react');React.useEffect(callback,[callback]);}}));
const context={reservationId:'reservation',reservationStayId:'stay'};const propertyId='00000000-0000-4000-8000-000000000001';const vehicleId='00000000-0000-4000-8000-000000000002';
const vehicle:ValetVehicleDto={id:vehicleId,savedVehicleId:vehicleId,propertyId,stayId:context.reservationStayId,make:'Toyota',model:'Yaris',platePrefix:'P',plateBody:'123ABC',color:null,location:'PARKED',createdAt:'2030-01-01T00:00:00Z',updatedAt:'2030-01-01T00:00:00.123456Z',hasActiveRequest:true};
const dto:ValetOrderDto={id:'00000000-0000-4000-8000-000000000003',propertyId,reservationId:context.reservationId,stayId:context.reservationStayId,confirmationCode:'VALREAL01',roomCode:'204',vehicleId,vehicle:{make:'Toyota',model:'Yaris',platePrefix:'P',plateBody:'123ABC',color:null},serviceDate:'2030-01-02',deliveryTime:'09:00',status:'OPEN',createdAt:'2030-01-01T00:00:00Z',updatedAt:'2030-01-01T00:00:00.123456Z',modifiableUntil:'2030-01-02T14:35:00Z'};
let client:QueryClient;let rows:ValetOrderDto[];let request:jest.SpyInstance;const appState=AppState.currentState;
function tree(content:React.ReactNode){return <QueryClientProvider client={client}><GuestAuthSessionProvider initialSession={{accountId:'guest'}}><ActiveReservationContextProvider initialActiveReservationContext={context}>{content}</ActiveReservationContextProvider></GuestAuthSessionProvider></QueryClientProvider>;}
beforeEach(()=>{jest.clearAllMocks();AppState.currentState='active';rows=[dto];client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{retry:false,gcTime:0}}});request=jest.spyOn(nativeGuestClient,'request').mockImplementation(async(path)=>path==='/api/v1/guest-auth/account/valet-vehicles'?[{...vehicle,id:vehicleId,canAssociate:false}]:path.endsWith('/valet-vehicles')?[vehicle]:rows);});
afterEach(()=>{client.clear();jest.restoreAllMocks();AppState.currentState=appState;notifyManager.setScheduler(defaultScheduler);jest.useRealTimers();});
it('validates Guest context, persisted status, plates and snapshot without fixture fallback',()=>{
 expect(mapPersistedValetRequest(dto,context).vehicle.plateBody).toBe('123ABC');expect(mapPersistedVehicle(vehicle,context).hasActiveRequest).toBe(true);
 for(const r of [{...dto,stayId:'foreign'},{...dto,status:'COMPLETED'},{...dto,vehicle:{...dto.vehicle,plateBody:'1234ABC'}}])expect(()=>mapPersistedValetRequest(r,context)).toThrow();expect(()=>mapPersistedVehicle({...vehicle,location:'GARAGE'},context)).toThrow();
});
it('uses only Guest HTTP routes, preserves idempotency key and CAS precision, exposes no completion method',async()=>{
 const service=new HttpPersistedValetService();const input={serviceDate:dto.serviceDate,deliveryTime:dto.deliveryTime};
 await service.create(context,vehicleId,input,'valet-intent-123456');await service.edit(context,dto.id,input,dto.updatedAt);await service.cancel(context,dto.id,dto.updatedAt);
 expect(request.mock.calls[0][1].headers['Idempotency-Key']).toBe('valet-intent-123456');expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({...input,expectedUpdatedAt:dto.updatedAt});expect(JSON.parse(request.mock.calls[2][1].body)).toEqual({expectedUpdatedAt:dto.updatedAt});expect('complete' in service).toBe(false);expect('return' in service).toBe(false);
});
it('polls Staff states and keeps DONE history without a Guest completion or custody action',async()=>{
 jest.useFakeTimers();notifyManager.setScheduler(cb=>cb());const ui=await render(tree(<ValetRequestsSection filter="ACTIVE"/>));await act(async()=>{await jest.advanceTimersByTimeAsync(0);});expect(ui.getByText('Solicitado')).toBeTruthy();expect(ui.queryByLabelText('Marcar como recibido')).toBeNull();
 rows=[{...dto,status:'IN_PROGRESS'}];await act(async()=>{await jest.advanceTimersByTimeAsync(10000);});expect(ui.getByText('En proceso')).toBeTruthy();rows=[{...dto,status:'DONE'}];await act(async()=>{await jest.advanceTimersByTimeAsync(10000);});expect(ui.queryByTestId(`valet-request-${dto.id}`)).toBeNull();await ui.rerender(tree(<ValetRequestsSection filter="COMPLETED"/>));expect(ui.getByText('Completado')).toBeTruthy();const count=request.mock.calls.length;await act(async()=>{await jest.advanceTimersByTimeAsync(30000);});expect(request).toHaveBeenCalledTimes(count);
});
it('keeps real empty and network error instead of mock vehicles',async()=>{request.mockResolvedValue([]);const ui=await render(tree(<ValetRequestsSection/>));await waitFor(()=>expect(ui.getByText('Sin solicitudes Valet.')).toBeTruthy());expect(ui.queryByText('Toyota')).toBeNull();});

const stayService={getCurrentStay:async()=>({...currentStayFixture,id:context.reservationStayId,reservationId:context.reservationId,arrival:'2030-01-01',departure:'2030-01-04',timezone:'America/Guatemala',status:'IN_HOUSE'})};
function realScreen(){return tree(<AppClockProvider initialMode="CUSTOM" initialCustomDate={new Date('2030-01-02T14:00:00Z')}><RealValetScreen stayService={stayService}/></AppClockProvider>);}
it('real route preserves vehicle selection and date/time surface, never simulates Transfers or Guest custody',async()=>{
 request.mockImplementation(async path=>path==='/api/v1/guest-auth/account/valet-vehicles'?[{...vehicle,id:vehicleId,canAssociate:false}]:path.endsWith('/valet-vehicles')?[{...vehicle,hasActiveRequest:false}]:[]);const ui=await render(realScreen());await waitFor(()=>expect(ui.getByTestId('valet-vehicle-card').props.accessibilityState.disabled).toBe(false));
 await fireEvent.press(ui.getByTestId('valet-vehicle-card'));await waitFor(()=>expect(ui.getByTestId(`valet-session-vehicle-option-${vehicleId}`)).toBeTruthy());await fireEvent.press(ui.getByTestId(`valet-session-vehicle-option-${vehicleId}`));expect(ui.getByTestId('valet-vehicle-configuration')).toBeTruthy();expect(ui.getByTestId('valet-request-date-selector')).toBeTruthy();expect(ui.getByTestId('valet-request-time-picker')).toBeTruthy();expect(ui.queryByTestId('transfer-reserve-button')).toBeNull();expect(ui.queryByTestId(`valet-return-${vehicleId}`)).toBeNull();
});
it('retains the same creation key after unknown HTTP outcome and only navigates on persisted success',async()=>{
 let attempts=0;request.mockImplementation(async(path,init)=>{if(init?.method==='POST'){attempts++;if(attempts===1)throw new Error('Unknown outcome');return {...dto,...JSON.parse(init.body as string)};}return path==='/api/v1/guest-auth/account/valet-vehicles'?[{...vehicle,id:vehicleId,canAssociate:false}]:path.endsWith('/valet-vehicles')?[{...vehicle,hasActiveRequest:false}]:[];});
 const ui=await render(realScreen());await waitFor(()=>expect(ui.getByTestId('valet-vehicle-card').props.accessibilityState.disabled).toBe(false));await fireEvent.press(ui.getByTestId('valet-vehicle-card'));await fireEvent.press(ui.getByTestId(`valet-session-vehicle-option-${vehicleId}`));await fireEvent.press(ui.getByTestId('valet-request-button'));await waitFor(()=>expect(ui.getByText(/No pudimos confirmar el resultado/)).toBeTruthy());expect(router.replace).not.toHaveBeenCalled();await fireEvent.press(ui.getByTestId('valet-request-button'));await waitFor(()=>expect(router.replace).toHaveBeenCalledWith('/account'));
 const writes=request.mock.calls.filter(([,init])=>init?.method==='POST');expect(writes).toHaveLength(2);expect(writes[0][1].headers['Idempotency-Key']).toBe(writes[1][1].headers['Idempotency-Key']);
});
it('freezes the version when editing a real request rather than adopting a Staff refetch',async()=>{
 (useLocalSearchParams as jest.Mock).mockReturnValue({editRequestId:dto.id});const ui=await render(realScreen());await waitFor(()=>expect(ui.getByTestId('valet-request-button')).toBeTruthy());rows=[{...dto,status:'IN_PROGRESS',updatedAt:'2030-01-01T01:00:00Z'}];await act(async()=>{await client.invalidateQueries({queryKey:['guest-valet']});});expect(ui.getByTestId('valet-request-button')).toBeTruthy();await fireEvent.press(ui.getByTestId('valet-request-button'));await waitFor(()=>expect(request.mock.calls.some(([,init])=>init?.method==='PUT')).toBe(true));expect(JSON.parse(request.mock.calls.find(([,init])=>init?.method==='PUT')![1].body).expectedUpdatedAt).toBe(dto.updatedAt);expect(ui.queryByLabelText('Marcar como recibido')).toBeNull();
 (useLocalSearchParams as jest.Mock).mockReturnValue({});
});

it('reuses a saved account vehicle with an explicit fresh location and retry key without old requests',async()=>{
 const saved={...vehicle,id:vehicleId,canAssociate:true};let associated=false;let attempts=0;
 request.mockImplementation(async(path,init)=>{if(path.endsWith('/associate')){attempts++;if(attempts===1)throw new Error('Unknown association');associated=true;return {...vehicle,id:'00000000-0000-4000-8000-000000000009',hasActiveRequest:false,location:'WITH_GUEST'};}if(path==='/api/v1/guest-auth/account/valet-vehicles')return [{...saved,canAssociate:!associated}];if(path.endsWith('/valet-vehicles'))return associated?[{...vehicle,id:'00000000-0000-4000-8000-000000000009',hasActiveRequest:false,location:'WITH_GUEST'}]:[];return [];});
 const ui=await render(realScreen());await waitFor(()=>expect(ui.getByTestId(`valet-associate-${vehicleId}`)).toBeTruthy());await fireEvent.press(ui.getByTestId(`valet-associate-${vehicleId}`));expect(ui.getByTestId('valet-confirm-association').props.accessibilityState.disabled).toBe(true);expect(request.mock.calls.some(([p])=>p.endsWith('/associate'))).toBe(false);
 await fireEvent.press(ui.getByRole('radio',{name:'Conmigo'}));await fireEvent.press(ui.getByTestId('valet-confirm-association'));await waitFor(()=>expect(ui.getByText(/No pudimos confirmar el resultado/)).toBeTruthy());expect(router.replace).not.toHaveBeenCalled();await fireEvent.press(ui.getByTestId('valet-confirm-association'));await waitFor(()=>expect(ui.getByText('Vehículo asociado a esta estadía.')).toBeTruthy());const writes=request.mock.calls.filter(([p])=>p.endsWith('/associate'));expect(writes).toHaveLength(2);expect(writes[0][1].headers['Idempotency-Key']).toBe(writes[1][1].headers['Idempotency-Key']);expect(JSON.parse(writes[1][1].body)).toEqual({savedVehicleId:vehicleId,expectedVehicleUpdatedAt:vehicle.updatedAt,location:'WITH_GUEST'});expect(router.replace).not.toHaveBeenCalled();
});
it('shows a saved vehicle with unresolved custody as unavailable instead of simulating an association',async()=>{
 request.mockImplementation(async path=>path==='/api/v1/guest-auth/account/valet-vehicles'?[{...vehicle,canAssociate:false}]:[]);const ui=await render(realScreen());await waitFor(()=>expect(ui.getByTestId(`valet-associate-${vehicleId}`).props.accessibilityState.disabled).toBe(true));expect(ui.getByText('Tiene una estancia operativa, custodia o solicitud pendiente.')).toBeTruthy();expect(ui.queryByTestId('valet-confirm-association')).toBeNull();
});

it('refreshes saved custody after exceptional Staff release even with no active service requests',async()=>{
 jest.useFakeTimers();notifyManager.setScheduler(cb=>cb());let available=false;request.mockImplementation(async path=>path==='/api/v1/guest-auth/account/valet-vehicles'?[{...vehicle,canAssociate:available}]:[]);
 const ui=await render(realScreen());await act(async()=>{await jest.advanceTimersByTimeAsync(0);});expect(ui.getByTestId(`valet-associate-${vehicleId}`).props.accessibilityState.disabled).toBe(true);available=true;await act(async()=>{await jest.advanceTimersByTimeAsync(10000);});expect(ui.getByTestId(`valet-associate-${vehicleId}`).props.accessibilityState.disabled).toBe(false);expect(request.mock.calls.some(([,init])=>init?.method==='POST')).toBe(false);
});

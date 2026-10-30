import {act,fireEvent,render,waitFor} from '@testing-library/react-native';
import {QueryClientProvider} from '@tanstack/react-query';
import {Pressable,Text} from 'react-native';
import {createTestQueryClient} from '@/test/queryClient';
import {ConnectedHotelScreen} from '@/modules/hotel';
import {GuestAuthSessionProvider} from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import {ActiveReservationContextProvider,useActiveReservationContext} from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import {nativeGuestClient} from '@/modules/guest-auth/data/http/NativeGuestClient';
import {NetworkError} from '@/data/remote/http/HttpError';
jest.mock('@/config/environment',()=>({environment:{useMockApi:false},requireApiBaseUrl:()=> 'https://pms.example.test'}));
jest.mock('expo-router',()=>({...jest.requireActual('expo-router'),useFocusEffect:jest.fn()}));
const accountId='qa-account';const a={reservationId:'reservation-a',reservationStayId:'stay-a'},b={reservationId:'reservation-b',reservationStayId:'stay-b'};
const linked=[{reservationId:a.reservationId,stayId:a.reservationStayId,confirmationCode:'REAL-A',propertyName:'Hotel Real A',roomCode:'201',arrival:'2026-10-30',departure:'2026-11-02',status:'IN_HOUSE'},{reservationId:b.reservationId,stayId:b.reservationStayId,confirmationCode:'REAL-B',propertyName:'Hotel Real B',roomCode:'301',arrival:'2026-11-01',departure:'2026-11-05',status:'RESERVED'}];
const stay=(index:number)=>({...linked[index],id:linked[index].stayId,roomType:{id:'type-'+index,name:'Habitación real '+index},room:{id:'room-'+index,code:linked[index].roomCode},timezone:'America/Guatemala'});
function ChangeStay(){const {setActiveReservationContext}=useActiveReservationContext();return <Pressable testID="change-stay" onPress={()=>setActiveReservationContext(b)}><Text>Cambiar</Text></Pressable>;}
function setup(){const client=createTestQueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});return {client,mount:()=>render(<QueryClientProvider client={client}><GuestAuthSessionProvider initialSession={{accountId}}><ActiveReservationContextProvider initialActiveReservationContext={a}><ChangeStay/><ConnectedHotelScreen/></ActiveReservationContextProvider></GuestAuthSessionProvider></QueryClientProvider>)};}
afterEach(()=>jest.restoreAllMocks());
function mockHttp(readB:()=>Promise<unknown>=async()=>stay(1)){
 return jest.spyOn(nativeGuestClient,'request').mockImplementation(async path=>{
 if(path.endsWith('/account/summary'))return {guestAccountId:accountId,email:'guest@example.test',active:true};
 if(path.endsWith('/reconcile'))return null;if(path.endsWith('/account/reservations'))return linked;
 if(path.endsWith('/stay-a'))return stay(0);if(path.endsWith('/stay-b'))return readB();throw new Error('Unexpected HTTP route');
 });
}
it('loads selected-stay data and clears A immediately while B loads without crossing scopes',async()=>{
 let resolveB!:(value:unknown)=>void;const pendingB=new Promise(resolve=>{resolveB=resolve;});mockHttp(()=>pendingB);const {client,mount}=setup(),ui=await mount();
 await waitFor(()=>expect(ui.getByText('Habitación · 201')).toBeTruthy());expect(ui.getByText('Hotel Real A')).toBeTruthy();expect(ui.getByText('Llegada · 2026-10-30')).toBeTruthy();expect(ui.getByText('Reserva · REAL-A')).toBeTruthy();expect(ui.getByText('En curso')).toBeTruthy();
 await fireEvent.press(ui.getByTestId('change-stay'));expect(ui.queryByText('Habitación · 201')).toBeNull();expect(ui.queryByText('Reserva · REAL-A')).toBeNull();expect(ui.queryByText('Hotel Real A')).toBeNull();
 await act(async()=>resolveB(stay(1)));await waitFor(()=>expect(ui.getByText('Habitación · 301')).toBeTruthy());expect(ui.getByText('Hotel Real B')).toBeTruthy();expect(ui.getByText('Salida · 2026-11-05')).toBeTruthy();expect(ui.getByText('Pendiente de entrada')).toBeTruthy();expect(ui.getByText('Reserva · REAL-B')).toBeTruthy();
 for(const text of ['Red · Hotel_Demo','Contraseña · DemoWifi2026','recepcion@example.test','+502 5555 0100','Calle Ejemplo 123, Ciudad de Guatemala'])expect(ui.getByText(text)).toBeTruthy();
 expect(ui.queryByText(/Vista de demostración|Información en configuración|Consulta al equipo/)).toBeNull();await ui.unmount();client.clear();
});
it('does not replace a real stay error with mock room or dates',async()=>{
 mockHttp(async()=>{throw new NetworkError();});const {client,mount}=setup(),ui=await mount();await waitFor(()=>expect(ui.getByText('Habitación · 201')).toBeTruthy());await fireEvent.press(ui.getByTestId('change-stay'));await waitFor(()=>expect(ui.getByText('No pudimos consultar la estancia.')).toBeTruthy());expect(ui.queryByText('Habitación · 201')).toBeNull();expect(ui.queryByText('Habitación · 301')).toBeNull();expect(ui.getByText('Wi‑Fi')).toBeTruthy();await ui.unmount();client.clear();
});

import HotelRoute from '../app/(guest)/hotel';
import ProfileRoute from '../app/(guest)/account/profile';
import RewardsRoute from '../app/(guest)/account/rewards';
import PromotionsRoute from '../app/(guest)/account/promotions';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act,fireEvent,render,waitFor} from '@testing-library/react-native';
import {renderRouter} from 'expo-router/testing-library';
import {router,Slot,usePathname,useLocalSearchParams} from 'expo-router';
import {Text,AppState} from 'react-native';
import {environment} from '@/config/environment';
import {GuestRouteGuard} from '@/modules/guest-auth/presentation/GuestRouteGuard';
import {GuestAuthSessionProvider} from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import {ActiveReservationContextProvider,useActiveReservationContext} from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import {LinkedReservationsScreen} from '@/modules/guest-auth/presentation/LinkedReservationsScreen';
import {LoginScreen} from '@/modules/guest-auth/presentation/LoginScreen';
import {guestAuthService} from '@/modules/guest-auth/data/services/guestServices';
import {nativeGuestClient} from '@/modules/guest-auth/data/http/NativeGuestClient';
import {currentStayFixture} from '@/modules/stay/data/mocks/currentStayFixture';
import {GuestNavigationShell} from '@/modules/navigation';
import {AppClockProvider} from '@/shared/time';
import {valetContinuation} from '@/modules/guest-auth/presentation/guestContinuation';
import GuestLayout from '../app/(guest)/_layout';
import ValetRoute from '../app/(guest)/valet';

jest.mock('@/config/environment',()=>({environment:{useMockApi:false},requireApiBaseUrl:()=> 'https://pms.example.test'}));
const first={reservationId:'11111111-1111-4111-8111-111111111111',reservationStayId:'22222222-2222-4222-8222-222222222222'};
const second={reservationId:'33333333-3333-4333-8333-333333333333',reservationStayId:'44444444-4444-4444-8444-444444444444'};
const property='55555555-5555-4555-8555-555555555555';
const summary=(c:typeof first)=>({...c,reference:c===first?'FIRST':'SECOND',arrival:'2030-01-01',departure:'2030-01-04',roomLabel:'204'});
let client:QueryClient;let request:jest.SpyInstance;
function Home(){const {activeReservationContext:c}=useActiveReservationContext();return <><Text testID="home-stay">{c?.reservationStayId}</Text><GuestNavigationShell/></>;}
function Login(){return <LoginScreen service={{login:async()=>({accountId:'guest'})}}/>;}
function Selection(){return <LinkedReservationsScreen service={{listForAccount:async()=>[summary(first),summary(second)]}}/>;}
function Location(){const pathname=usePathname();const params=useLocalSearchParams();return <Text testID="location">{pathname}:{String(params.returnTo??'')}</Text>;}
async function setup({context=first,session=true,url='/valet',single=false}:{context?:typeof first|null;session?:boolean;url?:string;single?:boolean}={}){
 function Root(){return <AppClockProvider initialMode="CUSTOM" initialCustomDate={new Date('2030-01-02T14:00:00Z')}><QueryClientProvider client={client}><GuestAuthSessionProvider initialSession={session?{accountId:'guest'}:null}><ActiveReservationContextProvider initialActiveReservationContext={context}><Location/><GuestRouteGuard><Slot/></GuestRouteGuard></ActiveReservationContextProvider></GuestAuthSessionProvider></QueryClientProvider></AppClockProvider>;}
 function Single(){return <LinkedReservationsScreen service={{listForAccount:async()=>[summary(first)]}}/>;}
 return renderRouter({_layout:Root,login:Login,reservations:single?Single:Selection,'(guest)/_layout':GuestLayout,'(guest)/valet':ValetRoute,'(guest)/account':Home,'(guest)/hotel':HotelRoute,'(guest)/account/rewards':RewardsRoute,'(guest)/account/promotions':PromotionsRoute,'(guest)/account/profile':ProfileRoute},{initialUrl:url});
}
beforeEach(()=>{
 AppState.currentState='active';client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{retry:false,gcTime:0}}});
 jest.spyOn(guestAuthService,'restore').mockResolvedValue(null);
 request=jest.spyOn(nativeGuestClient,'request').mockImplementation(async path=>{
  const c=path.includes(second.reservationStayId)?second:first;
  if(path==='/api/v1/guest-auth/account/valet-vehicles')return [];
  if(path.endsWith('/valet-vehicles'))return [{savedVehicleId:'77777777-7777-4777-8777-777777777777',id:'66666666-6666-4666-8666-666666666666',propertyId:property,stayId:c.reservationStayId,make:c===first?'Toyota':'Honda',model:'QA',platePrefix:'P',plateBody:'123ABC',color:null,location:'PARKED',createdAt:'2030-01-01T00:00:00Z',updatedAt:'2030-01-01T00:00:00Z',hasActiveRequest:false}];
  if(path.endsWith('/valet-requests'))return [];
  return {...currentStayFixture,id:c.reservationStayId,reservationId:c.reservationId,timezone:'America/Guatemala',room:null,arrival:'2030-01-01',departure:'2030-01-04',status:'IN_HOUSE'};
 });
});
afterEach(()=>{client.clear();jest.restoreAllMocks();});
it('opens the actual HTTP Valet route through the root guard with an active stay',async()=>{
 const ui=await setup();await waitFor(()=>expect(ui.getByTestId('valet-real-screen')).toBeTruthy());expect(ui.getByTestId('location')).toHaveTextContent(/^\/valet:/);expect(ui.queryByTestId('guest-real-feature-unavailable')).toBeNull();expect(ui.queryByTestId('linked-reservations-screen')).toBeNull();await waitFor(()=>expect(ui.getByText('Toyota QA')).toBeTruthy());
 expect(request.mock.calls.every(([path])=>(path==='/api/v1/guest-auth/account/valet-vehicles'||path.includes(first.reservationStayId)))).toBe(true);
});
it('selects a linked stay then resumes Valet without mounting HTTP queries beforehand or looping',async()=>{
 const ui=await setup({context:null});await waitFor(()=>expect(ui.getByTestId('linked-reservations-screen')).toBeTruthy());expect(ui.getByTestId('location')).toHaveTextContent('/reservations:/valet');expect(request).not.toHaveBeenCalled();
 await fireEvent.press(ui.getByTestId(`linked-reservation-${second.reservationStayId}`));await fireEvent.press(ui.getByTestId('linked-reservations-continue'));await waitFor(()=>expect(ui.getByTestId('valet-real-screen')).toBeTruthy());await waitFor(()=>expect(ui.getByText('Honda QA')).toBeTruthy());expect(ui.getByTestId('location')).toHaveTextContent(/^\/valet:/);expect(ui.queryByTestId('linked-reservations-screen')).toBeNull();expect(request.mock.calls.every(([path])=>(path==='/api/v1/guest-auth/account/valet-vehicles'||path.includes(second.reservationStayId)))).toBe(true);
});
it('auto-selects one genuine linked stay and resumes Valet',async()=>{
 const ui=await setup({context:null,single:true});await waitFor(()=>expect(ui.getByTestId('valet-real-screen')).toBeTruthy());await waitFor(()=>expect(ui.getByText('Toyota QA')).toBeTruthy());expect(ui.getByTestId('location')).toHaveTextContent(/^\/valet:/);
});
it('requires Guest login and preserves the Valet continuation through login and selection',async()=>{
 const ui=await setup({context:null,session:false});await waitFor(()=>expect(ui.getByTestId('guest-login-screen')).toBeTruthy());expect(request).not.toHaveBeenCalled();expect(ui.getByTestId('location')).toHaveTextContent('/login:/valet');
 await fireEvent.changeText(ui.getByTestId('guest-login-email'),'qa@example.test');await fireEvent.changeText(ui.getByTestId('guest-login-password'),'synthetic-fixture');await fireEvent.press(ui.getByTestId('guest-login-submit'));await waitFor(()=>expect(ui.getByTestId('linked-reservations-screen')).toBeTruthy());expect(ui.getByTestId('location')).toHaveTextContent('/reservations:/valet');
 await fireEvent.press(ui.getByTestId(`linked-reservation-${first.reservationStayId}`));await fireEvent.press(ui.getByTestId('linked-reservations-continue'));await waitFor(()=>expect(ui.getByTestId('valet-real-screen')).toBeTruthy());
});
it('changes stay with confirmation, keeps the default home destination, then opens isolated Valet data',async()=>{
 const ui=await setup();await waitFor(()=>expect(ui.getByText('Toyota QA')).toBeTruthy());await act(async()=>router.replace('/reservations'));await waitFor(()=>expect(ui.getByTestId('linked-reservations-screen')).toBeTruthy());
 await fireEvent.press(ui.getByTestId(`linked-reservation-${second.reservationStayId}`));await fireEvent.press(ui.getByTestId('linked-reservations-continue'));expect(ui.getByTestId('linked-reservations-change-confirmation')).toBeTruthy();await fireEvent.press(ui.getByTestId('linked-reservations-change-confirmation-confirm'));await waitFor(()=>expect(ui.getByTestId('home-stay')).toHaveTextContent(second.reservationStayId));
 await fireEvent.press(ui.getByTestId('guest-navigation-tab-valet'));await waitFor(()=>expect(ui.getByText('Honda QA')).toBeTruthy());expect(ui.queryByText('Toyota QA')).toBeNull();expect(ui.getByTestId('location')).toHaveTextContent(/^\/valet:/);
});
it('never promotes arbitrary return paths into a navigation target',()=>{
 for(const input of ['https://attacker.test','//attacker.test','/account/checkout',['/valet'],'/valet?stayId=other',undefined])expect(valetContinuation(input)).toBeNull();expect(valetContinuation('/valet')).toBe('/valet');
});
it('keeps the mock context policy intact without enabling real requests',async()=>{
 jest.replaceProperty(environment,'useMockApi',true);
 // The existing mock suites own the mock screen; this regression checks the shared guard boundary.
 const ui=await render(<QueryClientProvider client={client}><GuestAuthSessionProvider initialSession={{accountId:'mock-guest'}}><ActiveReservationContextProvider initialActiveReservationContext={first}><GuestRouteGuard><Text>Mock route permitted</Text></GuestRouteGuard></ActiveReservationContextProvider></GuestAuthSessionProvider></QueryClientProvider>);
 expect(ui.getByText('Mock route permitted')).toBeTruthy();expect(request).not.toHaveBeenCalled();
});

it('keeps delayed vehicle data from the previous stay out of the new Valet route',async()=>{
 const original=request.getMockImplementation()!;let release!:(value:unknown)=>void;const pending=new Promise(resolve=>{release=resolve;});
 request.mockImplementation(async path=>path.includes(first.reservationStayId)&&path.endsWith('/valet-vehicles')?pending:original(path));
 const ui=await setup();await waitFor(()=>expect(ui.getByTestId('valet-real-screen')).toBeTruthy());await act(async()=>router.replace({pathname:'/reservations',params:{returnTo:'/valet'}}));await waitFor(()=>expect(ui.getByTestId('linked-reservations-screen')).toBeTruthy());
 await fireEvent.press(ui.getByTestId(`linked-reservation-${second.reservationStayId}`));await fireEvent.press(ui.getByTestId('linked-reservations-continue'));await fireEvent.press(ui.getByTestId('linked-reservations-change-confirmation-confirm'));await waitFor(()=>expect(ui.getByText('Honda QA')).toBeTruthy());
 const old=await original(`/api/v1/guest-auth/account/reservations/${first.reservationId}/stays/${first.reservationStayId}/valet-vehicles`);await act(async()=>release(old));expect(ui.queryByText('Toyota QA')).toBeNull();expect(ui.getByText('Honda QA')).toBeTruthy();
});

it('drops an association draft on stay change while retaining account-only saved identity',async()=>{
 const original=request.getMockImplementation()!;const savedId='99999999-9999-4999-8999-999999999999';request.mockImplementation(async(path,init)=>path==='/api/v1/guest-auth/account/valet-vehicles'?[{id:savedId,make:'Mazda',model:'Saved',platePrefix:'P',plateBody:'456ABC',color:null,createdAt:'2030-01-01T00:00:00Z',updatedAt:'2030-01-01T00:00:00Z',canAssociate:true}]:original(path,init));
 const ui=await setup();await waitFor(()=>expect(ui.getByTestId(`valet-associate-${savedId}`)).toBeTruthy());await fireEvent.press(ui.getByTestId(`valet-associate-${savedId}`));await fireEvent.press(ui.getByRole('radio',{name:'Conmigo'}));expect(ui.getByTestId('valet-confirm-association')).toBeTruthy();
 await act(async()=>router.replace({pathname:'/reservations',params:{returnTo:'/valet'}}));await waitFor(()=>expect(ui.getByTestId('linked-reservations-screen')).toBeTruthy());await fireEvent.press(ui.getByTestId(`linked-reservation-${second.reservationStayId}`));await fireEvent.press(ui.getByTestId('linked-reservations-continue'));await fireEvent.press(ui.getByTestId('linked-reservations-change-confirmation-confirm'));await waitFor(()=>expect(ui.getByText('Honda QA')).toBeTruthy());expect(ui.queryByTestId('valet-confirm-association')).toBeNull();expect(ui.getByTestId(`valet-associate-${savedId}`)).toBeTruthy();expect(request.mock.calls.some(([,init])=>init?.method==='POST')).toBe(false);expect(ui.queryByText('Toyota QA')).toBeNull();
});

it('Hotel and lightweight Guest routes preserve the selected stay and never expose Chat',async()=>{const ui=await setup({url:'/account'});await waitFor(()=>expect(ui.getByTestId('home-stay')).toHaveTextContent(first.reservationStayId));await fireEvent.press(ui.getByRole('tab',{name:'Hotel'}));await waitFor(()=>expect(ui.getByTestId('hotel-screen')).toBeTruthy());expect(ui.queryByLabelText('Abrir chat')).toBeNull();await fireEvent.press(ui.getByRole('tab',{name:'Inicio'}));await waitFor(()=>expect(ui.getByTestId('home-stay')).toHaveTextContent(first.reservationStayId));for(const [path,content] of [['/account/rewards','rewards-metrics'],['/account/promotions','promotions-items'],['/account/profile','profile-identity']] as const){await act(async()=>router.push(path));await waitFor(()=>expect(ui.getByTestId(content)).toBeTruthy());expect(ui.getByTestId('demo-content-notice')).toBeTruthy();expect(ui.queryByText(/Próximamente/)).toBeNull();await fireEvent.press(ui.getByLabelText('Volver a mi cuenta'));await waitFor(()=>expect(ui.getByTestId('home-stay')).toHaveTextContent(first.reservationStayId));}});

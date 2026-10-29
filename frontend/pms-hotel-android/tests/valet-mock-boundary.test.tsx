import {QueryClientProvider} from '@tanstack/react-query';
import {fireEvent,render,waitFor} from '@testing-library/react-native';
import {createTestQueryClient} from '../src/test/queryClient';
import {ActiveReservationContextProvider} from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import {SessionServiceRequestsProvider} from '@/modules/service-requests';
import {SessionVehiclesProvider} from '@/modules/valet';
import {AppClockProvider} from '@/shared/time';
import {nativeGuestClient} from '@/modules/guest-auth/data/http/NativeGuestClient';
import ValetRoute from '../app/(guest)/valet';

jest.mock('@/config/environment',()=>({environment:{useMockApi:true},requireApiBaseUrl:()=> 'https://pms.example.test'}));
jest.mock('expo-router',()=>({...jest.requireActual('expo-router'),useLocalSearchParams:()=>({})}));

it('selects the mock route and keeps its vehicle UX isolated from Guest HTTP persistence',async()=>{
 const request=jest.spyOn(nativeGuestClient,'request').mockRejectedValue(new Error('HTTP must not be called in mock Valet'));
 try{
  const ui=await render(<QueryClientProvider client={createTestQueryClient()}><ActiveReservationContextProvider initialActiveReservationContext={{reservationId:'mock-reservation',reservationStayId:'mock-stay'}}><SessionServiceRequestsProvider><SessionVehiclesProvider><AppClockProvider initialMode="CUSTOM" initialCustomDate={new Date('2026-09-11T15:00:00Z')}><ValetRoute/></AppClockProvider></SessionVehiclesProvider></SessionServiceRequestsProvider></ActiveReservationContextProvider></QueryClientProvider>);
  await waitFor(()=>expect(ui.getByTestId('valet-screen')).toBeTruthy());expect(ui.queryByTestId('valet-real-screen')).toBeNull();await fireEvent.press(ui.getByTestId('valet-register-vehicle'));await fireEvent.changeText(ui.getByTestId('register-vehicle-make'),'Toyota');await fireEvent.changeText(ui.getByTestId('register-vehicle-model'),'Corolla');await fireEvent.changeText(ui.getByTestId('register-vehicle-license-plate'),'123ABC');await fireEvent.press(ui.getByTestId('register-vehicle-submit'));expect(ui.getByText(/Toyota Corolla/)).toBeTruthy();expect(request).not.toHaveBeenCalled();
 }finally{request.mockRestore();}
});

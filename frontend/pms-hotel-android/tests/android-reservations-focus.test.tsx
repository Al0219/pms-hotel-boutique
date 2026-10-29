import { act, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GuestAuthSessionProvider } from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import { ActiveReservationContextProvider } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { LinkedReservationsScreen } from '@/modules/guest-auth/presentation/LinkedReservationsScreen';
let mockFocusCallback: () => void;
jest.mock('@/config/environment', () => ({ environment: { useMockApi: false } }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() }, useLocalSearchParams: () => ({}), useFocusEffect: jest.fn((callback) => { mockFocusCallback = callback; }) }));
it('fetches newly linked reservations on return to the existing reservations screen', async () => {
 const listForAccount=jest.fn().mockResolvedValueOnce([]).mockResolvedValue([
  {reservationId:'r',reservationStayId:'new-stay',reference:'REAL-NEW',arrival:'2036-01-01',departure:'2036-01-03',roomLabel:null},
  {reservationId:'r',reservationStayId:'second-stay',reference:'REAL-NEW',arrival:'2036-01-01',departure:'2036-01-03',roomLabel:null},
 ]);
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const view=await render(<QueryClientProvider client={client}><GuestAuthSessionProvider initialSession={{accountId:'same-account'}}><ActiveReservationContextProvider><LinkedReservationsScreen service={{listForAccount}} /></ActiveReservationContextProvider></GuestAuthSessionProvider></QueryClientProvider>);
 await waitFor(()=>expect(view.getByTestId('linked-reservations-empty')).toBeTruthy());
 await act(async()=>mockFocusCallback());
 await waitFor(()=>expect(view.getByTestId('linked-reservation-new-stay')).toBeTruthy());
 expect(listForAccount).toHaveBeenCalledTimes(2);expect(listForAccount).toHaveBeenLastCalledWith('same-account');
 await view.unmount();client.clear();
});

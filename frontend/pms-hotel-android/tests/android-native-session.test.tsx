import {createTestQueryClient} from '../src/test/queryClient';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GuestAuthSessionProvider, useGuestAuthSession } from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import { ActiveReservationContextProvider, useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { GuestRouteGuard } from '@/modules/guest-auth/presentation/GuestRouteGuard';
import { guestAuthService } from '@/modules/guest-auth/data/services/guestServices';
import { nativeGuestClient } from '@/modules/guest-auth/data/http/NativeGuestClient';
import { NetworkError } from '@/data/remote/http/HttpError';

jest.mock('@/config/environment', () => ({ environment: { useMockApi: false } }));
jest.mock('@/modules/guest-auth/data/services/guestServices', () => ({ guestAuthService: { restore: jest.fn() } }));
jest.mock('@/modules/guest-auth/data/http/NativeGuestClient', () => ({ nativeGuestClient: { onExpired: jest.fn() } }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() }, usePathname: () => '/account', useGlobalSearchParams: () => ({}) }));

function Identity() {
  const { session, sessionExpired } = useGuestAuthSession();
  const { activeReservationContext } = useActiveReservationContext();
  return <Text>{`${session?.accountId ?? 'signed-out'}:${sessionExpired}:${activeReservationContext?.reservationStayId ?? 'none'}`}</Text>;
}
function tree(client = createTestQueryClient()) {
  return <QueryClientProvider client={client}><GuestAuthSessionProvider><ActiveReservationContextProvider initialActiveReservationContext={{ reservationId: 'r', reservationStayId: 's' }}><GuestRouteGuard><Identity /></GuestRouteGuard></ActiveReservationContextProvider></GuestAuthSessionProvider></QueryClientProvider>;
}
beforeEach(() => {
  jest.clearAllMocks();
  (nativeGuestClient.onExpired as jest.Mock).mockReturnValue(jest.fn());
});
it('blocks protected children until native restore completes', async () => {
  let finish!: (session: { accountId: string }) => void;
  (guestAuthService.restore as jest.Mock).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const view = await render(tree());
  expect(view.getByTestId('guest-session-restoring')).toBeTruthy();
  expect(view.queryByText('restored:false:s')).toBeNull();
  await act(async () => finish({ accountId: 'restored' }));
  expect(view.getByText('restored:false:s')).toBeTruthy();
});
it('offline restore offers an explicit retry without mounting protected screens', async () => {
  (guestAuthService.restore as jest.Mock).mockRejectedValueOnce(new NetworkError()).mockResolvedValueOnce({ accountId: 'restored' });
  const view = await render(tree());
  await waitFor(() => expect(view.getByTestId('guest-session-restore-error')).toBeTruthy());
  await fireEvent.press(view.getByText('Reintentar'));
  await waitFor(() => expect(view.getByText('restored:false:s')).toBeTruthy());
});
it('expiration clears private queries and prevents the old stay from rendering', async () => {
  let expire!: () => void;
  (nativeGuestClient.onExpired as jest.Mock).mockImplementation((listener) => { expire = listener; return jest.fn(); });
  (guestAuthService.restore as jest.Mock).mockResolvedValue({ accountId: 'restored' });
  const client = createTestQueryClient(); client.setQueryData(['stay','r','s'], { private: true });
  const view = await render(tree(client));
  await waitFor(() => expect(view.getByText('restored:false:s')).toBeTruthy());
  await act(async () => expire());
  expect(client.getQueryData(['stay','r','s'])).toBeUndefined();
  expect(view.queryByText('restored:false:s')).toBeNull();
});

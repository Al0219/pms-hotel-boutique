import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { NetworkError } from '@/data/remote/http/HttpError';
import { AccountStayHubScreen } from '@/modules/account';
import { type ReservationStayDto } from '@/modules/stay/data/dtos/ReservationStayDto';
import { currentStayFixture } from '@/modules/stay/data/mocks/currentStayFixture';
import { MockStayService } from '@/modules/stay/data/mocks/MockStayService';
import { type StayService } from '@/modules/stay/data/services/StayService';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false } },
  });
}

function createAccountRoute(service: StayService) {
  return function AccountRoute() {
    return (
      <QueryClientProvider client={createQueryClient()}>
        <AccountStayHubScreen service={service} />
      </QueryClientProvider>
    );
  };
}

describe('Account / Stay Hub V3', () => {
  it('renders /account from ReservationStay and selects Cuenta in the approved V3 shell', async () => {
    const AccountRoute = createAccountRoute(new MockStayService({ kind: 'success', dto: currentStayFixture }));
    const rendered = await renderRouter({ account: AccountRoute }, { initialUrl: '/account' });

    await waitFor(() => expect(rendered.getByTestId('account-stay-hub-screen')).toBeTruthy());

    expect(rendered.getByText('Mi estadía')).toBeTruthy();
    expect(rendered.getByText('Habitación 204')).toBeTruthy();
    expect(rendered.getByText('Deluxe King')).toBeTruthy();
    expect(rendered.getByText('HB-2026-004281')).toBeTruthy();
    expect(rendered.queryByText('REMOTE_STATUS')).toBeNull();
    expect(rendered.queryByTestId('account-stay-status')).toBeNull();
    expect(rendered.getByLabelText('Cuenta').props.accessibilityState).toEqual({ disabled: false, selected: true });
    expect(rendered.getByLabelText('Servicios').props.accessibilityState).toEqual({ disabled: false, selected: false });
    expect(rendered.queryByText('Inicio')).toBeNull();
  });

  it('keeps room nullable without inventing an assignment', async () => {
    const unassignedStay: ReservationStayDto = { ...currentStayFixture, room: null };
    const AccountRoute = createAccountRoute(new MockStayService({ kind: 'success', dto: unassignedStay }));
    const rendered = await renderRouter({ account: AccountRoute }, { initialUrl: '/account' });

    await waitFor(() => expect(rendered.getByText('Habitación por asignar')).toBeTruthy());
    expect(rendered.queryByText('Habitación 204')).toBeNull();
  });

  it('represents loading, generic error, offline, and retry through the existing Stay service boundary', async () => {
    let resolveLoading: (value: ReservationStayDto) => void;
    const loadingPromise = new Promise<ReservationStayDto>((resolve) => { resolveLoading = resolve; });
    const LoadingRoute = createAccountRoute({ getCurrentStay: () => loadingPromise });
    const loading = await renderRouter({ account: LoadingRoute }, { initialUrl: '/account' });
    expect(loading.getByTestId('account-stay-loading')).toBeTruthy();
    resolveLoading!(currentStayFixture);
    await waitFor(() => expect(loading.getByTestId('account-stay-hub-screen')).toBeTruthy());
    await loading.unmount();

    const ErrorRoute = createAccountRoute(new MockStayService({ kind: 'error', error: new Error('mock failure') }));
    const genericError = await renderRouter({ account: ErrorRoute }, { initialUrl: '/account' });
    await waitFor(() => expect(genericError.getByTestId('account-stay-error')).toBeTruthy());
    await genericError.unmount();

    const getCurrentStay = jest
      .fn<Promise<ReservationStayDto>, []>()
      .mockRejectedValueOnce(new NetworkError('offline mock'))
      .mockResolvedValueOnce(currentStayFixture);
    const OfflineRoute = createAccountRoute({ getCurrentStay });
    const offline = await renderRouter({ account: OfflineRoute }, { initialUrl: '/account' });
    await waitFor(() => expect(offline.getByTestId('account-stay-offline')).toBeTruthy());
    await fireEvent.press(offline.getByText('Reintentar'));
    await waitFor(() => expect(offline.getByTestId('account-stay-hub-screen')).toBeTruthy());
    expect(getCurrentStay).toHaveBeenCalledTimes(2);
  });

});

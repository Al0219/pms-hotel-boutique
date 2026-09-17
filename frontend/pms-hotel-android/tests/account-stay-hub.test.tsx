import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { renderRouter } from 'expo-router/testing-library';

import { NetworkError } from '@/data/remote/http/HttpError';
import { AccountStayHubScreen } from '@/modules/account';
import { GuestNoticeProvider, useGuestNotice } from '@/modules/navigation';
import { type ReservationStayDto } from '@/modules/stay/data/dtos/ReservationStayDto';
import { currentStayFixture } from '@/modules/stay/data/mocks/currentStayFixture';
import { MockStayService } from '@/modules/stay/data/mocks/MockStayService';
import { type StayService } from '@/modules/stay/data/services/StayService';
import { SessionServiceRequestsProvider } from '@/modules/service-requests';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false } },
  });
}

function NoticeTrigger() { const { showServiceRequestSuccess } = useGuestNotice(); useEffect(() => { showServiceRequestSuccess(); }, [showServiceRequestSuccess]); return null; }

function createAccountRoute(service: StayService, withNotice = false) {
  return function AccountRoute() {
    return (
      <QueryClientProvider client={createQueryClient()}><GuestNoticeProvider>{withNotice ? <NoticeTrigger /> : null}<SessionServiceRequestsProvider><AccountStayHubScreen service={service} /></SessionServiceRequestsProvider></GuestNoticeProvider></QueryClientProvider>
    );
  };
}

describe('Account / Stay Hub V3', () => {
  it('renders /account as Inicio from ReservationStay and selects Inicio in the shell', async () => {
    const AccountRoute = createAccountRoute(new MockStayService({ kind: 'success', dto: currentStayFixture }));
    const rendered = await renderRouter({ account: AccountRoute }, { initialUrl: '/account' });

    await waitFor(() => expect(rendered.getByTestId('account-stay-hub-screen')).toBeTruthy());

    expect(rendered.getByText('Mi estadía')).toBeTruthy();
    expect(rendered.queryByTestId('account-rewards-launcher')).toBeNull();
    expect(rendered.getByText('Habitación 204')).toBeTruthy();
    expect(rendered.getByText('Deluxe King')).toBeTruthy();
    expect(rendered.getByText('HB-2026-004281')).toBeTruthy();
    expect(rendered.queryByText('REMOTE_STATUS')).toBeNull();
    expect(rendered.queryByTestId('account-stay-status')).toBeNull();
    expect(rendered.getAllByText('Inicio')).toHaveLength(2);
    expect(rendered.getByLabelText('Inicio').props.accessibilityState).toEqual({ disabled: false, selected: true });
    expect(rendered.getByLabelText('Servicios').props.accessibilityState).toEqual({ disabled: false, selected: false });
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

describe('Account / service request confirmation', () => {
  it('shows the one-action confirmation after a submitted service handoff', async () => {
    const AccountRoute = createAccountRoute(new MockStayService({ kind: 'success', dto: currentStayFixture }), true);
    const rendered = await renderRouter({ account: AccountRoute }, { initialUrl: '/account' });
    await waitFor(() => expect(rendered.getByTestId('account-service-request-submitted')).toBeTruthy());
    expect(rendered.getByTestId('account-stay-hub-screen')).toBeTruthy();
    expect(rendered.queryByTestId('account-rewards-launcher')).toBeNull();
    expect(rendered.getByLabelText('Inicio').props.accessibilityState.selected).toBe(true);
    expect(rendered.getByText('Solicitud enviada')).toBeTruthy();
    expect(rendered.getByText('Tu solicitud fue registrada correctamente.')).toBeTruthy();
    expect(rendered.queryByTestId('account-service-request-submitted-cancel')).toBeNull();
    await fireEvent.press(rendered.getByTestId('account-service-request-submitted-confirm'));
    await waitFor(() => expect(rendered.queryByTestId('account-service-request-submitted')).toBeNull());
    expect(rendered.getByTestId('account-stay-hub-screen')).toBeTruthy();
  });
});

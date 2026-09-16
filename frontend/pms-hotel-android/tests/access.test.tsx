import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';

import IndexRoute from '../app/index';
import { NetworkError } from '@/data/remote/http/HttpError';
import { MockAccessService } from '@/modules/access/data/mocks/MockAccessService';
import { type AccessService } from '@/modules/access/data/services/AccessService';
import { ReservationNotFoundError } from '@/modules/access/domain/errors/ReservationNotFoundError';
import { AccessScreen } from '@/modules/access/presentation/AccessScreen';

function createQueryClient() {
  return new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
}

async function renderAccess(service: AccessService, onLinked: () => void = jest.fn()) {
  function AccessRoute() {
    return <QueryClientProvider client={createQueryClient()}><AccessScreen onLinked={onLinked} service={service} /></QueryClientProvider>;
  }

  return { onLinked, screen: await renderRouter({ access: AccessRoute }, { initialUrl: '/access' }) };
}

async function fillValidAccess(screen: Awaited<ReturnType<typeof renderAccess>>['screen']) {
  await fireEvent.changeText(screen.getByTestId('access-reservation-code'), 'HB-2026-004281');
  await fireEvent.changeText(screen.getByTestId('access-email'), 'ana@example.com');
}

describe('Access / Vincular reserva', () => {
  it('redirects root to /access', async () => {
    function AccessRoute() {
      return <QueryClientProvider client={createQueryClient()}><AccessScreen service={new MockAccessService()} /></QueryClientProvider>;
    }
    const screen = await renderRouter({ index: IndexRoute, access: AccessRoute }, { initialUrl: '/' });
    await waitFor(() => expect(screen.getByTestId('access-screen')).toBeTruthy());
  });

  it('renders precisely the approved Access form without Guest V3 navigation', async () => {
    const { screen } = await renderAccess(new MockAccessService());
    expect(screen.getByText('Vincula tu reserva')).toBeTruthy();
    expect(screen.getByTestId('access-reservation-code')).toBeTruthy();
    expect(screen.getByTestId('access-email')).toBeTruthy();
    expect(screen.getByTestId('access-reservation-code').props.maxLength).toBe(32);
    expect(screen.getByTestId('access-email').props.maxLength).toBe(254);
    expect(screen.queryByText('Servicios')).toBeNull();
    expect(screen.queryByText('Chat')).toBeNull();
    expect(screen.queryByText('Valet')).toBeNull();
    expect(screen.queryByText('Cuenta')).toBeNull();
  });

  it('keeps local invalid input outside the service boundary', async () => {
    const service: AccessService = { linkReservation: jest.fn() };
    const { screen } = await renderAccess(service);
    await fireEvent.press(screen.getByTestId('access-submit-button'));
    expect(screen.getByText('Ingresa tu código de reserva.')).toBeTruthy();
    expect(screen.getByText('Ingresa tu correo electrónico.')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('access-reservation-code'), 'HB-2026-004281');
    await fireEvent.changeText(screen.getByTestId('access-email'), 'invalid');
    await fireEvent.press(screen.getByTestId('access-submit-button'));
    expect(screen.getByText('Ingresa un correo electrónico válido.')).toBeTruthy();
    expect(service.linkReservation).not.toHaveBeenCalled();
  });

  it('matches the fixture case-insensitively after trim and uses the /account success handoff', async () => {
    const { onLinked, screen } = await renderAccess(new MockAccessService());
    await fireEvent.changeText(screen.getByTestId('access-reservation-code'), ' hb-2026-004281 ');
    await fireEvent.changeText(screen.getByTestId('access-email'), ' ANA@EXAMPLE.COM ');
    await fireEvent.press(screen.getByTestId('access-submit-button'));
    await waitFor(() => expect(onLinked).toHaveBeenCalledTimes(1));
  });

  it('implements the production success handoff with router.replace, never push', async () => {
    const replaceSpy = jest.spyOn(router, 'replace').mockImplementation(() => undefined as never);
    const pushSpy = jest.spyOn(router, 'push').mockImplementation(() => undefined as never);
    const { screen } = await renderAccess(new MockAccessService(), () => router.replace('/account'));
    await fillValidAccess(screen);
    await fireEvent.press(screen.getByTestId('access-submit-button'));
    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('/account'));
    expect(pushSpy).not.toHaveBeenCalled();
    replaceSpy.mockRestore();
    pushSpy.mockRestore();
  });

  it('keeps mismatch typed internally while showing only generic verification copy', async () => {
    await expect(new MockAccessService().linkReservation({
      email: 'other@example.com',
      reservationCode: 'HB-2026-004281',
    })).rejects.toBeInstanceOf(ReservationNotFoundError);

    const linkReservation = jest.fn<Promise<{ linked: true }>, [unknown]>()
      .mockRejectedValueOnce(new ReservationNotFoundError())
      .mockResolvedValueOnce({ linked: true });
    const { onLinked, screen } = await renderAccess({ linkReservation });
    await fillValidAccess(screen);
    await fireEvent.press(screen.getByTestId('access-submit-button'));
    await waitFor(() => expect(screen.getByTestId('access-verification-failed')).toBeTruthy());
    expect(screen.getByText('No pudimos verificar los datos')).toBeTruthy();
    expect(screen.getByText('Revisa el código de reserva y el correo e inténtalo de nuevo.')).toBeTruthy();
    expect(screen.queryByText('Reserva no encontrada')).toBeNull();
    expect(screen.queryByText('Correo no registrado')).toBeNull();
    expect(screen.getByTestId('access-reservation-code').props.value).toBe('HB-2026-004281');
    expect(screen.getByTestId('access-email').props.value).toBe('ana@example.com');
    await fireEvent.changeText(screen.getByTestId('access-reservation-code'), 'HB-2026-004281-A');
    await fireEvent.changeText(screen.getByTestId('access-email'), 'changed@example.com');
    await fireEvent.press(screen.getByTestId('access-submit-button'));
    await waitFor(() => expect(onLinked).toHaveBeenCalledTimes(1));
    expect(linkReservation).toHaveBeenCalledTimes(2);
  });

  it('keeps fields and allows manual retry for generic and offline failures', async () => {
    const generic = jest.fn<Promise<{ linked: true }>, [unknown]>().mockRejectedValueOnce(new Error('unexpected')).mockResolvedValueOnce({ linked: true });
    const genericResult = await renderAccess({ linkReservation: generic });
    await fillValidAccess(genericResult.screen);
    await fireEvent.press(genericResult.screen.getByTestId('access-submit-button'));
    await waitFor(() => expect(genericResult.screen.getByTestId('access-error')).toBeTruthy());
    await fireEvent.press(genericResult.screen.getByText('Reintentar'));
    await waitFor(() => expect(genericResult.onLinked).toHaveBeenCalledTimes(1));

    const offline = jest.fn<Promise<{ linked: true }>, [unknown]>().mockRejectedValueOnce(new NetworkError()).mockResolvedValueOnce({ linked: true });
    const offlineResult = await renderAccess({ linkReservation: offline });
    await fillValidAccess(offlineResult.screen);
    await fireEvent.press(offlineResult.screen.getByTestId('access-submit-button'));
    await waitFor(() => expect(offlineResult.screen.getByTestId('access-offline')).toBeTruthy());
    await fireEvent.press(offlineResult.screen.getByText('Reintentar'));
    await waitFor(() => expect(offlineResult.onLinked).toHaveBeenCalledTimes(1));
  });

  it('shows submitting and prevents double submission', async () => {
    let resolveLink: (value: { linked: true }) => void;
    const pending = new Promise<{ linked: true }>((resolve) => { resolveLink = resolve; });
    const linkReservation = jest.fn(() => pending);
    const { onLinked, screen } = await renderAccess({ linkReservation });
    await fillValidAccess(screen);
    await fireEvent.press(screen.getByTestId('access-submit-button'));
    await fireEvent.press(screen.getByTestId('access-submit-button'));
    await waitFor(() => expect(screen.getByText('Vinculando...')).toBeTruthy());
    expect(linkReservation).toHaveBeenCalledTimes(1);
    resolveLink!({ linked: true });
    await waitFor(() => expect(onLinked).toHaveBeenCalledTimes(1));
  });
});

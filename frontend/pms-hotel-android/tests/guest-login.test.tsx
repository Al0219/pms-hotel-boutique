import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Pressable, Text, View } from 'react-native';

import IndexRoute from '../app/index';
import { NetworkError } from '@/data/remote/http/HttpError';
import { type GuestAuthService } from '@/modules/guest-auth/data/services/GuestAuthService';
import { InvalidGuestCredentialsError } from '@/modules/guest-auth/domain/errors/InvalidGuestCredentialsError';
import { type ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import { type GuestAuthSession } from '@/modules/guest-auth/domain/models/GuestAuthSession';
import { ActiveReservationContextProvider, useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { GuestAuthSessionProvider, useGuestAuthSession } from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import { LoginScreen } from '@/modules/guest-auth/presentation/LoginScreen';
import { useGuestLogin } from '@/modules/guest-auth/presentation/hooks/useGuestLogin';

function createQueryClient() {
  return new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { gcTime: 0, retry: false } } });
}

function MutationCacheProbe({ service }: { service: GuestAuthService }) {
  const login = useGuestLogin(service);
  return <Pressable testID="guest-login-mutation-cache-probe" onPress={() => login.submit({ email: 'guest@example.com', password: 'guest-demo-password' })}><Text>Submit</Text></Pressable>;
}

function SessionProbe() {
  const { session } = useGuestAuthSession();
  const { activeReservationContext } = useActiveReservationContext();
  return <View>
    <Text testID="guest-login-session">{session?.accountId ?? 'none'}</Text>
    <Text testID="guest-login-context">{activeReservationContext ? `${activeReservationContext.reservationId}/${activeReservationContext.reservationStayId}` : 'none'}</Text>
  </View>;
}

function LoginProviders({ children, initialContext }: { children: React.ReactNode; initialContext?: ActiveReservationContext | null }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <GuestAuthSessionProvider>
        <ActiveReservationContextProvider initialActiveReservationContext={initialContext}>
          <SessionProbe />
          {children}
        </ActiveReservationContextProvider>
      </GuestAuthSessionProvider>
    </QueryClientProvider>
  );
}

async function renderLogin(service: GuestAuthService, options: { initialContext?: ActiveReservationContext | null; onAuthenticated?: (session: GuestAuthSession) => void } = {}) {
  return render(<LoginProviders initialContext={options.initialContext}><LoginScreen onAuthenticated={options.onAuthenticated} service={service} /></LoginProviders>);
}

async function fillValidLogin(screen: Awaited<ReturnType<typeof renderLogin>>) {
  await fireEvent.changeText(screen.getByTestId('guest-login-email'), 'guest@example.com');
  await fireEvent.changeText(screen.getByTestId('guest-login-password'), 'guest-demo-password');
}

describe('Guest Login', () => {
  it('renders the approved main entry without account creation, recovery, or social actions', async () => {
    const screen = await renderLogin({ login: jest.fn() });
    expect(screen.getByTestId('guest-login-screen')).toBeTruthy();
    expect(screen.getByText('Hotel Boutique')).toBeTruthy();
    expect(screen.getByText('Inicia sesión')).toBeTruthy();
    expect(screen.getByText('Accede a tu cuenta para continuar.')).toBeTruthy();
    expect(screen.getByTestId('guest-login-email')).toBeTruthy();
    expect(screen.getByTestId('guest-login-password')).toBeTruthy();
    expect(screen.queryByText(/Crear cuenta|Registrarse|Olvidé|Google|Apple|Facebook/i)).toBeNull();
    expect(screen.queryByText('Cerrar sesión')).toBeNull();
  });

  it('redirects root to /login', async () => {
    function LoginRoute() {
      return <LoginProviders><LoginScreen service={{ login: jest.fn() }} /></LoginProviders>;
    }
    const screen = await renderRouter({ index: IndexRoute, login: LoginRoute }, { initialUrl: '/' });
    await waitFor(() => expect(screen.getByTestId('guest-login-screen')).toBeTruthy());
  });

  it('does not retain password as a TanStack Mutation variable', async () => {
    const client = createQueryClient();
    const service: GuestAuthService = { login: jest.fn().mockResolvedValue({ accountId: 'guest-account-primary' }) };
    const screen = await render(<QueryClientProvider client={client}><MutationCacheProbe service={service} /></QueryClientProvider>);
    await fireEvent.press(screen.getByTestId('guest-login-mutation-cache-probe'));
    await waitFor(() => expect(service.login).toHaveBeenCalledTimes(1));
    expect(client.getMutationCache().getAll()[0]?.state.variables).toBeUndefined();
  });

  it('keeps local validation outside the service boundary', async () => {
    const service: GuestAuthService = { login: jest.fn() };
    const screen = await renderLogin(service);
    await fireEvent.press(screen.getByTestId('guest-login-submit'));
    expect(screen.getByText('Ingresa tu correo electrónico.')).toBeTruthy();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('guest-login-email'), 'invalid');
    await fireEvent.changeText(screen.getByTestId('guest-login-password'), 'value');
    await fireEvent.press(screen.getByTestId('guest-login-submit'));
    expect(screen.getByText('Ingresa un correo electrónico válido.')).toBeTruthy();
    expect(service.login).not.toHaveBeenCalled();
  });

  it('uses a neutral empty-email placeholder and an internal accessible password-eye toggle', async () => {
    const screen = await renderLogin({ login: jest.fn() });
    const email = screen.getByTestId('guest-login-email');
    const password = screen.getByTestId('guest-login-password');
    const toggle = screen.getByTestId('guest-login-password-toggle');

    expect(email.props.placeholder).toBe('nombre@correo.com');
    expect(email.props.value).toBe('');
    await fireEvent.changeText(email, 'guest@example.com');
    expect(email.props.value).toBe('guest@example.com');
    expect(password.props.secureTextEntry).toBe(true);
    expect(toggle.props.accessibilityLabel).toBe('Mostrar contraseña');
    expect(screen.getByTestId('guest-login-password-toggle-icon').props.children.props.name).toEqual({ android: 'visibility_off', ios: 'eye.slash', web: 'visibility_off' });
    expect(screen.queryByText('Mostrar')).toBeNull();
    expect(screen.queryByText('Ocultar')).toBeNull();
    expect(screen.getByTestId('guest-login-password-control')).toBeTruthy();
    expect(password.props.style[0]).toBe(email.props.style[0]);

    await fireEvent.press(toggle);
    expect(password.props.secureTextEntry).toBe(false);
    expect(toggle.props.accessibilityLabel).toBe('Ocultar contraseña');
    expect(screen.getByTestId('guest-login-password-toggle-icon').props.children.props.name).toEqual({ android: 'visibility', ios: 'eye', web: 'visibility' });
    await fireEvent.press(toggle);
    expect(password.props.secureTextEntry).toBe(true);
  });

  it('trims email, submits once, starts the session, clears prior context, and invokes the injected handoff', async () => {
    const session = { accountId: 'guest-account-authenticated' };
    const login = jest.fn<Promise<GuestAuthSession>, [unknown]>().mockResolvedValue(session);
    const onAuthenticated = jest.fn();
    const screen = await renderLogin({ login }, { initialContext: { reservationId: 'old-reservation', reservationStayId: 'old-stay' }, onAuthenticated });
    await fireEvent.changeText(screen.getByTestId('guest-login-email'), ' guest@example.com ');
    await fireEvent.changeText(screen.getByTestId('guest-login-password'), 'guest-demo-password');
    await fireEvent.press(screen.getByTestId('guest-login-submit'));
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(session));
    expect(login).toHaveBeenCalledWith({ email: 'guest@example.com', password: 'guest-demo-password' });
    expect(screen.getByTestId('guest-login-session').props.children).toBe('guest-account-authenticated');
    expect(screen.getByTestId('guest-login-context').props.children).toBe('none');
  });

  it('blocks duplicated submission and disables mutable controls while submitting', async () => {
    let resolveLogin: (session: GuestAuthSession) => void = () => undefined;
    const pending = new Promise<GuestAuthSession>((resolve) => { resolveLogin = resolve; });
    const login = jest.fn(() => pending);
    const screen = await renderLogin({ login });
    await fillValidLogin(screen);
    await fireEvent.press(screen.getByTestId('guest-login-submit'));
    await fireEvent.press(screen.getByTestId('guest-login-submit'));
    await waitFor(() => expect(screen.getByText('Iniciando sesión...')).toBeTruthy());
    expect(login).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('guest-login-email').props.editable).toBe(false);
    expect(screen.getByTestId('guest-login-password').props.editable).toBe(false);
    expect(screen.getByTestId('guest-login-password-toggle').props.accessibilityState.disabled).toBe(true);
    resolveLogin({ accountId: 'guest-account-primary' });
    await waitFor(() => expect(screen.getByTestId('guest-login-session').props.children).toBe('guest-account-primary'));
  });

  it('uses generic, non-enumerating copy for invalid credentials and clears stale state when input changes', async () => {
    const screen = await renderLogin({ login: jest.fn().mockRejectedValue(new InvalidGuestCredentialsError()) });
    await fillValidLogin(screen);
    await fireEvent.press(screen.getByTestId('guest-login-submit'));
    await waitFor(() => expect(screen.getByTestId('guest-login-invalid-credentials')).toBeTruthy());
    expect(screen.getByText('No pudimos iniciar sesión')).toBeTruthy();
    expect(screen.getByText('Revisa tus datos e inténtalo de nuevo.')).toBeTruthy();
    expect(screen.queryByText(/correo inexistente|contraseña incorrecta/i)).toBeNull();
    await fireEvent.changeText(screen.getByTestId('guest-login-email'), 'corrected@example.com');
    await waitFor(() => expect(screen.queryByTestId('guest-login-invalid-credentials')).toBeNull());
    expect(screen.getByTestId('guest-login-password').props.value).toBe('guest-demo-password');
  });

  it.each([
    ['generic error', new Error('unexpected'), 'guest-login-error', 'No pudimos iniciar sesión', 'Inténtalo nuevamente.'],
    ['offline', new NetworkError(), 'guest-login-offline', 'Sin conexión', 'Conéctate a internet e inténtalo de nuevo.'],
  ])('renders %s state and retries without clearing fields', async (_name, failure, testID, title, body) => {
    const login = jest.fn<Promise<GuestAuthSession>, [unknown]>().mockRejectedValueOnce(failure).mockResolvedValueOnce({ accountId: 'guest-account-primary' });
    const onAuthenticated = jest.fn();
    const screen = await renderLogin({ login }, { onAuthenticated });
    await fillValidLogin(screen);
    await fireEvent.press(screen.getByTestId('guest-login-submit'));
    await waitFor(() => expect(screen.getByTestId(testID)).toBeTruthy());
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(body)).toBeTruthy();
    expect(screen.getByTestId('guest-login-email').props.value).toBe('guest@example.com');
    expect(screen.getByTestId('guest-login-password').props.value).toBe('guest-demo-password');
    await fireEvent.press(screen.getByTestId(`${testID}-retry`));
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
    expect(login).toHaveBeenCalledTimes(2);
  });

  it('uses the approved temporary production handoff to /account', async () => {
    const replaceSpy = jest.spyOn(router, 'replace').mockImplementation(() => undefined as never);
    const screen = await renderLogin({ login: jest.fn().mockResolvedValue({ accountId: 'guest-account-primary' }) });
    await fillValidLogin(screen);
    await fireEvent.press(screen.getByTestId('guest-login-submit'));
    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('/account'));
    replaceSpy.mockRestore();
  });

  it('keeps Access as a distinct secondary route reached with push', async () => {
    const pushSpy = jest.spyOn(router, 'push').mockImplementation(() => undefined as never);
    const screen = await renderLogin({ login: jest.fn() });
    await fireEvent.press(screen.getByTestId('guest-login-access'));
    expect(pushSpy).toHaveBeenCalledWith('/access');
    pushSpy.mockRestore();
  });
});

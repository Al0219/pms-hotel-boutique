import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { router, Slot } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { type PropsWithChildren, useEffect, useRef } from 'react';
import { BackHandler, Platform, Text, View } from 'react-native';

import {
  getGuestNavigationTabPressHandler,
  guestNavigationDrawerLinks,
  guestNavigationDrawerPrimaryLink,
  guestNavigationDrawerSections,
  GuestNavigationMenuProvider,
  GuestNavigationTabs,
  GuestRootHeader,
  useGuestNavigationMenu,
  guestNavigationTabs,
  resolveActiveGuestNavigationTab,
} from '@/modules/navigation';
import { CheckoutSessionProvider, useCheckoutSession } from '@/modules/checkout';
import { ActiveReservationContextProvider, GuestAuthSessionProvider, useActiveReservationContext, useGuestAuthSession } from '@/modules/guest-auth';
import { type ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import { type GuestAuthSession } from '@/modules/guest-auth/domain/models/GuestAuthSession';

function createQueryClient() {
  return new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { gcTime: 0, retry: false } } });
}

function GuestProviders({ children, client = createQueryClient(), initialContext, initialSession }: PropsWithChildren<{ client?: QueryClient; initialContext?: ActiveReservationContext | null; initialSession?: GuestAuthSession | null }>) {
  return <QueryClientProvider client={client}><GuestAuthSessionProvider initialSession={initialSession}><ActiveReservationContextProvider initialActiveReservationContext={initialContext}>{children}</ActiveReservationContextProvider></GuestAuthSessionProvider></QueryClientProvider>;
}

function DrawerLayout() {
  return <GuestProviders><CheckoutSessionProvider><GuestNavigationMenuProvider><Slot /></GuestNavigationMenuProvider></CheckoutSessionProvider></GuestProviders>;
}

function CheckoutSnapshotSeed() {
  const { createSnapshot } = useCheckoutSession();
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    createSnapshot(
      { checks: [], departureNoteText: '', expectedDepartureText: '', roomDisplayText: 'Habitación 204', stayDatesText: '' },
      { checkoutTotal: { amountMinor: 0, currency: 'GTQ', text: 'Total · Q0.00' }, items: [], paidGuaranteeText: '', pendingBalanceText: '', totalStayText: '', totalText: 'Total · Q0.00' },
    );
  }, [createSnapshot]);

  return null;
}

function CheckoutDrawerLayout() {
  return <GuestProviders><CheckoutSessionProvider><CheckoutSnapshotSeed /><GuestNavigationMenuProvider><Slot /></GuestNavigationMenuProvider></CheckoutSessionProvider></GuestProviders>;
}

function LogoutStateProbe() {
  const { session } = useGuestAuthSession();
  const { activeReservationContext } = useActiveReservationContext();
  return <View>
    <Text testID="guest-navigation-session-probe">{session?.accountId ?? 'none'}</Text>
    <Text testID="guest-navigation-context-probe">{activeReservationContext ? activeReservationContext.reservationId + '/' + activeReservationContext.reservationStayId : 'none'}</Text>
  </View>;
}

function createLogoutDrawerLayout(client: QueryClient, initialSession: GuestAuthSession, initialContext: ActiveReservationContext) {
  return function LogoutDrawerLayout() {
    return <GuestProviders client={client} initialContext={initialContext} initialSession={initialSession}><CheckoutSessionProvider><GuestNavigationMenuProvider><Slot /></GuestNavigationMenuProvider></CheckoutSessionProvider></GuestProviders>;
  };
}

function createDirtyRoute(onDiscard: () => void) {
  return function DirtyRoute() {
    const { registerNavigationGuard } = useGuestNavigationMenu();
    useEffect(() => registerNavigationGuard({ isDirty: true, message: 'Los cambios no guardados se perderán.', onDiscard, title: '¿Descartar cambios?' }), [registerNavigationGuard]);
    return <View><GuestRootHeader title="Cambios" /><Text>Formulario con cambios</Text></View>;
  };
}

function installAndroidBackHandler() {
  const descriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  const handlers: ((event: never) => boolean | null | undefined)[] = [];
  const addEventListener = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, nextHandler) => {
    handlers.push(nextHandler);
    return { remove: jest.fn() } as never;
  });

  return {
    addEventListener,
    trigger: () => [...handlers].reverse().some((handler) => handler({} as never) === true),
    restore: () => {
      addEventListener.mockRestore();
      if (descriptor) Object.defineProperty(Platform, 'OS', descriptor);
    },
  };
}

function AccountRoute() {
  return <View><GuestRootHeader title="Inicio" /><Text>Inicio</Text></View>;
}

function ServicesRoute() {
  return <View><GuestRootHeader title="Servicios" /><Text>Servicios</Text></View>;
}

function ValetRoute() {
  return <View><GuestRootHeader title="Valet" /><Text>Valet</Text></View>;
}

function HotelRoute() {
  return <View><GuestRootHeader title="Hotel" /><Text>Hotel</Text></View>;
}

function RewardsRoute() {
  return <View testID="rewards-route"><Text>Rewards</Text></View>;
}

function PromotionsRoute() {
  return <View testID="promotions-route"><Text>Promociones</Text></View>;
}
function ProfileRoute() { return <View testID="profile-route"><Text>Perfil</Text></View>; }

describe('Guest Navigation Shell', () => {
  it('declares only Inicio, Servicios, Valet and Hotel in the approved tab order', () => {
    expect(guestNavigationTabs).toEqual([
      { id: 'home', icon: { android: 'home', ios: 'house.fill', web: 'home' }, label: 'Inicio', basePath: '/account', disabled: false },
      { id: 'services', icon: { android: 'room_service', ios: 'bell.fill', web: 'room_service' }, label: 'Servicios', basePath: '/services', disabled: false },
      { id: 'valet', icon: { android: 'directions_car', ios: 'car.fill', web: 'directions_car' }, label: 'Valet', basePath: '/valet', disabled: false },
      { id: 'hotel', icon: { android: 'apartment', ios: 'building.2.fill', web: 'apartment' }, label: 'Hotel', basePath: '/hotel', disabled: false },
    ]);
    expect(guestNavigationDrawerPrimaryLink).toEqual({ icon: { android: 'person', ios: 'person.fill', web: 'person' }, label: 'Perfil', path: '/account/profile' });
    expect(guestNavigationDrawerLinks.map((link) => link.label)).toEqual(['Perfil', 'Inicio', 'Mis servicios', 'Check-out', 'Factura', 'Rewards', 'Promociones', 'Servicios', 'Limpieza', 'Room Service', 'Amenidades', 'Chat', 'Valet', 'Hotel']);
    expect(guestNavigationDrawerSections.map((section) => section.label)).toEqual(['CUENTA', 'ESTANCIA', 'BENEFICIOS', 'SERVICIOS', 'MOVILIDAD', 'HOTEL']);
  });

  it('resolves active tabs from root paths, child paths, and routes outside the shell', () => {
    expect(resolveActiveGuestNavigationTab('/services')).toBe('services');
    expect(resolveActiveGuestNavigationTab('/services/selection')).toBe('services');
    expect(resolveActiveGuestNavigationTab('/chat/thread')).toBeNull();
    expect(resolveActiveGuestNavigationTab('/account')).toBe('home');
    expect(resolveActiveGuestNavigationTab('/account/rewards')).toBe('home');
    expect(resolveActiveGuestNavigationTab('/hotel')).toBe('hotel');
    expect(resolveActiveGuestNavigationTab('/')).toBeNull();
    expect(resolveActiveGuestNavigationTab('/unknown')).toBeNull();
  });

  it('renders the four enabled V3 tabs and navigates only from a non-active tab', async () => {
    const onReplace = jest.fn();
    const rendered = await render(<GuestNavigationTabs onReplace={onReplace} pathname="/account" />);
    const tabs = rendered.getAllByRole('tab');

    expect(rendered.getByLabelText('Navegación principal de huésped').props.accessibilityRole).toBe('tablist');
    expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual(['Inicio', 'Servicios', 'Valet', 'Hotel']);
    expect(rendered.getByTestId('guest-navigation-tab-icon-home')).toBeTruthy();
    expect(rendered.getByTestId('guest-navigation-tab-icon-services')).toBeTruthy();
    expect(rendered.getByTestId('guest-navigation-tab-icon-valet')).toBeTruthy();
    expect(rendered.getByTestId('guest-navigation-tab-icon-hotel')).toBeTruthy();
    expect(rendered.queryByLabelText('Rewards')).toBeNull();
    expect(rendered.queryByLabelText('Promociones')).toBeNull();
    expect(rendered.getByLabelText('Inicio').props.accessibilityState).toEqual({ disabled: false, selected: true });
    expect(rendered.getByLabelText('Servicios').props.accessibilityState).toEqual({ disabled: false, selected: false });

    fireEvent.press(rendered.getByLabelText('Servicios'));
    expect(onReplace).toHaveBeenCalledWith('/services');
    fireEvent.press(rendered.getByLabelText('Inicio'));
    expect(onReplace).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['/account', 'home'],
    ['/services', 'services'],
    ['/valet', 'valet'],
    ['/hotel', 'hotel'],
  ] as const)('marks %s with its matching tab selected', async (pathname, active) => {
    const rendered = await render(<GuestNavigationTabs pathname={pathname} />);

    guestNavigationTabs.forEach((tab) => {
      expect(rendered.getByTestId(`guest-navigation-tab-${tab.id}`).props.accessibilityState).toEqual({ disabled: false, selected: tab.id === active });
    });
  });

  it('opens the current section and keeps a single drawer section expanded', async () => {
    const rendered = await renderRouter(
      {
        _layout: DrawerLayout,
        account: AccountRoute,
        services: ServicesRoute,
        valet: ValetRoute,
        hotel: HotelRoute,
        'account/rewards': RewardsRoute,
        'account/promotions': PromotionsRoute,
        'account/profile': ProfileRoute,
      },
      { initialUrl: '/services' },
    );

    await act(async () => {
      fireEvent.press(rendered.getByTestId('guest-navigation-menu-button'));
    });
    await waitFor(() => expect(rendered.getByTestId('guest-navigation-drawer-panel')).toBeTruthy());
    expect(rendered.getByText('Menú')).toBeTruthy();
    expect(rendered.getByText('Navega por tu estancia')).toBeTruthy();
    expect(rendered.getByTestId('guest-navigation-drawer-section-services').props.accessibilityState).toEqual({ expanded: true });
    expect(rendered.getByTestId('guest-navigation-drawer-section-services-chevron').props.children.props.name).toEqual({ android: 'keyboard_arrow_down', ios: 'chevron.down', web: 'keyboard_arrow_down' });
    expect(rendered.getByTestId('guest-navigation-drawer-section-benefits-chevron').props.children.props.name).toEqual({ android: 'keyboard_arrow_right', ios: 'chevron.right', web: 'keyboard_arrow_right' });
    expect(rendered.getByTestId('guest-navigation-drawer-section-services-icon')).toBeTruthy();
    expect(rendered.getByTestId('guest-navigation-drawer-link-servicios').props.accessibilityState).toMatchObject({ selected: true });
    expect(rendered.getByTestId('guest-navigation-drawer-body')).toBeTruthy();
    expect(rendered.getByTestId('guest-navigation-drawer-footer')).toBeTruthy();
    await fireEvent.press(rendered.getByTestId('guest-navigation-drawer-section-benefits'));
    expect(rendered.getByTestId('guest-navigation-drawer-section-benefits').props.accessibilityState).toEqual({ expanded: true });
    expect(rendered.getByTestId('guest-navigation-drawer-section-benefits-chevron').props.children.props.name).toEqual({ android: 'keyboard_arrow_down', ios: 'chevron.down', web: 'keyboard_arrow_down' });
    expect(rendered.getByTestId('guest-navigation-drawer-section-services').props.accessibilityState).toEqual({ expanded: false });
    expect(rendered.getByTestId('guest-navigation-drawer-link-rewards')).toBeTruthy();
    await act(async () => {
      fireEvent.press(rendered.getByTestId('guest-navigation-drawer-close'));
    });
    await waitFor(() => expect(rendered.queryByTestId('guest-navigation-drawer-panel')).toBeNull());
  });

  it('closes the shared drawer from its backdrop and does not leave a second drawer mounted', async () => {
    const rendered = await renderRouter(
      { _layout: DrawerLayout, account: AccountRoute, services: ServicesRoute, valet: ValetRoute, hotel: HotelRoute },
      { initialUrl: '/account' },
    );

    await act(async () => { fireEvent.press(rendered.getByTestId('guest-navigation-menu-button')); });
    await waitFor(() => expect(rendered.getByTestId('guest-navigation-drawer-panel')).toBeTruthy());
    expect(rendered.getAllByTestId('guest-navigation-drawer-panel')).toHaveLength(1);
    await act(async () => { fireEvent.press(rendered.getByTestId('guest-navigation-drawer-backdrop', { includeHiddenElements: true })); });
    await waitFor(() => expect(rendered.queryByTestId('guest-navigation-drawer-panel')).toBeNull());
  });

  it('keeps Factura visible but disabled until a checkout snapshot exists', async () => {
    const rendered = await renderRouter(
      { _layout: DrawerLayout, account: AccountRoute, 'account/invoice': ProfileRoute },
      { initialUrl: '/account' },
    );

    await act(async () => { fireEvent.press(rendered.getByTestId('guest-navigation-menu-button')); });
    const invoice = rendered.getByTestId('guest-navigation-drawer-link-factura');
    expect(invoice.props.accessibilityState).toMatchObject({ disabled: true, selected: false });
    expect(invoice.props.accessibilityHint).toBe('Disponible después del check-out.');
    await act(async () => { fireEvent.press(invoice); });
    expect(rendered.getByTestId('guest-root-header')).toBeTruthy();
  });

  it('enables Factura and closes the drawer when a checkout snapshot exists', async () => {
    const rendered = await renderRouter(
      { _layout: CheckoutDrawerLayout, account: AccountRoute, 'account/invoice': ProfileRoute },
      { initialUrl: '/account' },
    );

    await waitFor(() => expect(rendered.getByTestId('guest-root-header')).toBeTruthy());
    await act(async () => { fireEvent.press(rendered.getByTestId('guest-navigation-menu-button')); });
    const invoice = rendered.getByTestId('guest-navigation-drawer-link-factura');
    expect(invoice.props.accessibilityState).toMatchObject({ disabled: false });
    await act(async () => { fireEvent.press(invoice); });
    await waitFor(() => expect(rendered.getByTestId('profile-route')).toBeTruthy());
    expect(rendered.queryByTestId('guest-navigation-drawer-panel')).toBeNull();
  });

  it('navigates directly from the Benefits drawer entry to Promotions', async () => {
    const rendered = await renderRouter(
      {
        _layout: DrawerLayout,
        account: AccountRoute,
        services: ServicesRoute,
        valet: ValetRoute,
        hotel: HotelRoute,
        'account/rewards': RewardsRoute,
        'account/promotions': PromotionsRoute,
        'account/profile': ProfileRoute,
      },
      { initialUrl: '/account' },
    );

    await act(async () => {
      fireEvent.press(rendered.getByTestId('guest-navigation-menu-button'));
    });
    await act(async () => { fireEvent.press(rendered.getByTestId('guest-navigation-drawer-section-benefits')); });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('guest-navigation-drawer-link-promociones'));
    });
    await waitFor(() => expect(rendered.getByTestId('promotions-route')).toBeTruthy());
  });

  it('navigates from the first Perfil drawer action to Profile', async () => {
    const rendered = await renderRouter({ _layout: DrawerLayout, account: AccountRoute, services: ServicesRoute, valet: ValetRoute, hotel: HotelRoute, 'account/profile': ProfileRoute }, { initialUrl: '/hotel' });
    await act(async () => { fireEvent.press(rendered.getByTestId('guest-navigation-menu-button')); });
    await act(async () => { fireEvent.press(rendered.getByTestId('guest-navigation-drawer-section-account')); });
    await act(async () => { fireEvent.press(rendered.getByTestId('guest-navigation-drawer-link-perfil')); });
    await waitFor(() => expect(rendered.getByTestId('profile-route')).toBeTruthy());
  });


  it('shows Cerrar sesión outside the accordion sections and only after confirmation clears the Guest session, context, and query cache', async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(['guest', 'previous-session'], { guest: 'previous' });
    const replaceSpy = jest.spyOn(router, 'replace').mockImplementation(() => undefined as never);
    const initialSession = { accountId: 'guest-account-primary' };
    const initialContext = { reservationId: 'reservation-primary', reservationStayId: 'stay-primary' };
    const rendered = await renderRouter(
      { _layout: createLogoutDrawerLayout(queryClient, initialSession, initialContext), account: () => <View><GuestRootHeader title="Inicio" /><LogoutStateProbe /></View> },
      { initialUrl: '/account' },
    );

    expect(rendered.getByTestId('guest-navigation-session-probe').props.children).toBe('guest-account-primary');
    expect(rendered.getByTestId('guest-navigation-context-probe').props.children).toBe('reservation-primary/stay-primary');
    await fireEvent.press(rendered.getByTestId('guest-navigation-menu-button'));
    const body = rendered.getByTestId('guest-navigation-drawer-body');
    const footer = rendered.getByTestId('guest-navigation-drawer-footer');
    expect(within(body).queryByTestId('guest-navigation-drawer-logout')).toBeNull();
    expect(footer).toBeTruthy();
    expect(rendered.getByTestId('guest-navigation-drawer-logout')).toBeTruthy();
    expect(rendered.getByTestId('guest-navigation-drawer-footer')).toBeTruthy();
    expect(rendered.getByTestId('guest-navigation-drawer-logout').props.accessibilityLabel).toBe('Cerrar sesión');

    await fireEvent.press(rendered.getByTestId('guest-navigation-drawer-logout'));
    expect(rendered.getByTestId('guest-navigation-logout-modal')).toBeTruthy();
    expect(rendered.getByText('¿Cerrar sesión?')).toBeTruthy();
    expect(rendered.getByText('Volverás a la pantalla de inicio de sesión.')).toBeTruthy();
    await fireEvent.press(rendered.getByTestId('guest-navigation-logout-modal-cancel'));
    expect(rendered.queryByTestId('guest-navigation-logout-modal')).toBeNull();
    expect(rendered.getByTestId('guest-navigation-session-probe').props.children).toBe('guest-account-primary');
    expect(rendered.getByTestId('guest-navigation-context-probe').props.children).toBe('reservation-primary/stay-primary');
    expect(queryClient.getQueryData(['guest', 'previous-session'])).toEqual({ guest: 'previous' });

    await fireEvent.press(rendered.getByTestId('guest-navigation-drawer-logout'));
    await fireEvent.press(rendered.getByTestId('guest-navigation-logout-modal-confirm'));
    expect(rendered.getByTestId('guest-navigation-session-probe').props.children).toBe('none');
    expect(rendered.getByTestId('guest-navigation-context-probe').props.children).toBe('none');
    expect(queryClient.getQueryData(['guest', 'previous-session'])).toBeUndefined();
    expect(replaceSpy).toHaveBeenCalledWith('/login');
    expect(rendered.queryByTestId('guest-navigation-drawer-panel')).toBeNull();
    replaceSpy.mockRestore();
  });

  it('requires the existing dirty-discard confirmation before opening logout confirmation', async () => {
    const queryClient = createQueryClient();
    const replaceSpy = jest.spyOn(router, 'replace').mockImplementation(() => undefined as never);
    const onDiscard = jest.fn();
    const DirtyRoute = createDirtyRoute(onDiscard);
    const rendered = await renderRouter(
      { _layout: createLogoutDrawerLayout(queryClient, { accountId: 'guest-account-primary' }, { reservationId: 'reservation-primary', reservationStayId: 'stay-primary' }), account: DirtyRoute },
      { initialUrl: '/account' },
    );

    await fireEvent.press(rendered.getByTestId('guest-navigation-menu-button'));
    await fireEvent.press(rendered.getByTestId('guest-navigation-drawer-logout'));
    expect(rendered.getByTestId('guest-navigation-discard-modal')).toBeTruthy();
    expect(rendered.queryByTestId('guest-navigation-logout-modal')).toBeNull();
    await fireEvent.press(rendered.getByTestId('guest-navigation-discard-modal-confirm'));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(rendered.queryByTestId('guest-navigation-discard-modal')).toBeNull();
    expect(rendered.getByTestId('guest-navigation-logout-modal')).toBeTruthy();
    expect(replaceSpy).not.toHaveBeenCalledWith('/login');
    await fireEvent.press(rendered.getByTestId('guest-navigation-logout-modal-cancel'));
    expect(rendered.getByTestId('guest-navigation-drawer-panel')).toBeTruthy();
    replaceSpy.mockRestore();
  });


  it('uses Android Back in /account to request the centralized logout without navigating first', async () => {
    const back = installAndroidBackHandler();
    const queryClient = createQueryClient();
    queryClient.setQueryData(['guest', 'previous-session'], { guest: 'previous' });
    const replaceSpy = jest.spyOn(router, 'replace').mockImplementation(() => undefined as never);
    const rendered = await renderRouter(
      { _layout: createLogoutDrawerLayout(queryClient, { accountId: 'guest-account-primary' }, { reservationId: 'reservation-primary', reservationStayId: 'stay-primary' }), account: () => <View><GuestRootHeader title="Inicio" /><LogoutStateProbe /></View> },
      { initialUrl: '/account' },
    );

    await waitFor(() => expect(back.addEventListener).toHaveBeenCalled());
    await act(async () => { expect(back.trigger()).toBe(true); });
    expect(rendered.getByTestId('guest-navigation-logout-modal')).toBeTruthy();
    expect(replaceSpy).not.toHaveBeenCalled();
    await fireEvent.press(rendered.getByTestId('guest-navigation-logout-modal-cancel'));
    expect(rendered.getByTestId('guest-navigation-session-probe').props.children).toBe('guest-account-primary');
    expect(rendered.getByTestId('guest-navigation-context-probe').props.children).toBe('reservation-primary/stay-primary');
    expect(queryClient.getQueryData(['guest', 'previous-session'])).toEqual({ guest: 'previous' });

    await act(async () => { expect(back.trigger()).toBe(true); });
    await fireEvent.press(rendered.getByTestId('guest-navigation-logout-modal-confirm'));
    expect(rendered.getByTestId('guest-navigation-session-probe').props.children).toBe('none');
    expect(rendered.getByTestId('guest-navigation-context-probe').props.children).toBe('none');
    expect(queryClient.getQueryData(['guest', 'previous-session'])).toBeUndefined();
    expect(replaceSpy).toHaveBeenCalledWith('/login');
    replaceSpy.mockRestore();
    back.restore();
  });

  it.each(['/services', '/valet', '/hotel'] as const)('uses Android Back from %s to replace with /account', async (path) => {
    const back = installAndroidBackHandler();
    const replaceSpy = jest.spyOn(router, 'replace').mockImplementation(() => undefined as never);
    await renderRouter(
      { _layout: DrawerLayout, account: AccountRoute, services: ServicesRoute, valet: ValetRoute, hotel: HotelRoute },
      { initialUrl: path },
    );

    await waitFor(() => expect(back.addEventListener).toHaveBeenCalled());
    await act(async () => { expect(back.trigger()).toBe(true); });
    expect(replaceSpy).toHaveBeenCalledWith('/account');
    replaceSpy.mockRestore();
    back.restore();
  });

  it('uses Android Back to close an open drawer before any root navigation', async () => {
    const back = installAndroidBackHandler();
    const replaceSpy = jest.spyOn(router, 'replace').mockImplementation(() => undefined as never);
    const rendered = await renderRouter({ _layout: DrawerLayout, account: AccountRoute }, { initialUrl: '/account' });

    await waitFor(() => expect(back.addEventListener).toHaveBeenCalled());
    await fireEvent.press(rendered.getByTestId('guest-navigation-menu-button'));
    expect(rendered.getByTestId('guest-navigation-drawer-panel')).toBeTruthy();
    await act(async () => { expect(back.trigger()).toBe(true); });
    expect(rendered.queryByTestId('guest-navigation-drawer-panel')).toBeNull();
    expect(replaceSpy).not.toHaveBeenCalled();
    replaceSpy.mockRestore();
    back.restore();
  });

  it('does not intercept Android Back for child routes', async () => {
    const back = installAndroidBackHandler();
    const replaceSpy = jest.spyOn(router, 'replace').mockImplementation(() => undefined as never);
    await renderRouter(
      { _layout: DrawerLayout, account: AccountRoute, 'account/profile': ProfileRoute },
      { initialUrl: '/account/profile' },
    );

    await waitFor(() => expect(back.addEventListener).toHaveBeenCalled());
    expect(back.trigger()).toBe(false);
    expect(replaceSpy).not.toHaveBeenCalled();
    replaceSpy.mockRestore();
    back.restore();
  });

  it('prepares replace navigation for Inicio and keeps its current route as a no-op', () => {
    const onReplace = jest.fn();
    const home = guestNavigationTabs[0];

    expect(getGuestNavigationTabPressHandler(home, '/account', onReplace)).toBeUndefined();

    getGuestNavigationTabPressHandler(home, '/services', onReplace)?.();
    expect(onReplace).toHaveBeenCalledWith('/account');
  });
});

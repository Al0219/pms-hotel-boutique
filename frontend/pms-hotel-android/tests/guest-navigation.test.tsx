import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

import {
  getGuestNavigationTabPressHandler,
  guestNavigationDrawerLinks,
  guestNavigationDrawerPrimaryLink,
  guestNavigationDrawerSections,
  GuestNavigationMenuProvider,
  GuestNavigationTabs,
  GuestRootHeader,
  guestNavigationTabs,
  resolveActiveGuestNavigationTab,
} from '@/modules/navigation';
import { CheckoutSessionProvider, useCheckoutSession } from '@/modules/checkout';

function DrawerLayout() {
  return <GuestNavigationMenuProvider><Slot /></GuestNavigationMenuProvider>;
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
  return <CheckoutSessionProvider><CheckoutSnapshotSeed /><GuestNavigationMenuProvider><Slot /></GuestNavigationMenuProvider></CheckoutSessionProvider>;
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

  it('prepares replace navigation for Inicio and keeps its current route as a no-op', () => {
    const onReplace = jest.fn();
    const home = guestNavigationTabs[0];

    expect(getGuestNavigationTabPressHandler(home, '/account', onReplace)).toBeUndefined();

    getGuestNavigationTabPressHandler(home, '/services', onReplace)?.();
    expect(onReplace).toHaveBeenCalledWith('/account');
  });
});

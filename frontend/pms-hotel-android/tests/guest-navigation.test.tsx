import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text, View } from 'react-native';

import {
  getGuestNavigationTabPressHandler,
  guestNavigationDrawerLinks,
  guestNavigationDrawerSections,
  GuestNavigationMenuProvider,
  GuestNavigationTabs,
  GuestRootHeader,
  guestNavigationTabs,
  resolveActiveGuestNavigationTab,
} from '@/modules/navigation';

function DrawerLayout() {
  return <GuestNavigationMenuProvider><Slot /></GuestNavigationMenuProvider>;
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

describe('Guest Navigation Shell', () => {
  it('declares only Inicio, Servicios, Valet and Hotel in the approved tab order', () => {
    expect(guestNavigationTabs).toEqual([
      { id: 'home', icon: { android: 'home', ios: 'house.fill', web: 'home' }, label: 'Inicio', basePath: '/account', disabled: false },
      { id: 'services', icon: { android: 'room_service', ios: 'bell.fill', web: 'room_service' }, label: 'Servicios', basePath: '/services', disabled: false },
      { id: 'valet', icon: { android: 'directions_car', ios: 'car.fill', web: 'directions_car' }, label: 'Valet', basePath: '/valet', disabled: false },
      { id: 'hotel', icon: { android: 'apartment', ios: 'building.2.fill', web: 'apartment' }, label: 'Hotel', basePath: '/hotel', disabled: false },
    ]);
    expect(guestNavigationDrawerLinks.map((link) => link.label)).toEqual(['Inicio', 'Mis servicios', 'Rewards', 'Servicios', 'Valet', 'Hotel']);
    expect(guestNavigationDrawerSections.map((section) => section.label)).toEqual(['ESTANCIA', 'SERVICIOS', 'HOTEL']);
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

  it('renders the grouped drawer with Rewards and selects the active root', async () => {
    const rendered = await renderRouter(
      {
        _layout: DrawerLayout,
        account: AccountRoute,
        services: ServicesRoute,
        valet: ValetRoute,
        hotel: HotelRoute,
        'account/rewards': RewardsRoute,
      },
      { initialUrl: '/services' },
    );

    await act(async () => {
      fireEvent.press(rendered.getByTestId('guest-navigation-menu-button'));
    });
    await waitFor(() => expect(rendered.getByTestId('guest-navigation-drawer-panel')).toBeTruthy());
    expect(rendered.getByText('Menú')).toBeTruthy();
    expect(rendered.getByText('Navega por tu estancia')).toBeTruthy();
    expect(rendered.getByText('ESTANCIA')).toBeTruthy();
    expect(rendered.getByText('SERVICIOS')).toBeTruthy();
    expect(rendered.getByText('HOTEL')).toBeTruthy();
    expect(rendered.getByTestId('guest-navigation-drawer-link-inicio')).toBeTruthy();
    expect(rendered.getByTestId('guest-navigation-drawer-link-mis-servicios')).toBeTruthy();
    expect(rendered.getByTestId('guest-navigation-drawer-link-rewards')).toBeTruthy();
    expect(rendered.getByTestId('guest-navigation-drawer-link-servicios').props.accessibilityState).toEqual({ selected: true });
    expect(rendered.getByTestId('guest-navigation-drawer-link-valet').props.accessibilityState).toEqual({ selected: false });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('guest-navigation-drawer-close'));
    });
    await waitFor(() => expect(rendered.queryByTestId('guest-navigation-drawer-panel')).toBeNull());
  });

  it('prepares replace navigation for Inicio and keeps its current route as a no-op', () => {
    const onReplace = jest.fn();
    const home = guestNavigationTabs[0];

    expect(getGuestNavigationTabPressHandler(home, '/account', onReplace)).toBeUndefined();

    getGuestNavigationTabPressHandler(home, '/services', onReplace)?.();
    expect(onReplace).toHaveBeenCalledWith('/account');
  });
});

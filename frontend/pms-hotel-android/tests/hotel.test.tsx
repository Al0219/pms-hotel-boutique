import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { router, Slot, usePathname } from 'expo-router';
import { act, renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import HotelRoute from '../app/(guest)/hotel';
import { HotelScreen, hotelProfileFixture } from '@/modules/hotel';
import { GuestNavigationMenuProvider, GuestNavigationShell, GuestRootHeader, isGuestRootRoute } from '@/modules/navigation';
import { SessionServiceRequestsProvider, useSessionServiceRequests } from '@/modules/service-requests';

declare const require: (moduleName: string) => { readFileSync(path: string, encoding: string): string };

function PathProbe() {
  return <Text testID="hotel-pathname">{usePathname()}</Text>;
}

function RequestProbe() {
  const { requests } = useSessionServiceRequests();
  return <Text testID="hotel-requests">{JSON.stringify(requests)}</Text>;
}

function ShellOnly() {
  const pathname = usePathname();
  return <>{isGuestRootRoute(pathname) ? <GuestRootHeader title="Root" /> : null}<GuestNavigationShell /></>;
}

function GuestTestLayout() {
  return <GuestNavigationMenuProvider><PathProbe /><Slot /></GuestNavigationMenuProvider>;
}

describe('Hotel — IMP-AND-0114', () => {
  it('renders the central hotel profile without stay, request, mutation, or remote-state dependencies', async () => {
    const ui = await render(<SessionServiceRequestsProvider><RequestProbe /><HotelScreen /></SessionServiceRequestsProvider>);

    expect(ui.getByText(hotelProfileFixture.name)).toBeTruthy();
    expect(ui.getByTestId('hotel-status-indicator')).toHaveTextContent('Información en configuración');
    expect(ui.getByText(hotelProfileFixture.description)).toBeTruthy();
    expect(ui.getByText('Check-in · No disponible')).toBeTruthy();
    expect(ui.getByText('Check-out · 12:00')).toBeTruthy();
    expect(ui.getByText('Recepción · No disponible')).toBeTruthy();
    expect(ui.getByText('Red · No disponible')).toBeTruthy();
    expect(ui.getByText('Contraseña · No disponible')).toBeTruthy();
    expect(ui.getAllByText('No disponible')).toHaveLength(2);
    expect(ui.getByText('Ubicación no disponible')).toBeTruthy();
    expect(ui.queryByText('Servicios disponibles')).toBeNull();
    expect(ui.queryByRole('button', { name: 'Ver servicios' })).toBeNull();
    expect(ui.getByTestId('hotel-requests')).toHaveTextContent('[]');
  });

  it('opens /hotel and marks Hotel active without a Services CTA', async () => {
    const ui = await renderRouter({
      _layout: () => <GuestNavigationMenuProvider><SessionServiceRequestsProvider><PathProbe /><Slot /></SessionServiceRequestsProvider></GuestNavigationMenuProvider>,
      hotel: HotelRoute,
    }, { initialUrl: '/hotel' });

    await waitFor(() => expect(ui.getByTestId('hotel-screen')).toBeTruthy());
    expect(ui.getByLabelText('Hotel').props.accessibilityState).toEqual({ disabled: false, selected: true });
    expect(ui.queryByLabelText('Chat')).toBeNull();
    expect(ui.queryByLabelText('Cuenta')).toBeNull();
    expect(ui.queryByRole('button', { name: 'Ver servicios' })).toBeNull();
  });

  it('shows the floating Chat action only at roots, renders a real icon, and returns to Hotel with native history', async () => {
    const ui = await renderRouter({ _layout: GuestTestLayout, hotel: HotelRoute, chat: ShellOnly }, { initialUrl: '/hotel' });
    await waitFor(() => expect(ui.getByTestId('hotel-screen')).toBeTruthy());
    expect(ui.getByTestId('guest-navigation-chat-fab-icon')).toBeTruthy();
    await fireEvent.press(ui.getByLabelText('Abrir chat'));
    await waitFor(() => expect(ui.getByTestId('hotel-pathname')).toHaveTextContent('/chat'));
    expect(ui.queryByTestId('guest-navigation-chat-fab')).toBeNull();
    await act(async () => router.back());
    await waitFor(() => expect(ui.getByTestId('hotel-pathname')).toHaveTextContent('/hotel'));
  });

  it('uses the shared root header for all root titles and a normal aligned row', () => {
    const headerSource = require('fs').readFileSync('src/modules/navigation/GuestRootHeader.tsx', 'utf8');
    const stylesSource = require('fs').readFileSync('src/modules/navigation/guestNavigationStyles.ts', 'utf8');
    expect(headerSource).toContain('onMenuPress ?? openMenu');
    expect(stylesSource).toContain("alignItems: 'center'");
    expect(stylesSource).toContain("justifyContent: 'space-between'");
    expect(require('fs').readFileSync('src/modules/account/presentation/AccountStayHubScreen.tsx', 'utf8')).toContain('<GuestRootHeader title="Inicio" />');
    expect(require('fs').readFileSync('src/modules/services/presentation/ServicesScreen.tsx', 'utf8')).toContain('<GuestRootHeader title="Servicios" />');
    expect(require('fs').readFileSync('src/modules/valet/presentation/ValetScreen.tsx', 'utf8')).toContain('<GuestRootHeader title="Valet" />');
    expect(require('fs').readFileSync('src/modules/hotel/presentation/HotelScreen.tsx', 'utf8')).toContain('<GuestRootHeader title={profile.name} />');
  });

  it('uses the child header only in focused secondary service screens', () => {
    const fs = require('fs');
    for (const screen of [
      'src/modules/services/housekeeping/presentation/HousekeepingScreen.tsx',
      'src/modules/services/amenities/presentation/AmenitiesScreen.tsx',
      'src/modules/services/room-service/presentation/RoomServiceScreen.tsx',
      'src/modules/service-requests/presentation/SessionServiceRequestsScreen.tsx',
    ]) expect(fs.readFileSync(screen, 'utf8')).toContain('GuestChildHeader');
  });

  it('centralizes shell controls to the four root paths only', () => {
    expect(['/account', '/services', '/valet', '/hotel'].every(isGuestRootRoute)).toBe(true);
    expect(['/chat', '/services/requests', '/services/amenities', '/services/room-service', '/services/housekeeping', '/valet/request'].some(isGuestRootRoute)).toBe(false);
  });

  it('renders menu and Chat only on roots and hides both from service child routes', async () => {
    const ui = await renderRouter({ _layout: GuestTestLayout, account: ShellOnly, services: ShellOnly, valet: ShellOnly, hotel: ShellOnly, 'services/requests': ShellOnly, 'services/amenities': ShellOnly, 'services/room-service': ShellOnly }, { initialUrl: '/account' });
    expect(ui.getByTestId('guest-navigation-menu-button')).toBeTruthy();
    expect(ui.getByTestId('guest-navigation-chat-fab')).toBeTruthy();
    await act(async () => router.replace('/services'));
    await waitFor(() => expect(ui.getByTestId('guest-navigation-menu-button')).toBeTruthy());
    await act(async () => router.replace('/valet'));
    await waitFor(() => expect(ui.getByTestId('guest-navigation-menu-button')).toBeTruthy());
    await act(async () => router.replace('/hotel'));
    await waitFor(() => expect(ui.getByTestId('guest-navigation-chat-fab')).toBeTruthy());
    for (const pathname of ['/services/requests', '/services/amenities', '/services/room-service']) {
      await act(async () => router.replace(pathname));
      await waitFor(() => expect(ui.queryByTestId('guest-navigation-menu-button')).toBeNull());
      expect(ui.queryByTestId('guest-navigation-chat-fab')).toBeNull();
    }
  });

  it('opens the root drawer and closes it with X', async () => {
    const ui = await renderRouter({ _layout: GuestTestLayout, hotel: HotelRoute, services: ShellOnly, account: ShellOnly }, { initialUrl: '/hotel' });
    await waitFor(() => expect(ui.getByTestId('guest-navigation-menu-button')).toBeTruthy());
    await fireEvent.press(ui.getByLabelText('Abrir menú'));
    expect(ui.getByTestId('guest-navigation-drawer-panel')).toBeTruthy();
    expect(within(ui.getByTestId('guest-navigation-drawer-panel')).getByText('Menú')).toBeTruthy();
    expect(within(ui.getByTestId('guest-navigation-drawer-panel')).getByText('Navega por tu estancia')).toBeTruthy();
    await fireEvent.press(ui.getByTestId('guest-navigation-drawer-close'));
    await waitFor(() => expect(ui.queryByTestId('guest-navigation-drawer-panel')).toBeNull());
  });

  it('declares a close handler for the drawer backdrop', () => {
    const source = require('fs').readFileSync('src/modules/navigation/GuestNavigationMenuProvider.tsx', 'utf8');
    expect(source).toContain('onPress={closeMenu} style={guestNavigationStyles.drawerBackdrop}');
    const styles = require('fs').readFileSync('src/modules/navigation/guestNavigationStyles.ts', 'utf8');
    expect(styles).toContain('right: 0');
    expect(styles).not.toContain("drawer: {\n    backgroundColor: tokens.color.surface,\n    bottom: 0,\n    left: 0");
  });

  it('closes the drawer after navigation through one of its links', async () => {
    const ui = await renderRouter({ _layout: GuestTestLayout, hotel: HotelRoute, services: ShellOnly, account: ShellOnly }, { initialUrl: '/hotel' });
    await fireEvent.press(ui.getByLabelText('Abrir menú'));
    await fireEvent.press(ui.getByTestId('guest-navigation-drawer-section-services'));
    await waitFor(() => expect(ui.getByTestId('guest-navigation-drawer-link-servicios')).toBeTruthy());
    await fireEvent.press(ui.getByTestId('guest-navigation-drawer-link-servicios'));
    await waitFor(() => expect(ui.getByTestId('hotel-pathname')).toHaveTextContent('/services'));
    expect(ui.queryByTestId('guest-navigation-drawer-panel')).toBeNull();
  });
});

import { fireEvent, render } from '@testing-library/react-native';

import {
  getGuestNavigationTabPressHandler,
  guestNavigationDrawerLinks,
  GuestNavigationTabs,
  guestNavigationTabs,
  resolveActiveGuestNavigationTab,
} from '@/modules/navigation';

describe('Guest Navigation Shell', () => {
  it('declares only Inicio, Servicios, Valet and Hotel in the approved order', () => {
    expect(guestNavigationTabs).toEqual([
      { id: 'home', label: 'Inicio', basePath: '/account', disabled: false },
      { id: 'services', label: 'Servicios', basePath: '/services', disabled: false },
      { id: 'valet', label: 'Valet', basePath: '/valet', disabled: false },
      { id: 'hotel', label: 'Hotel', basePath: '/hotel', disabled: false },
    ]);
    expect(guestNavigationDrawerLinks).toHaveLength(5);
  });

  it('resolves active tabs from root paths, child paths, and routes outside the shell', () => {
    expect(resolveActiveGuestNavigationTab('/services')).toBe('services');
    expect(resolveActiveGuestNavigationTab('/services/selection')).toBe('services');
    expect(resolveActiveGuestNavigationTab('/chat/thread')).toBeNull();
    expect(resolveActiveGuestNavigationTab('/account')).toBe('home');
    expect(resolveActiveGuestNavigationTab('/account/preferences')).toBe('home');
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
    expect(rendered.queryByLabelText('Chat')).toBeNull();
    expect(rendered.queryByLabelText('Cuenta')).toBeNull();
    expect(rendered.getByLabelText('Inicio').props.accessibilityState).toEqual({ disabled: false, selected: true });
    expect(rendered.getByLabelText('Servicios').props.accessibilityState).toEqual({ disabled: false, selected: false });
    expect(rendered.getByLabelText('Valet').props.accessibilityState).toEqual({ disabled: false, selected: false });
    expect(rendered.getByLabelText('Hotel').props.accessibilityState).toEqual({ disabled: false, selected: false });

    fireEvent.press(rendered.getByLabelText('Servicios'));
    expect(onReplace).toHaveBeenCalledWith('/services');
    fireEvent.press(rendered.getByLabelText('Inicio'));
    expect(onReplace).toHaveBeenCalledTimes(1);
  });

  it('prepares replace navigation for Inicio and keeps its current route as a no-op', () => {
    const onReplace = jest.fn();
    const home = guestNavigationTabs[0];

    expect(getGuestNavigationTabPressHandler(home, '/account', onReplace)).toBeUndefined();

    getGuestNavigationTabPressHandler(home, '/services', onReplace)?.();
    expect(onReplace).toHaveBeenCalledWith('/account');
  });
});

import { fireEvent, render } from '@testing-library/react-native';

import {
  getGuestNavigationTabPressHandler,
  GuestNavigationTabs,
  guestNavigationTabs,
  resolveActiveGuestNavigationTab,
} from '@/modules/navigation';

describe('Guest Navigation Shell V3', () => {
  it('declares only the four approved V3 destinations in Figma order', () => {
    expect(guestNavigationTabs).toEqual([
      { id: 'services', label: 'Servicios', basePath: '/services', disabled: false },
      { id: 'chat', label: 'Chat', basePath: '/chat', disabled: false },
      { id: 'valet', label: 'Valet', basePath: '/valet', disabled: false },
      { id: 'account', label: 'Cuenta', basePath: '/account', disabled: false },
    ]);
  });

  it('resolves active tabs from root paths, child paths, and routes outside the shell', () => {
    expect(resolveActiveGuestNavigationTab('/services')).toBe('services');
    expect(resolveActiveGuestNavigationTab('/services/selection')).toBe('services');
    expect(resolveActiveGuestNavigationTab('/chat/thread')).toBe('chat');
    expect(resolveActiveGuestNavigationTab('/account')).toBe('account');
    expect(resolveActiveGuestNavigationTab('/account/preferences')).toBe('account');
    expect(resolveActiveGuestNavigationTab('/')).toBeNull();
    expect(resolveActiveGuestNavigationTab('/unknown')).toBeNull();
  });

  it('renders the four enabled V3 tabs and navigates only from a non-active tab', async () => {
    const onReplace = jest.fn();
    const rendered = await render(<GuestNavigationTabs onReplace={onReplace} pathname="/account" />);
    const tabs = rendered.getAllByRole('tab');

    expect(rendered.getByLabelText('Navegación principal de huésped').props.accessibilityRole).toBe('tablist');
    expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual(['Servicios', 'Chat', 'Valet', 'Cuenta']);
    expect(rendered.getByLabelText('Servicios').props.accessibilityState).toEqual({ disabled: false, selected: false });
    expect(rendered.getByLabelText('Chat').props.accessibilityState).toEqual({ disabled: false, selected: false });
    expect(rendered.getByLabelText('Valet').props.accessibilityState).toEqual({ disabled: false, selected: false });
    expect(rendered.getByLabelText('Cuenta').props.accessibilityState).toEqual({ disabled: false, selected: true });

    fireEvent.press(rendered.getByLabelText('Servicios'));
    expect(onReplace).toHaveBeenCalledWith('/services');
    fireEvent.press(rendered.getByLabelText('Cuenta'));
    expect(onReplace).toHaveBeenCalledTimes(1);
  });

  it('prepares replace navigation for Cuenta and keeps its current route as a no-op', () => {
    const onReplace = jest.fn();
    const account = guestNavigationTabs[3];

    expect(getGuestNavigationTabPressHandler(account, '/account', onReplace)).toBeUndefined();

    getGuestNavigationTabPressHandler(account, '/services', onReplace)?.();
    expect(onReplace).toHaveBeenCalledWith('/account');
  });
});

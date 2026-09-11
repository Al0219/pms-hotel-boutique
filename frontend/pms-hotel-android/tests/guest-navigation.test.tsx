import { fireEvent, render } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import {
  getGuestNavigationTabPressHandler,
  GuestNavigationShell,
  GuestNavigationTabs,
  guestNavigationTabs,
  resolveActiveGuestNavigationTab,
} from '@/modules/navigation';

describe('Guest Navigation Shell V3', () => {
  it('declares only the four approved V3 destinations in Figma order', () => {
    expect(guestNavigationTabs).toEqual([
      { id: 'services', label: 'Servicios', basePath: '/services', disabled: false },
      { id: 'chat', label: 'Chat', basePath: '/chat', disabled: false },
      { id: 'valet', label: 'Valet', basePath: '/valet', disabled: true },
      { id: 'account', label: 'Cuenta', basePath: '/account', disabled: true },
    ]);
  });

  it('resolves active tabs from root paths, child paths, and routes outside the shell', () => {
    expect(resolveActiveGuestNavigationTab('/services')).toBe('services');
    expect(resolveActiveGuestNavigationTab('/services/selection')).toBe('services');
    expect(resolveActiveGuestNavigationTab('/chat/thread')).toBe('chat');
    expect(resolveActiveGuestNavigationTab('/')).toBeNull();
    expect(resolveActiveGuestNavigationTab('/unknown')).toBeNull();
  });

  it('renders Services and Chat enabled, with unfinished destinations disabled', async () => {
    const onReplace = jest.fn();
    const rendered = await render(<GuestNavigationTabs onReplace={onReplace} pathname="/services" />);
    const tabs = rendered.getAllByRole('tab');

    expect(rendered.getByLabelText('Navegación principal de huésped').props.accessibilityRole).toBe('tablist');
    expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual(['Servicios', 'Chat', 'Valet', 'Cuenta']);
    expect(rendered.getByLabelText('Servicios').props.accessibilityState).toEqual({ disabled: false, selected: true });
    expect(rendered.getByLabelText('Chat').props.accessibilityState).toEqual({ disabled: false, selected: false });
    expect(rendered.getByLabelText('Valet').props.accessibilityState).toEqual({ disabled: true, selected: false });
    expect(rendered.getByLabelText('Cuenta').props.accessibilityState).toEqual({ disabled: true, selected: false });

    for (const tab of guestNavigationTabs.filter((tab) => tab.disabled)) {
      const tabControl = rendered.getByTestId(`guest-navigation-tab-${tab.id}`);

      expect(tabControl.props.onPress).toBeUndefined();
      fireEvent.press(tabControl);
    }

    fireEvent.press(rendered.getByLabelText('Chat'));
    expect(onReplace).toHaveBeenCalledWith('/chat');
  });

  it('renders an enabled normal tab only when a future feature configuration permits it', async () => {
    const onReplace = jest.fn();
    const tabs = [{ ...guestNavigationTabs[0], disabled: false }, ...guestNavigationTabs.slice(1)];
    const rendered = await render(<GuestNavigationTabs onReplace={onReplace} pathname="/" tabs={tabs} />);
    const servicesTab = rendered.getByLabelText('Servicios');

    expect(servicesTab.props.accessibilityState).toEqual({ disabled: false, selected: false });
    fireEvent.press(servicesTab);
    expect(onReplace).toHaveBeenCalledWith('/services');
  });

  it('prepares replace navigation for a future enabled tab and keeps a current tab as a no-op', () => {
    const onReplace = jest.fn();
    const enabledServices = { ...guestNavigationTabs[0], disabled: false };

    expect(getGuestNavigationTabPressHandler(enabledServices, '/services', onReplace)).toBeUndefined();

    getGuestNavigationTabPressHandler(enabledServices, '/chat', onReplace)?.();
    expect(onReplace).toHaveBeenCalledWith('/services');
  });

  it('derives selected state from Expo Router pathname without requiring a feature route in the app tree', async () => {
    const rendered = await renderRouter(
      {
        'technical-shell/index': GuestNavigationShell,
      },
      { initialUrl: '/technical-shell' },
    );

    expect(rendered.getByLabelText('Servicios').props.accessibilityState).toEqual({ disabled: false, selected: false });
    expect(rendered.getByLabelText('Chat').props.accessibilityState).toEqual({ disabled: false, selected: false });
  });
});

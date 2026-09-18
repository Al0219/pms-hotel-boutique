export type GuestNavigationTabId = 'services' | 'chat' | 'valet' | 'account';

export interface GuestNavigationTab {
  id: GuestNavigationTabId;
  label: string;
  basePath: string;
  disabled: boolean;
}

/**
 * V3 Guest destinations remain disabled until their respective authorized
 * feature exists. Services is enabled by IMP-AND-0103.
 */
export const guestNavigationTabs: readonly GuestNavigationTab[] = [
  { id: 'services', label: 'Servicios', basePath: '/services', disabled: false },
  { id: 'chat', label: 'Chat', basePath: '/chat', disabled: true },
  { id: 'valet', label: 'Valet', basePath: '/valet', disabled: true },
  { id: 'account', label: 'Cuenta', basePath: '/account', disabled: true },
];

export function isGuestNavigationTabActive(tab: GuestNavigationTab, pathname: string): boolean {
  return pathname === tab.basePath || pathname.startsWith(`${tab.basePath}/`);
}

export function resolveActiveGuestNavigationTab(
  pathname: string,
  tabs: readonly GuestNavigationTab[] = guestNavigationTabs,
): GuestNavigationTabId | null {
  return tabs.find((tab) => isGuestNavigationTabActive(tab, pathname))?.id ?? null;
}

export function getGuestNavigationTabPressHandler(
  tab: GuestNavigationTab,
  pathname: string,
  replace: (basePath: string) => void,
): (() => void) | undefined {
  if (tab.disabled || isGuestNavigationTabActive(tab, pathname)) return undefined;

  return () => replace(tab.basePath);
}

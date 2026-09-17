export type GuestNavigationTabId = 'home' | 'services' | 'valet' | 'hotel';

export interface GuestNavigationTab {
  id: GuestNavigationTabId;
  label: string;
  basePath: string;
  disabled: boolean;
}

/** Authoritative guest shell destinations for the current frontend-first journey. */
export const guestNavigationTabs: readonly GuestNavigationTab[] = [
  { id: 'home', label: 'Inicio', basePath: '/account', disabled: false },
  { id: 'services', label: 'Servicios', basePath: '/services', disabled: false },
  { id: 'valet', label: 'Valet', basePath: '/valet', disabled: false },
  { id: 'hotel', label: 'Hotel', basePath: '/hotel', disabled: false },
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

import { SymbolView } from 'expo-symbols';
import { type ComponentProps } from 'react';

export type GuestNavigationTabId = 'home' | 'services' | 'valet' | 'hotel';
export type GuestNavigationIcon = ComponentProps<typeof SymbolView>['name'];

export interface GuestNavigationTab {
  id: GuestNavigationTabId;
  icon: GuestNavigationIcon;
  label: string;
  basePath: string;
  disabled: boolean;
}

/** Authoritative guest shell destinations for the current frontend-first journey. */
export const guestNavigationTabs: readonly GuestNavigationTab[] = [
  { id: 'home', icon: { android: 'home', ios: 'house.fill', web: 'home' }, label: 'Inicio', basePath: '/account', disabled: false },
  { id: 'services', icon: { android: 'room_service', ios: 'bell.fill', web: 'room_service' }, label: 'Servicios', basePath: '/services', disabled: false },
  { id: 'valet', icon: { android: 'directions_car', ios: 'car.fill', web: 'directions_car' }, label: 'Valet', basePath: '/valet', disabled: false },
  { id: 'hotel', icon: { android: 'apartment', ios: 'building.2.fill', web: 'apartment' }, label: 'Hotel', basePath: '/hotel', disabled: false },
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

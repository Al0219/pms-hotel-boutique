'use client';

import { useSyncExternalStore } from 'react';
import { checkoutReturn } from '../model/checkout-return';
import { guestCheckoutContextEvent, readGuestCheckoutReturn } from '../model/guest-checkout-context';

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(guestCheckoutContextEvent, listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener(guestCheckoutContextEvent, listener); };
}
const serverSnapshot = () => undefined;
const checkoutSnapshot = () => checkoutReturn(readGuestCheckoutReturn());

export function useGuestCheckoutReturn(returnTo?: string): string | undefined {
  const saved = useSyncExternalStore(subscribe, checkoutSnapshot, serverSnapshot);
  return returnTo === undefined ? saved : checkoutReturn(returnTo);
}

import { checkoutReturn } from './checkout-return';

const storageKey = 'pms:guest-checkout-return';
export const guestCheckoutContextEvent = 'pms:guest-checkout-context';

/** Only allowed Guest navigation crosses external Google access; no guest data or credentials. */
function safeSearchReturn(value?: string): string | undefined {
  if (value === '/cuenta/reservas/vincular') return value;
  const destination = checkoutReturn(value);
  if (!destination) return undefined;
  const url = new URL(destination, 'https://pms.invalid');
  const search = new URLSearchParams();
  for (const key of ['checkIn', 'checkOut', 'adults', 'children', 'roomsCount', 'promoCode']) {
    const parameter = url.searchParams.get(key);
    if (parameter !== null) search.set(key, parameter);
  }
  return search.size ? `/reserva/checkout?${search}` : undefined;
}

export function rememberGuestCheckoutReturn(value?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const destination = safeSearchReturn(value);
    if (destination) window.sessionStorage.setItem(storageKey, destination);
    else window.sessionStorage.removeItem(storageKey);
    window.dispatchEvent(new Event(guestCheckoutContextEvent));
  } catch { /* Browser storage restrictions must not block authentication or booking. */ }
}

export function readGuestCheckoutReturn(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try { return safeSearchReturn(window.sessionStorage.getItem(storageKey) ?? undefined); }
  catch { return undefined; }
}

export function clearGuestCheckoutReturn(): void { rememberGuestCheckoutReturn(); }

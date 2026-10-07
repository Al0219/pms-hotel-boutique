'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { DisplayCurrency } from '../domain/display-currency';
import { getPublicEnvironment } from '@/lib/env';
import { publicCartStorageKey, readStoredCart, serializeCart, type PublicCart } from '../domain/public-cart-storage';
import type { RoomSelection } from '../domain/room-catalogue';
import { buildSearchQueryParams, validateBookingSearchCriteria, type BookingSearchCriteria } from '../domain/booking-search-criteria';
import { cartCriteria } from '../domain/public-cart-storage';
import { publicHomeCatalogueHref } from '../domain/public-room-navigation';

interface PublicBookingSession {
  searchNotice: string;
  setSearchNotice: Dispatch<SetStateAction<string>>;
  currency: DisplayCurrency;
  setCurrency: Dispatch<SetStateAction<DisplayCurrency>>;
  cart: { scope: string; propertyId?: string; items: RoomSelection[] };
  setCart: Dispatch<SetStateAction<{ scope: string; propertyId?: string; items: RoomSelection[] }>>;
}
function storageValue(key: string) { try { return window.sessionStorage.getItem(key); } catch { return null; } }
function subscribeStorage(listener: () => void) {
  window.addEventListener('storage', listener); window.addEventListener('pms-public-cart-change', listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener('pms-public-cart-change', listener); };
}
const Context = createContext<PublicBookingSession | null>(null);

export function PublicBookingProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<DisplayCurrency>('GTQ');
  const [searchNotice, setSearchNotice] = useState('');
  const mock = getPublicEnvironment().useMockApi;
  const key = publicCartStorageKey(mock);
  const [state, setState] = useState<{ key: string; cart: PublicCart } | null>(null);
  const raw = useSyncExternalStore(subscribeStorage, () => storageValue(key), () => null);
  const restored = useMemo(() => readStoredCart(raw, mock), [raw, mock]);
  const cart = state?.key === key ? state.cart : restored;
  const setCart: PublicBookingSession['setCart'] = useCallback(update => setState(previous => ({ key,
    cart: typeof update === 'function' ? update(previous?.key === key ? previous.cart : readStoredCart(storageValue(key), mock)) : update })), [key, mock]);
  useEffect(() => {
    if (state?.key !== key) return;
    try {
      if (state.cart.scope) window.sessionStorage.setItem(key, serializeCart(state.cart));
      else window.sessionStorage.removeItem(key);
      window.dispatchEvent(new Event('pms-public-cart-change'));
    } catch { /* Storage disabled: navigation still uses the in-memory Provider. */ }
  }, [state, key]);
  return <Context.Provider value={{ currency, setCurrency, cart, setCart, searchNotice, setSearchNotice }}>{children}</Context.Provider>;
}

export function usePublicBookingSession() {
  const context = useContext(Context);
  if (!context) throw new Error('PUBLIC_BOOKING_PROVIDER_REQUIRED');
  return context;
}

/** Read the display preference without exposing the cart to other modules. */
export function usePublicDisplayCurrency() {
  return usePublicBookingSession().currency;
}

/** Clear the booking cart without changing currency preference or Guest Auth. */
export function useResetPublicBooking() {
  const { setCart } = usePublicBookingSession();
  return () => setCart({ scope: '', items: [] });
}

export function usePublicRoomSelection(criteria: Partial<BookingSearchCriteria>, propertyId?: string) {
  const { cart, setCart } = usePublicBookingSession();
  const scope = propertyId && Object.keys(validateBookingSearchCriteria(criteria)).length === 0 ? `${propertyId}:${buildSearchQueryParams(criteria as BookingSearchCriteria)}` : '';
  const selection = scope && scope === cart.scope ? cart.items : [];
  const setSelection = (update: SetStateAction<RoomSelection[]>) => {
    if (!scope) return;
    setCart(previous => previous.items.length && previous.scope !== scope ? previous : ({ scope, propertyId, items: typeof update === 'function' ? update(previous.items) : update }));
  };
  return { selection, setSelection };
}

/** Catalogue/detail can remember an initial successful search with no selection.
 * Review guards remain reads and never create a new search during direct entry. */
export function useRememberPublicSearch(criteria: Partial<BookingSearchCriteria>, propertyId?: string) {
  const { cart, setCart } = usePublicBookingSession();
  const scope = propertyId && !Object.keys(validateBookingSearchCriteria(criteria)).length ? `${propertyId}:${buildSearchQueryParams(criteria as BookingSearchCriteria)}` : '';
  useEffect(() => {
    if (scope && !cart.items.length && cart.scope !== scope) setCart(previous => previous.items.length ? previous : { scope, propertyId, items: [] });
  }, [scope, propertyId, cart.scope, cart.items.length, setCart]);
}

/** A cart with items retains its accepted search until a validated edit commits. */
export function usePublicSearchCriteria(initial: Partial<BookingSearchCriteria>) {
  const { cart } = usePublicBookingSession();
  const saved = cartCriteria(cart);
  const savedValid = !Object.keys(validateBookingSearchCriteria(saved)).length;
  const supplied = Object.values(initial).some(value => value !== undefined);
  useEffect(() => {
    if (!cart.items.length) return;
    const accepted = cartCriteria(cart);
    if (Object.keys(validateBookingSearchCriteria(accepted)).length) return;
    const url = new URL(window.location.href);
    if (url.pathname !== '/' && !/^\/(habitaciones|reserva)(\/|$)/.test(url.pathname)) return;
    const query = new URLSearchParams(buildSearchQueryParams(accepted as BookingSearchCriteria));
    let changed = false;
    for (const field of ['checkIn', 'checkOut', 'adults', 'children', 'roomsCount', 'promoCode']) {
      const value = query.get(field);
      if (url.searchParams.get(field) === value) continue;
      changed = true;
      if (value === null) url.searchParams.delete(field); else url.searchParams.set(field, value);
    }
    // Back/forward and old bookmarks cannot silently replace an accepted cart.
    if (changed) window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [cart]);
  return savedValid && (cart.items.length > 0 || !supplied) ? saved : initial;
}

export function usePublicCatalogueHref() {
  const { cart } = usePublicBookingSession();
  const saved = cartCriteria(cart);
  return publicHomeCatalogueHref(saved);
}

'use client';

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { DisplayCurrency } from '../domain/display-currency';
import type { RoomSelection } from '../domain/room-catalogue';
import { buildSearchQueryParams, validateBookingSearchCriteria, type BookingSearchCriteria } from '../domain/booking-search-criteria';

interface PublicBookingSession {
  currency: DisplayCurrency;
  setCurrency: Dispatch<SetStateAction<DisplayCurrency>>;
  cart: { scope: string; items: RoomSelection[] };
  setCart: Dispatch<SetStateAction<{ scope: string; items: RoomSelection[] }>>;
}
const Context = createContext<PublicBookingSession | null>(null);

export function PublicBookingProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<DisplayCurrency>('USD');
  const [cart, setCart] = useState<PublicBookingSession['cart']>({ scope: '', items: [] });
  return <Context.Provider value={{ currency, setCurrency, cart, setCart }}>{children}</Context.Provider>;
}

export function usePublicBookingSession() {
  const context = useContext(Context);
  if (!context) throw new Error('PUBLIC_BOOKING_PROVIDER_REQUIRED');
  return context;
}

export function usePublicRoomSelection(criteria: Partial<BookingSearchCriteria>, propertyId?: string) {
  const { cart, setCart } = usePublicBookingSession();
  const scope = propertyId && Object.keys(validateBookingSearchCriteria(criteria)).length === 0 ? `${propertyId}:${buildSearchQueryParams(criteria as BookingSearchCriteria)}` : '';
  const selection = scope && scope === cart.scope ? cart.items : [];
  const setSelection = (update: SetStateAction<RoomSelection[]>) => {
    if (!scope) return;
    setCart(previous => ({ scope, items: typeof update === 'function' ? update(previous.scope === scope ? previous.items : []) : update }));
  };
  return { selection, setSelection };
}

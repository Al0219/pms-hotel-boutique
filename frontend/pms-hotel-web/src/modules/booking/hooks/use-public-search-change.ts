'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getPublicEnvironment } from '@/lib/env';
import { usePublicBookingSession } from '../components/public-booking-provider';
import { revalidateCartForSearchCriteria } from '../service/revalidate-public-cart';
import type { BookingSearchCriteria } from '../domain/booking-search-criteria';

export function usePublicSearchChange() {
  const { cart, setCart, searchNotice, setSearchNotice } = usePublicBookingSession();
  const latest = useRef(cart);
  const mounted = useRef(true);
  const locked = useRef(false);
  const client = useQueryClient();
  const [feedback, setFeedback] = useState<{ error?: string }>({});
  useEffect(() => { latest.current = cart; }, [cart]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function change(criteria: BookingSearchCriteria) {
    if (locked.current) return false;
    locked.current = true;
    setFeedback({});
    setSearchNotice('');
    const snapshot = latest.current;
    try {
      const result = await revalidateCartForSearchCriteria(snapshot, criteria);
      if (!mounted.current) return false;
      if (!result.success) { setFeedback({ error: result.message }); return false; }
      if (JSON.stringify(latest.current) !== JSON.stringify(snapshot)) {
        setFeedback({ error: 'Tu carrito cambió mientras verificábamos la disponibilidad. Conservamos tu selección; vuelve a intentarlo.' }); return false;
      }
      // Seed the exact new query before the atomic cart/scope commit. No old quote.
      const mock = getPublicEnvironment().useMockApi;
      const params = { checkInDate: criteria.checkIn, checkOutDate: criteria.checkOut, adults: criteria.adults, children: criteria.children, roomsCount: criteria.roomsCount, propertyId: result.cart.propertyId };
      client.setQueryData(['public-availability', mock, params], result.availability);
      setCart(result.cart);
      setSearchNotice(result.priceChanged ? 'El precio de tu estancia se actualizó para las nuevas fechas.' : 'Búsqueda actualizada.');
      return true;
    } finally { locked.current = false; }
  }
  return { change, ...feedback, notice: searchNotice };
}

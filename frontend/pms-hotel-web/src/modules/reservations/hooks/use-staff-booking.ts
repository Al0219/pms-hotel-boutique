'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HttpStatusError } from '@/lib/http';
import { readStaffBookingOptions, postStaffBooking } from '../service/staff-booking.service';
import { mapStaffBookingQuote, mapStaffBookingReceipt } from '../mappers/staff-booking.mapper';
import type { StaffBookingSearch, StaffBookingGuest, StaffBookingQuote, StaffBookingOption, StaffBookingReceipt } from '../model/staff-booking';
import type { StaffBookingRequestDto } from '../dtos/staff-booking.dto';

function message(error: unknown) {
  if (error instanceof HttpStatusError) {
    const data = error.responseData as { code?: string } | undefined;
    if (data?.code === 'NO_AVAILABILITY') return 'La disponibilidad cambió. Vuelve a consultar antes de reservar.';
    if (data?.code === 'PRICE_CHANGED') return 'La tarifa cambió. Consulta nuevamente las opciones para revisar el importe actualizado.';
    if (data?.code === 'IDEMPOTENCY_KEY_REUSED') return 'La solicitud cambió respecto al intento anterior. Revisa los datos antes de continuar.';
    if (error.status === 401 || error.status === 403) return 'La sesión ya no permite crear reservas en esta propiedad.';
  }
  return 'No pudimos confirmar el resultado. Conservamos los datos: reintenta la misma solicitud para evitar duplicados.';
}
export function useStaffBooking(propertyId: string, sessionId: string, allowed: boolean, search?: StaffBookingSearch) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false), [error, setError] = useState<string>();
  const [result, setResult] = useState<StaffBookingReceipt>();
  const [uncertain, setUncertain] = useState(false);
  const active = useRef<AbortController | null>(null);
  const identity = useRef({ propertyId, sessionId });
  const key = useRef<{ body: string; value: string; request: StaffBookingRequestDto } | null>(null);
  useEffect(() => {
    identity.current = { propertyId, sessionId };
    return () => { identity.current = { propertyId: '', sessionId: '' }; active.current?.abort(); };
  }, [propertyId, sessionId]);
  const query = useQuery({ queryKey: ['staff-reservation-quotes', sessionId, propertyId, search], enabled: allowed && !!search,
    retry: false, staleTime: 0, refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      if (!search || !allowed) throw new Error('STAFF_BOOKING_CONFIGURATION_REQUIRED');
      return mapStaffBookingQuote(await readStaffBookingOptions(propertyId, search, signal), propertyId, search);
    } });
  async function create(quote: StaffBookingQuote, option: StaffBookingOption, guest: StaffBookingGuest, notes: string) {
    if (active.current || result || !allowed || quote.propertyId !== propertyId) return;
    if (uncertain) { await retry(); return; }
    const request = { arrival: quote.arrival, departure: quote.departure, rooms: quote.rooms,
      roomTypeId: option.roomTypeId, ratePlanId: option.ratePlanId, currency: quote.currency, clientTotalMinor: option.totalMinor,
      guest: { firstName: guest.firstName.trim(), lastName: guest.lastName.trim(), email: guest.email.trim(), phone: guest.phone.trim() }, notes: notes.trim() || null };
    const body = JSON.stringify(request);
    if (key.current?.body !== body) key.current = { body, value: crypto.randomUUID(), request };
    await submit(key.current);
  }
  async function retry() {
    if (key.current && !active.current && !result && allowed) await submit(key.current);
  }
  async function submit(attempt: { value: string; request: StaffBookingRequestDto }) {
    const controller = new AbortController(); active.current = controller; setBusy(true); setError(undefined);
    try {
      const receipt = mapStaffBookingReceipt(await postStaffBooking(propertyId, attempt.request, attempt.value, controller.signal), propertyId);
      if (controller.signal.aborted || identity.current.propertyId !== propertyId || identity.current.sessionId !== sessionId) return;
      setUncertain(false); setResult(receipt);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['reservations', propertyId] }),
        client.invalidateQueries({ queryKey: ['reservations', 'staff-stays', sessionId, propertyId] }),
        client.invalidateQueries({ queryKey: ['staff-reservation-quotes', sessionId, propertyId] }),
        client.invalidateQueries({ queryKey: ['staff-room-occupancy', sessionId, propertyId] }),
      ]);
    } catch (failure) {
      if (!controller.signal.aborted && identity.current.propertyId === propertyId && identity.current.sessionId === sessionId) {
        setUncertain(current => current || !(failure instanceof HttpStatusError && [400,401,403,404,409].includes(failure.status)));
        setError(message(failure));
      }
    } finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  return { query, create, retry, uncertain, busy, error, result, clearError: () => setError(undefined) };
}

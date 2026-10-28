'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HttpStatusError } from '@/lib/http';
import { searchReservation } from '../service/reservation-lookup.service';
import { mapReservationLookup } from '../mappers/reservation-lookup.mapper';
import type { ReservationLookup } from '../model/reservation-lookup';

export function useReservationLookup() {
  const [result, setResult] = useState<ReservationLookup | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const active = useRef<AbortController | null>(null), revision = useRef(0), inFlight = useRef(false);
  const clear = useCallback(() => {
    revision.current++; active.current?.abort(); inFlight.current = false;
    setResult(null); setError(''); setBusy(false);
  }, []);
  useEffect(() => () => { revision.current++; active.current?.abort(); }, []);
  useEffect(() => {
    if (!result) return;
    const expires = Date.now() + 900000;
    const expire = () => { if (Date.now() >= expires) clear(); };
    const timer = setTimeout(clear, 900000);
    window.addEventListener('focus', expire);
    return () => { clearTimeout(timer); window.removeEventListener('focus', expire); };
  }, [result, clear]);

  const search = async (email: string, reference: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    const id = ++revision.current; setBusy(true); setError(''); setResult(null);
    try {
      const value = mapReservationLookup(await searchReservation(email, reference, controller.signal), reference);
      if (id === revision.current) setResult(value);
    } catch (failure) {
      if (id !== revision.current) return;
      const status = failure instanceof HttpStatusError ? failure.status : 0;
      setError(status === 404 ? 'No encontramos una reserva con ese correo y código. Revisa ambos datos en tu comprobante.' :
        status === 429 ? 'Alcanzaste el límite de consultas. Espera antes de intentarlo nuevamente.' :
        'No pudimos consultar la reserva. Inténtalo nuevamente; tu reserva se conserva.');
    } finally {
      if (id === revision.current) { inFlight.current = false; setBusy(false); }
    }
  };
  return { result, busy, error, search, clear };
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HttpStatusError } from '@/lib/http';
import { performStayLifecycle } from '../service/stay-lifecycle.service';
import { mapStayLifecycleReceipt } from '../mappers/stay-lifecycle.mapper';
import type { StayLifecycleAction, StayLifecycleExpectation, StayLifecycleScope } from '../model/stay-lifecycle';

const messages: Record<string, string> = {
  STALE_STAY: 'La estadía cambió. Cierra esta ventana y revisa los datos actualizados antes de confirmar otra vez.',
  RESERVATION_NOT_CONFIRMED: 'La reserva debe estar confirmada para registrar la entrada.',
  OUTSIDE_ARRIVAL_DATES: 'La entrada no corresponde a las fechas de la estadía en la hora local del hotel.',
  ROOM_NOT_ASSIGNED: 'Asigna una habitación antes de registrar la entrada.',
  ROOM_TYPE_MISMATCH: 'La habitación asignada no corresponde al tipo reservado.',
  ROOM_UNAVAILABLE: 'La habitación está ocupada o tiene otra asignación incompatible.',
  ROOM_BLOCKED: 'La habitación tiene un bloqueo operativo para estas fechas.',
  ROOM_NOT_INSPECTED: 'La habitación debe estar inspeccionada antes de entregar la llave.',
  OUTSTANDING_BALANCE: 'Hay saldo pendiente en un folio de la reserva. Debe resolverse antes de registrar cualquier salida.',
  BALANCE_UNVERIFIABLE: 'No se puede verificar el saldo de todos los folios. Revisa la contabilidad de la reserva antes de registrar la salida.',
  IDEMPOTENCY_KEY_REUSED: 'La referencia de esta operación ya se utilizó con otros datos. Cierra la ventana y revisa la estadía.',
};
type Attempt = { action: StayLifecycleAction; expectation: StayLifecycleExpectation; key: string };

export function useStayLifecycle(scope: StayLifecycleScope, sessionId: string, allowed: boolean) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [uncertain, setUncertain] = useState(false);
  const [retryAction, setRetryAction] = useState<StayLifecycleAction>();
  const attempt = useRef<Attempt | null>(null);
  const request = useRef<AbortController | null>(null);
  const identity = JSON.stringify([sessionId, scope.propertyId, scope.reservationId, scope.stayId, allowed]);
  const current = useRef(identity);
  useEffect(() => {
    current.current = identity;
    return () => { current.current = ''; request.current?.abort(); attempt.current = null; };
  }, [identity]);

  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['reservations', scope.propertyId] }),
      client.invalidateQueries({ queryKey: ['reservations', 'staff-stays', sessionId, scope.propertyId] }),
      client.invalidateQueries({ queryKey: ['staff-room-assignment', sessionId, scope.propertyId] }),
      client.invalidateQueries({ queryKey: ['staff-room-occupancy', sessionId, scope.propertyId] }),
      client.invalidateQueries({ queryKey: ['staff-housekeeping', sessionId, scope.propertyId] }),
    ]);
  }

  async function confirm(action: StayLifecycleAction, expectation: StayLifecycleExpectation) {
    if (request.current || !allowed || !sessionId || current.current !== identity) return;
    // A lost response must repeat the original operation, including its concurrency token.
    const pending = attempt.current ?? { action, expectation: { ...expectation }, key: crypto.randomUUID() };
    if (pending.action !== action) return;
    attempt.current = pending;
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(undefined);
    try {
      const receipt = mapStayLifecycleReceipt(await performStayLifecycle(scope, pending.action, pending.expectation, pending.key, controller.signal), scope, pending.action);
      if (controller.signal.aborted || current.current !== identity) return;
      attempt.current = null; setUncertain(false); setRetryAction(undefined);
      await refresh();
      if (!controller.signal.aborted && current.current === identity) return receipt;
    } catch (failure) {
      if (controller.signal.aborted || current.current !== identity) return;
      const definite = failure instanceof HttpStatusError && failure.status >= 400 && failure.status < 500;
      if (definite) {
        attempt.current = null; setUncertain(false); setRetryAction(undefined);
        const data = failure.responseData;
        const code = data && typeof data === 'object' && 'code' in data ? String(data.code) : '';
        setError(failure.status === 401 ? 'La sesión ha caducado. Vuelve a iniciar sesión.'
          : failure.status === 403 ? 'Tu sesión no tiene permiso para esta operación en esta propiedad.'
            : failure.status === 404 ? 'La reserva o la estadía ya no está disponible en esta propiedad.'
              : messages[code] ?? 'No se pudo registrar la operación. Cierra la ventana y revisa la estadía antes de intentarlo de nuevo.');
        if (failure.status === 409) await refresh();
      } else {
        setUncertain(true); setRetryAction(pending.action);
        setError('No pudimos comprobar el resultado. Reintenta esta misma operación para recuperar su confirmación sin duplicarla.');
      }
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted && current.current === identity) setBusy(false);
    }
  }
  return { busy, error, uncertain, retryAction, confirm,
    prepare: () => { if (!attempt.current) setError(undefined); } };
}

'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HttpStatusError } from '@/lib/http';
import { cancelStaffReservation, readCancellationPreview } from '../service/staff-cancellation.service';
import { mapCancellationPreview, mapCancellationReceipt } from '../mappers/staff-cancellation.mapper';
import type { CancellationReceipt, CancellationRequest, CancellationScope } from '../model/staff-cancellation';

export const cancellationMessages: Record<string, string> = {
  ALREADY_CANCELLED: 'La reserva ya está cancelada.',
  STAY_NOT_RESERVED: 'La cancelación completa requiere que todas las estadías estén reservadas y ninguna haya iniciado.',
  UNSUPPORTED_RESERVATION: 'Esta reserva requiere revisión de su contexto comercial antes de cancelarse.',
  FINANCIAL_REVIEW_REQUIRED: 'El folio requiere revisión financiera. No se puede identificar con seguridad el alojamiento original para esta cancelación.',
  STALE_PREVIEW: 'La reserva o su folio cambiaron. Actualiza la vista previa y revisa los nuevos importes antes de confirmar.',
  IDEMPOTENCY_KEY_REUSED: 'La referencia de esta operación ya fue utilizada con otros datos. Revisa la reserva antes de continuar.',
};
type Attempt = { key: string; body: CancellationRequest };

/** Mounted with a session/property/reservation key: no attempt crosses identities. */
export function useStaffCancellation(scope: CancellationScope, sessionId: string, open: boolean) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [receipt, setReceipt] = useState<CancellationReceipt>();
  const attempt = useRef<Attempt | null>(null);
  const request = useRef<AbortController | null>(null);
  const recoveredOperation = useRef('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); }; }, []);
  const query = useQuery({ queryKey: ['reservations', 'cancellation', sessionId, scope.propertyId, scope.reservationId],
    queryFn: async ({ signal }) => mapCancellationPreview(await readCancellationPreview(scope, signal), scope),
    enabled: open && !!sessionId && !receipt, retry: false, staleTime: 0,
    refetchOnWindowFocus: false });

  const refresh = useCallback(async () => {
    await Promise.allSettled([
      ['reservations', scope.propertyId], ['reservations', 'staff-stays', sessionId, scope.propertyId],
      ['staff-room-assignment', sessionId, scope.propertyId], ['staff-room-occupancy', sessionId, scope.propertyId],
      ['staff-folio', sessionId, scope.propertyId, scope.reservationId], ['staff-reservation-quotes', sessionId, scope.propertyId],
      ['public-availability'], ['guest', 'reservations'], ['guest', 'reservation-summary'], ['guest', 'account-summary'],
    ].map(queryKey => client.invalidateQueries({ queryKey })));
  }, [client, scope.propertyId, scope.reservationId, sessionId]);

  useEffect(() => {
    const recovered = query.data?.completed;
    if (!recovered || recoveredOperation.current === recovered.operationId) return;
    recoveredOperation.current = recovered.operationId;
    // Reconnection can recover the persisted receipt before the original POST returns.
    attempt.current = null;
    request.current?.abort();
    void refresh();
  }, [query.data?.completed, refresh]);

  async function confirm(reason: string) {
    if (request.current || !sessionId || !alive.current || receipt || query.data?.completed) return;
    const preview = query.data;
    if (!attempt.current && (!preview?.canCancel || !preview.fingerprint || !reason.trim() || reason.trim().length > 255 || query.isFetching)) return;
    const pending = attempt.current ?? { key: crypto.randomUUID(), body: { expectedFingerprint: preview!.fingerprint!, reason: reason.trim() } };
    attempt.current = pending;
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError('');
    try {
      const result = mapCancellationReceipt(await cancelStaffReservation(scope, pending.body, pending.key, controller.signal), scope);
      if (!alive.current || controller.signal.aborted) return;
      // A refresh failure must never turn an already confirmed cancellation into an unknown operation.
      setReceipt(result); setUncertain(false); attempt.current = null;
      await refresh();
    } catch (failure) {
      if (!alive.current || controller.signal.aborted) return;
      const definite = failure instanceof HttpStatusError && [400, 401, 403, 404, 409].includes(failure.status);
      if (definite) {
        attempt.current = null; setUncertain(false);
        const data = failure.responseData;
        const code = data && typeof data === 'object' && 'code' in data ? String(data.code) : '';
        setError(failure.status === 401 ? 'La sesión caducó. Vuelve a iniciar sesión.'
          : failure.status === 403 ? 'No tienes permisos de reservas y folio para esta propiedad.'
            : cancellationMessages[code] ?? 'No se pudo cancelar. Actualiza la vista previa antes de continuar.');
        // Do not silently replace the approved preview after a conflict.
        await client.invalidateQueries({ queryKey: ['reservations', scope.propertyId] });
      } else {
        setUncertain(true);
        setError('No pudimos comprobar el resultado. Reintenta la misma operación para recuperar su confirmación sin duplicar la penalización.');
      }
    } finally {
      if (request.current === controller) request.current = null;
      if (alive.current) setBusy(false);
    }
  }
  const confirmed = receipt ?? query.data?.completed ?? undefined;
  return { query, busy: busy && !confirmed, error: confirmed ? '' : error,
    uncertain: uncertain && !confirmed, receipt: confirmed, confirm,
    reload: async () => { if (!request.current && !attempt.current) { setError(''); await query.refetch(); } } };
}

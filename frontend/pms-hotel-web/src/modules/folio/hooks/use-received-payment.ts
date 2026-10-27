'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HttpStatusError } from '@/lib/http';
import { clearStaffPendingOperations, staffPendingOperationPrefix } from '@/lib/staff-pending-operations';
import { mapStaffPaymentReceipt } from '../mappers/staff-folio.mapper';
import { ledgerMinor, paymentMoney, type ReceivedPayment } from '../model/staff-folio';
import { recordStaffPayment } from '../service/staff-folio.service';

interface Attempt { key: string; payment: ReceivedPayment }
const messages: Record<string, string> = {
  PAYMENT_EXCEEDS_BALANCE: 'El importe supera el saldo actual. Revisa el saldo actualizado antes de registrar otro pago.',
  FOLIO_NOT_OPEN: 'Este folio ya no admite pagos.', FOLIO_NOT_PAYABLE: 'Solo se pueden registrar pagos en un folio de huésped vinculado a esta reserva.',
  BALANCE_UNVERIFIABLE: 'El folio no tiene movimientos para verificar la deuda. Revisa la contabilidad antes de cobrar.',
  IDEMPOTENCY_KEY_REUSED: 'La referencia ya está asociada a otros datos. Revisa los movimientos antes de registrar otro pago.',
};
function readAttempt(storageKey: string): Attempt | null {
  const raw = sessionStorage.getItem(storageKey); if (!raw) return null;
  const value = JSON.parse(raw) as Attempt;
  if (!value || !/^[a-f\d-]{36}$/i.test(value.key) || !value.payment || typeof value.payment.description !== 'string'
    || !value.payment.description.trim() || value.payment.description.length > 255
    || !paymentMoney(value.payment.amount?.amount, value.payment.amount?.currency)) throw new Error('INVALID_PENDING_PAYMENT');
  return { key: value.key, payment: { amount: { ...value.payment.amount }, description: value.payment.description } };
}
export function useReceivedPayment(actorId: string, sessionId: string, propertyId: string, reservationId: string, folioId: string) {
  const client = useQueryClient(), storageKey = `${staffPendingOperationPrefix}${actorId}:${propertyId}:${reservationId}:${folioId}`;
  const [pending, setPending] = useState<Attempt | null>(null), [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const controller = useRef<AbortController | null>(null), attempt = useRef<Attempt | null>(null), active = useRef(false);
  useEffect(() => {
    active.current = true;
    queueMicrotask(() => {
      if (!active.current) return;
      try {
        clearStaffPendingOperations(actorId);
        attempt.current = readAttempt(storageKey); setPending(attempt.current); setReady(true);
      } catch { setError('No se pudo recuperar el registro pendiente. Revisa los movimientos antes de continuar.'); }
    });
    return () => { active.current = false; controller.current?.abort(); };
  }, [actorId, storageKey]);

  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['staff-folio', sessionId, propertyId, reservationId] }),
      client.invalidateQueries({ queryKey: ['reservations', propertyId] }),
    ]);
  }
  async function submit(payment?: ReceivedPayment) {
    if (!active.current || controller.current || !ready) return;
    const operation = attempt.current ?? (payment ? { key: crypto.randomUUID(), payment: structuredClone(payment) } : null);
    if (!operation) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(operation)); }
    catch { setError('El navegador no permite conservar la referencia del pago. Habilita el almacenamiento antes de registrarlo.'); return; }
    attempt.current = operation; setPending(operation); setBusy(true); setError(''); setNotice('');
    const request = new AbortController(); controller.current = request;
    try {
      const result = mapStaffPaymentReceipt(await recordStaffPayment(propertyId, folioId, operation.payment, operation.key, request.signal), propertyId, folioId);
      if (!active.current || request.signal.aborted) return;
      if (result.amount.currency !== operation.payment.amount.currency || ledgerMinor(result.amount) !== ledgerMinor(operation.payment.amount)) throw new Error('PAYMENT_RECEIPT_MISMATCH');
      // The backend receipt is the authority; storage errors after it must never create a new payment.
      try { sessionStorage.removeItem(storageKey); } catch { /* Replaying this receipt remains safe. */ }
      attempt.current = null; setPending(null); setNotice('Pago registrado. Consulta el saldo actualizado del folio.');
      await refresh();
      if (active.current && !request.signal.aborted) return result;
    } catch (failure) {
      if (!active.current || request.signal.aborted) return;
      const status = failure instanceof HttpStatusError ? failure.status : 0;
      const data = failure instanceof HttpStatusError ? failure.responseData : null;
      const code = data && typeof data === 'object' && 'code' in data ? String(data.code) : '';
      if (status === 400 || status === 404 || (status === 409 && code !== 'IDEMPOTENCY_KEY_REUSED')) {
        try { sessionStorage.removeItem(storageKey); } catch { /* Same original attempt may safely reappear. */ }
        attempt.current = null; setPending(null);
        setError(messages[code] ?? 'No se registró este pago. Revisa el importe, la moneda y el folio.');
        await refresh();
      } else {
        setError(status === 401 || status === 403 ? 'Revalida tu acceso antes de recuperar el resultado de este pago.'
          : messages[code] ?? 'No pudimos comprobar el resultado. Recupera esta misma operación para evitar un pago duplicado.');
      }
    } finally {
      if (controller.current === request) controller.current = null;
      if (active.current && !request.signal.aborted) setBusy(false);
    }
  }
  return { ready, pending, busy, error, notice, submit };
}

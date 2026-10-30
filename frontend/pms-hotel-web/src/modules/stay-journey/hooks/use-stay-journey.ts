'use client';
import {mapDocumentFile} from '../model/document-file';
import {documentFile} from '../service/stay-journey.service';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { HttpStatusError } from '@/lib/http';
import { staffPendingOperationPrefix, clearStaffPendingOperations } from '@/lib/staff-pending-operations';
import { mapJourneyDocument, mapJourneyRequests, mapJourneySummary, mapSimulatedReceipt } from '../mappers/stay-journey.mapper';
import { readJourney, reconcileJourney, simulateJourneyPayment, type JourneyContext } from '../service/stay-journey.service';
import type { SimulatedPaymentInput } from '../model/stay-journey';
export function useStayJourney(c: JourneyContext, actorId: string, sessionId: string, financial: boolean) {
  const client = useQueryClient(), scope = `${sessionId}:${c.propertyId}:${c.reservationId}:${c.stayId}`;
  const queryKey = ['staff-stay-journey', scope], storageKey = `${staffPendingOperationPrefix}${actorId}:simulated:${c.propertyId}:${c.reservationId}:${c.stayId}`;
  const { requests, summary, document, file } = useJourneyRead(c, sessionId, financial);
  const [pending, setPending] = useState<{ key: string; input: SimulatedPaymentInput } | null>(null), [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const active = useRef(false), controller = useRef<AbortController | null>(null), attempt = useRef<typeof pending>(null);
  useEffect(() => {
    active.current = true;
    queueMicrotask(() => {
      if (!active.current) return;
      try {
        if (!financial) { setReady(false); return; }
        clearStaffPendingOperations(actorId);
        const raw = sessionStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (!parsed || !/^[a-f0-9-]{36}$/i.test(parsed.key) || !parsed.input || !/^\d{1,15}(\.\d{1,2})?$/.test(parsed.input.amount) || parsed.input.currency !== 'GTQ'
            || !['demo_visa_approved', 'demo_mastercard_approved', 'demo_amex_approved', 'demo_card_declined', 'demo_gateway_error'].includes(parsed.input.instrumentToken)) throw new Error('Invalid attempt');
          attempt.current = { key: parsed.key, input: { amount: parsed.input.amount, currency: 'GTQ', instrumentToken: parsed.input.instrumentToken } };
        }
        setPending(attempt.current); setReady(true);
      } catch { setError('No se pudo recuperar la operación pendiente. Revisa los movimientos antes de continuar.'); }
    });
    return () => { active.current = false; controller.current?.abort(); };
  }, [actorId, storageKey, financial]);
  async function refresh() { await Promise.all([client.invalidateQueries({ queryKey }), client.invalidateQueries({ queryKey: ['staff-folio', sessionId, c.propertyId, c.reservationId] }), client.invalidateQueries({ queryKey: ['reservations', c.propertyId] })]); }
  async function pay(input?: SimulatedPaymentInput) {
    if (!financial || !ready || controller.current || !active.current) return;
    const operation = attempt.current ?? (input ? { key: crypto.randomUUID(), input: { amount: input.amount, currency: input.currency, instrumentToken: input.instrumentToken } } : null); if (!operation) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(operation)); } catch { setError('Activa almacenamiento para conservar la referencia antes de pagar.'); return; }
    attempt.current = operation; setPending(operation); setBusy(true); setError(''); setNotice('');
    const request = new AbortController(); controller.current = request;
    try {
      const receipt = mapSimulatedReceipt(await simulateJourneyPayment(c, operation.input, operation.key, request.signal));
      if (!active.current || request.signal.aborted) return;
      if (receipt.folioId !== summary.data?.folioId || receipt.amount !== `${BigInt(operation.input.amount.split('.')[0])}.${(operation.input.amount.split('.')[1] ?? '').padEnd(2, '0')}`) throw new Error('Receipt mismatch');
      sessionStorage.removeItem(storageKey); attempt.current = null; setPending(null);
      setNotice(receipt.result === 'APPROVED' ? 'Pago simulado aprobado y registrado en el folio.' : receipt.result === 'DECLINED' ? 'Pago simulado rechazado. No se registró ningún pago.' : 'Fallo de procesamiento simulado. No se registró ningún pago.');
      await refresh(); return receipt;
    } catch (failure) {
      if (!active.current || request.signal.aborted) return;
      if (failure instanceof HttpStatusError && [400, 409].includes(failure.status)) {
        sessionStorage.removeItem(storageKey); attempt.current = null; setPending(null); setError('Operación no aceptada. Actualiza el folio y revisa el importe y la autorización.'); await refresh();
      } else setError('Resultado desconocido. Recupera la misma operación antes de intentar otro pago.');
    } finally { if (active.current) setBusy(false); controller.current = null; }
  }
  async function reconcile() {
    if (controller.current || pending || !active.current) return;
    const request = new AbortController(); controller.current = request; setBusy(true); setError('');
    try { await reconcileJourney(c, request.signal); if (active.current && !request.signal.aborted) await refresh(); }
    catch { if (active.current && !request.signal.aborted) setError('No se pudieron contabilizar los pedidos. Actualiza para comprobar el resultado.'); }
    finally { if (active.current) setBusy(false); controller.current = null; }
  }
  return { requests, summary, document, file, issueFile:async()=>{if(controller.current||!document.data)return;const request=new AbortController();controller.current=request;setBusy(true);try{const result=mapDocumentFile(await documentFile(c,true),document.data.id);await refresh();return result;}finally{controller.current=null;if(active.current)setBusy(false);}}, pending, ready, busy, notice, error, pay, reconcile, refresh };
}

export function useJourneyRead(c: JourneyContext, sessionId: string, financial: boolean) {
  const queryKey = ['staff-stay-journey', `${sessionId}:${c.propertyId}:${c.reservationId}:${c.stayId}`];
  const requests = useQuery({ queryKey: [...queryKey, 'requests'], queryFn: async ({ signal }) => mapJourneyRequests(await readJourney(c, 'requests', signal)), retry: false, refetchInterval: 15000 });
  const summary = useQuery({ queryKey: [...queryKey, 'summary'], queryFn: async ({ signal }) => mapJourneySummary(await readJourney(c, 'summary', signal), c.propertyId, c.reservationId, c.stayId), enabled: financial, retry: false, refetchInterval: 15000 });
  const document = useQuery({ queryKey: [...queryKey, 'document'], queryFn: async ({ signal }) => mapJourneyDocument(await readJourney(c, 'document', signal), c.propertyId, c.reservationId, c.stayId), enabled: financial && Boolean(summary.data?.documentId), retry: false });
  const file=useQuery({queryKey:[...queryKey,'file'],enabled:financial&&!!document.data,retry:false,queryFn:async()=>{try{return mapDocumentFile(await documentFile(c),document.data!.id);}catch(error){if(error instanceof HttpStatusError&&error.status===404)return null;throw error;}}});
  return { requests, summary, document, file };
}

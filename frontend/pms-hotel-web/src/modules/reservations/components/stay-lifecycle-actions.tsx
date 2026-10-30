'use client';
import {SvgIcon} from '@/shared/components/svg-icon';
import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/shared/components';
import { useJourneyRead } from '@/modules/stay-journey';
import { useStayLifecycle } from '../hooks/use-stay-lifecycle';
import type { ReservationStayDetail } from '../model/reservation-detail';
import type { StayLifecycleAction } from '../model/stay-lifecycle';
import styles from './room-assignment.module.css';

export function StayLifecycleActions({ propertyId, reservationId, sessionId, stay, reservationConfirmed, financial = false }: Readonly<{
  propertyId: string; reservationId: string; sessionId: string; stay: ReservationStayDetail; reservationConfirmed: boolean; financial?: boolean;
}>) {
  const journey = useJourneyRead({propertyId, reservationId, stayId: stay.id}, sessionId, financial);
  const summary = financial && journey.summary.isSuccess ? journey.summary.data : undefined;
  const pending = journey.requests.data?.filter(r => r.status === 'OPEN') ?? [];
  const exitReason = !summary || !summary.verifiable ? 'Saldo no verificable. Consulta el folio.' : summary.balance !== '0.00' ? 'El saldo pendiente debe quedar en cero.' : summary.pendingOrders > 0 ? 'Hay pedidos cobrables pendientes.' : summary.unpostedOrders > 0 ? 'Hay pedidos entregados pendientes de contabilizar.' : '';
  const operation = useStayLifecycle({ propertyId, reservationId, stayId: stay.id }, sessionId, true);
  const [selected, setSelected] = useState<{ action: StayLifecycleAction; stay: ReservationStayDetail }>();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const noticeElement = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (notice) noticeElement.current?.focus(); }, [notice]);
  const target = operation.retryAction ?? (stay.travelState === 'IN_HOUSE' ? 'check-out'
    : stay.travelState === 'RESERVED' && reservationConfirmed ? 'check-in' : undefined);
  const blocked = !operation.retryAction && (target === 'check-in' && !stay.roomId || target === 'check-out' && Boolean(exitReason));
  const entering = selected?.action === 'check-in';
  function close() { setOpen(false); queueMicrotask(() => trigger.current?.focus()); }
  async function confirm() {
    if (!selected?.stay.updatedAt) return;
    const result = await operation.confirm(selected.action, { expectedStatus: entering ? 'RESERVED' : 'IN_HOUSE',
      expectedUpdatedAt: selected.stay.updatedAt, expectedRoomId: selected.stay.roomId });
    if (result) {
      setNotice(`${entering ? 'Entrada' : 'Salida'} registrada. Consulta el estado actualizado de la estadía.${!entering && stay.roomId ? ' La habitación asignada queda pendiente de limpieza.' : ''}`);
      setOpen(false);
    }
  }
  return <div>
    {pending.map(r => <p role="status" key={r.id}>{r.kind === 'CHECK_IN' ? 'Entrada solicitada por el huésped' : 'Salida solicitada por el huésped'}</p>)}
    {journey.requests.isError && <p role="alert">No se pudieron consultar las solicitudes Guest. La operación presencial sigue disponible.</p>}
    {target && <button ref={trigger} type="button" className={styles.primary} disabled={blocked || operation.busy}
      onClick={() => { operation.prepare(); if (!operation.uncertain || !selected) setSelected({ action: target, stay: { ...stay } }); setOpen(true); setNotice(''); }}>
      <SvgIcon name={target==='check-in'?'room':'logout'} style={{verticalAlign:'middle',marginInlineEnd:8}}/>{operation.uncertain ? 'Reintentar operación pendiente' : target === 'check-in' ? 'Registrar entrada' : 'Registrar salida'}</button>}
    {blocked && <p className={styles.note}>{target === 'check-in' ? 'Asigna una habitación para habilitar la entrada.' : exitReason}</p>}
    {notice && <p ref={noticeElement} tabIndex={-1} className={styles.summary} role="status">{notice}</p>}
    {open && selected && <Modal title={entering ? 'Confirmar entrada' : 'Confirmar salida'} busy={operation.busy} onClose={close}
      footer={<>
        <button type="button" className={styles.secondary} onClick={close} disabled={operation.busy}>Volver al detalle</button>
        <button type="button" className={styles.primary} onClick={() => void confirm()} disabled={operation.busy || Boolean(operation.error && !operation.uncertain) || !entering && !operation.uncertain && Boolean(exitReason)}>
          {operation.busy ? 'Registrando…' : operation.uncertain ? 'Reintentar misma operación' : entering ? 'Confirmar entrada' : 'Confirmar salida'}</button>
      </>}>
      <div className={styles.body} aria-busy={operation.busy}>
        <p className={styles.summary}><strong>{selected.stay.roomLabel ? `Habitación ${selected.stay.roomLabel}` : 'Sin habitación asignada'}</strong><span>{selected.stay.roomType}</span></p>
        {entering && <p>Se verificará la habitación y la fecha de entrada.</p>}
        {operation.error && <p className={styles.error} role="alert">{operation.error}</p>}
      </div>
    </Modal>}
  </div>;
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/shared/components';
import { useStayLifecycle } from '../hooks/use-stay-lifecycle';
import type { ReservationStayDetail } from '../model/reservation-detail';
import type { StayLifecycleAction } from '../model/stay-lifecycle';
import styles from './room-assignment.module.css';

export function StayLifecycleActions({ propertyId, reservationId, sessionId, stay, reservationConfirmed }: Readonly<{
  propertyId: string; reservationId: string; sessionId: string; stay: ReservationStayDetail; reservationConfirmed: boolean;
}>) {
  const operation = useStayLifecycle({ propertyId, reservationId, stayId: stay.id }, sessionId, true);
  const [selected, setSelected] = useState<{ action: StayLifecycleAction; stay: ReservationStayDetail }>();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const noticeElement = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (notice) noticeElement.current?.focus(); }, [notice]);
  const target = operation.retryAction ?? (stay.travelState === 'IN_HOUSE' ? 'check-out'
    : stay.travelState === 'RESERVED' && reservationConfirmed ? 'check-in' : undefined);
  const blocked = !operation.retryAction && target === 'check-in' && !stay.roomId;
  const entering = selected?.action === 'check-in';
  function close() { setOpen(false); queueMicrotask(() => trigger.current?.focus()); }
  async function confirm() {
    if (!selected?.stay.updatedAt) return;
    const result = await operation.confirm(selected.action, { expectedStatus: entering ? 'RESERVED' : 'IN_HOUSE',
      expectedUpdatedAt: selected.stay.updatedAt, expectedRoomId: selected.stay.roomId });
    if (result) {
      setNotice(`${entering ? 'Entrada' : 'Salida'} registrada. Consulta el estado actualizado de la estadía.${!entering && stay.roomId ? ' La habitación asignada queda pendiente de limpieza.' : ''}`);
      close();
    }
  }
  return <div>
    {target && <button ref={trigger} type="button" className={styles.primary} disabled={blocked || operation.busy}
      onClick={() => { operation.prepare(); if (!operation.uncertain || !selected) setSelected({ action: target, stay: { ...stay } }); setOpen(true); setNotice(''); }}>
      {operation.uncertain ? 'Reintentar operación pendiente' : target === 'check-in' ? 'Registrar entrada' : 'Registrar salida'}</button>}
    {blocked && <p className={styles.note}>Asigna una habitación para habilitar la entrada.</p>}
    {notice && <p ref={noticeElement} tabIndex={-1} className={styles.summary} role="status">{notice}</p>}
    {open && selected && <Modal title={entering ? 'Confirmar entrada' : 'Confirmar salida'} busy={operation.busy} onClose={close}
      footer={<>
        <button type="button" className={styles.secondary} onClick={close} disabled={operation.busy}>Volver al detalle</button>
        <button type="button" className={styles.primary} onClick={() => void confirm()} disabled={operation.busy || Boolean(operation.error && !operation.uncertain)}>
          {operation.busy ? 'Registrando…' : operation.uncertain ? 'Reintentar misma operación' : entering ? 'Confirmar entrada' : 'Confirmar salida'}</button>
      </>}>
      <div className={styles.body} aria-busy={operation.busy}>
        <p className={styles.summary}><strong>{selected.stay.roomLabel ? `Habitación ${selected.stay.roomLabel}` : 'Sin habitación asignada'}</strong><span>{selected.stay.roomType}</span></p>
        <p>{entering ? 'Se verificará que la habitación esté inspeccionada, sin bloqueos ni ocupación incompatible y que la fecha de entrada corresponda al calendario local del hotel.'
          : 'Se verificará que todos los folios de la reserva tengan un saldo comprobable sin deuda pendiente. La habitación asignada pasará a sucia.'}</p>
        {!entering && <p className={styles.notice}>Puedes registrar una salida anticipada. Se conservarán las fechas originales y los cargos existentes; esta acción no realiza cobros ni reembolsos.</p>}
        <p className={styles.note}>Esta acción corresponde únicamente a esta estadía. Las demás habitaciones de la reserva conservan su estado.</p>
        {operation.error && <p className={styles.error} role="alert">{operation.error}</p>}
      </div>
    </Modal>}
  </div>;
}

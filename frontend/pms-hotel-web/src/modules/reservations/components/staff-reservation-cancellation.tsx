'use client';
import { useRef, useState } from 'react';
import { Modal } from '@/shared/components';
import { cancellationMessages, useStaffCancellation } from '../hooks/use-staff-cancellation';
import type { CancellationFinance, CancellationScope } from '../model/staff-cancellation';
import styles from './staff-reservation-cancellation.module.css';

function FinancialSummary({ finance }: Readonly<{ finance: CancellationFinance }>) {
  const format = new Intl.NumberFormat('es-GT', { style: 'currency', currency: finance.currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (minor: number) => {
    const cents = BigInt(minor);
    return format.formatToParts(cents / 100n).map(part => part.type === 'fraction'
      ? (cents % 100n).toString().padStart(2, '0') : part.value).join('');
  };
  return <dl className={styles.figures}>
    <div><dt>Alojamiento original</dt><dd>{money(finance.accommodationMinor)}</dd></div>
    <div><dt>Pagos conservados</dt><dd>{money(finance.paidMinor)}</dd></div>
    <div><dt>Penalización · 10%</dt><dd>{money(finance.penaltyMinor)}</dd></div>
    <div className={styles.total}><dt>{finance.creditMinor > 0 ? 'Saldo a favor del cliente' : 'Saldo pendiente'}</dt>
      <dd>{money(finance.creditMinor > 0 ? finance.creditMinor : finance.dueMinor)}</dd></div>
  </dl>;
}
export function StaffReservationCancellation(props: Readonly<CancellationScope & { sessionId: string; cancelled: boolean }>) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const action = useStaffCancellation({ propertyId: props.propertyId, reservationId: props.reservationId }, props.sessionId, open);
  const preview = action.query.data;
  const result = action.receipt ?? preview?.completed;
  const locked = action.busy || action.uncertain;
  function close() { if (locked) return; setOpen(false); queueMicrotask(() => trigger.current?.focus()); }
  function confirm() {
    if (!action.uncertain && (!reason.trim() || reason.trim().length > 255)) {
      setReasonError(true); reasonInput.current?.focus(); return;
    }
    void action.confirm(reason);
  }
  return <>
    <button ref={trigger} className={styles.trigger} type="button" onClick={() => setOpen(true)}>
      {props.cancelled || action.receipt ? 'Ver cancelación' : 'Cancelar reserva'}</button>
    {open && <Modal className={styles.dialog} title={result ? 'Cancelación registrada' : 'Cancelar reserva completa'} busy={locked} onClose={close} footer={<>
      <button type="button" className={styles.secondary} onClick={close} disabled={locked}>Cerrar</button>
      {!result && <button type="button" className={styles.danger} onClick={confirm}
        disabled={action.busy || (!action.uncertain && (!preview?.canCancel || action.query.isFetching || !!action.error))}>
        {action.busy ? 'Registrando cancelación…' : action.uncertain ? 'Comprobar la misma operación' : 'Confirmar cancelación'}</button>}
    </>}>
      <div className={styles.body} role="region" aria-label="Detalle de cancelación" tabIndex={0} aria-busy={action.busy}>
        {result ? <>
          <p role="status" className={styles.notice}>Reserva cancelada · {result.staysCancelled} {result.staysCancelled === 1 ? 'estadía liberada' : 'estadías liberadas'}.</p>
          <FinancialSummary finance={result.financial} />
          <p><strong>Motivo:</strong> {result.reason}</p>
          <p className={styles.note}>Registrada el {new Date(result.completedAt).toLocaleString('es-GT')}. Importes al cancelar; los movimientos posteriores se consultan en Folio y pagos.</p>
        </> : action.query.isPending ? <p role="status">Verificando reserva y folio…</p>
          : action.query.isError ? <div role="alert"><p>No pudimos obtener una vista previa válida.</p>
            <button type="button" className={styles.secondary} onClick={() => void action.reload()}>Reintentar consulta</button></div>
            : preview && <>
              <p><strong>{preview.confirmationCode}</strong> · {preview.stayCount} {preview.stayCount === 1 ? 'habitación' : 'habitaciones'}</p>
              {!preview.canCancel ? <p role="status" className={styles.error}>{cancellationMessages[preview.blockingCode ?? ''] ?? 'Esta reserva requiere revisión antes de cancelarse.'}</p> : <>
                <p>Se cancelarán todas las estadías de esta reserva y se liberará su disponibilidad.</p>
                {preview.financial && <FinancialSummary finance={preview.financial} />}
                <p className={styles.notice}>El alojamiento se compensa y se registra una penalización del 10%. Los pagos se conservan. El excedente queda como saldo a favor del cliente en el folio; esta acción no realiza un reembolso.</p>
                <label className={styles.label} htmlFor="cancellation-reason">Motivo de cancelación <span aria-hidden="true">*</span></label>
                <textarea ref={reasonInput} id="cancellation-reason" maxLength={255} rows={3} value={reason}
                  disabled={locked} aria-invalid={reasonError} aria-describedby="cancellation-reason-help"
                  onChange={event => { setReason(event.target.value); setReasonError(false); }} />
                <small id="cancellation-reason-help" className={reasonError ? styles.error : styles.note}>
                  {reasonError ? 'Escribe el motivo antes de confirmar. ' : 'El motivo quedará en la auditoría. '}{reason.length}/255</small>
              </>}
            </>}
        {action.error && <div role="alert" className={styles.error}><p>{action.error}</p>
          {!locked && <button type="button" className={styles.secondary} onClick={() => void action.reload()}>Actualizar vista previa</button>}</div>}
        <p className={styles.note}>Se verifica nuevamente al confirmar. No se eliminan movimientos, datos del huésped ni el historial de habitaciones.</p>
      </div>
    </Modal>}
  </>;
}

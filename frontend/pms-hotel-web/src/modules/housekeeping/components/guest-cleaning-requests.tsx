"use client";
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { OperationalRequestTable, useOperationalRequestFilters, Modal, ConfirmDialog, type DataTableColumn } from '@/shared/components';
import { useGuestCleaningRequests } from '../hooks/use-guest-cleaning-requests';
import { type GuestCleaningRequest } from '../model/guest-cleaning-request';
import { HttpStatusError } from '@/lib/http/errors';
import { useHousekeepingTransition } from '../hooks/use-housekeeping-transition';
import { type HousekeepingTransitionTarget } from '../model/guest-cleaning-request';
import styles from './staff-housekeeping.module.css';

const columns: DataTableColumn<GuestCleaningRequest>[] = [
  { key: 'reservation', header: 'Reserva / Habitación', render: row => `${row.reference} · ${row.roomLabel ?? 'Por asignar'}` },
  { key: 'service', header: 'Servicio', render: row => row.serviceLabel },
  { key: 'schedule', header: 'Fecha / Horario', render: row => `${row.serviceDate} · ${row.timeSlot}` },
  { key: 'notes', header: 'Notas', render: row => row.notes ?? '—' },
];

interface GuestCleaningRequestsProps {
  propertyId: string;
  sessionId: string;
  canManage?: boolean;
  /** Places the KPI in the board while keeping its query and dialog outside board refreshes. */
  children?: (card: ReactNode, dialogOpen: boolean) => ReactNode;
}

/** One property-scoped query supplies both the pending KPI and the complete table; management requires OPERATIONS_MANAGE. */
export function GuestCleaningRequests({ propertyId, sessionId, children, canManage = false }: GuestCleaningRequestsProps) {
  const filterState = useOperationalRequestFilters();
  const query = useGuestCleaningRequests(propertyId, sessionId);
  const mutation = useHousekeepingTransition(propertyId, sessionId);
  const [selection, setSelection] = useState<{ row: GuestCleaningRequest; targetStatus: HousekeepingTransitionTarget } | null>(null);
  const submitting = useRef(false);
  const [notice, setNotice] = useState('');
  async function refresh() { if (submitting.current) return; setSelection(null); mutation.reset(); setNotice(''); await query.refetch(); }
  async function confirm() {
    if (!selection || !canManage || submitting.current) return;
    submitting.current = true;
    try {
      await mutation.mutateAsync({ id: selection.row.id, expectedUpdatedAt: selection.row.updatedAt, targetStatus: selection.targetStatus });
      setSelection(null); setNotice('Estado de la solicitud actualizado.');
    } catch { /* Keep selection and show the safe error; no optimistic transition. */ }
    finally { submitting.current = false; }
  }
  const actionLabel = selection?.targetStatus === 'IN_PROGRESS' ? 'Iniciar limpieza' : 'Marcar como completada';
  const tableColumns = [...columns, { key: 'actions', header: 'Acciones', render: (row: GuestCleaningRequest) => canManage && (row.status === 'OPEN' || row.status === 'IN_PROGRESS')
    ? <button type="button" className={styles.secondary} disabled={mutation.isPending} onClick={() => { mutation.reset();setNotice('');setSelection({ row, targetStatus: row.status === 'OPEN' ? 'IN_PROGRESS' : 'DONE' }); }}>{row.status === 'OPEN' ? 'Iniciar limpieza' : 'Marcar como completada'}</button> : '—' }];
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setOpen(false); trigger.current?.focus(); }, []);
  const pending = query.data?.filter(row => row.status === 'OPEN' || row.status === 'IN_PROGRESS').length;
  const countAvailable = pending !== undefined && !query.isPending && !query.isError && query.fetchStatus !== 'paused';
  const countLabel = countAvailable ? String(pending) : query.isError ? 'No disponible' : query.fetchStatus === 'paused' ? 'Sin conexión' : 'Cargando';
  const card = <button type="button" ref={trigger} className={`${styles.metric} ${styles.metricButton}`}
    aria-label={`Limpiezas solicitadas: ${countLabel}`} aria-haspopup="dialog" aria-expanded={open}
    aria-busy={query.isFetching} onClick={() => setOpen(true)}>
    <span>Limpiezas solicitadas</span><strong aria-live="polite">{countAvailable ? pending : '—'}</strong>
  </button>;

  return <>{children ? children(card, open) : card}
    {open && !selection && <Modal title="Solicitudes de limpieza" onClose={close} initialFocusRef={closeButton} className={styles.requestsDialog}
      footer={<button type="button" ref={closeButton} className={styles.secondary} onClick={close}>Cerrar</button>}>
      <button type="button" className={styles.secondary} disabled={query.isFetching} onClick={() => void refresh()}>Actualizar solicitudes</button>
      {notice ? <p role="status">{notice}</p> : null}
      {query.fetchStatus === 'paused' ? <p role="status">Sin conexión. Conéctate para consultar las solicitudes.</p>
        : query.isPending ? <p role="status">Consultando solicitudes…</p>
        : query.isError ? <p role="alert">No pudimos consultar las solicitudes. Revisa tu conexión y acceso a la propiedad y pulsa Actualizar solicitudes para reintentar.</p>
        : <OperationalRequestTable filterState={filterState} emptyMessage="Sin solicitudes de limpieza." columns={tableColumns} rows={query.data??[]} label="Solicitudes Guest de limpieza" minWidth={760} time={row=>row.timeSlot.slice(0,5)} searchText={row=>row.serviceLabel} />}
    </Modal>}
    {open && selection && <ConfirmDialog title={actionLabel} confirmLabel={mutation.isError ? 'Reintentar' : actionLabel} busyLabel="Guardando…" busy={mutation.isPending}
      confirmDisabled={mutation.error instanceof HttpStatusError && mutation.error.status === 409}
      body={<><p>{selection.row.reference} · {selection.row.roomLabel ?? 'Por asignar'}</p><p>Se actualizará únicamente el estado de esta solicitud.</p>
        {mutation.isError ? <div role="alert"><p>{mutation.error instanceof HttpStatusError && mutation.error.status === 409 ? 'La solicitud cambió. Actualiza antes de continuar.' : 'No pudimos confirmar el resultado. Reintenta o actualiza las solicitudes.'}</p><button type="button" className={styles.secondary} onClick={() => void refresh()}>Actualizar solicitudes</button></div> : null}</>}
      onConfirm={() => void confirm()} onCancel={() => { if (!submitting.current) { setSelection(null);mutation.reset(); } }} />}
  </>;
}

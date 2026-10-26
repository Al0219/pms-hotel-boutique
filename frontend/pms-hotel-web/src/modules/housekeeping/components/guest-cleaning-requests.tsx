"use client";
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { DataTable, Modal, type DataTableColumn } from '@/shared/components';
import { useGuestCleaningRequests } from '../hooks/use-guest-cleaning-requests';
import { guestCleaningStatusLabels, type GuestCleaningRequest } from '../model/guest-cleaning-request';
import styles from './staff-housekeeping.module.css';

const columns: DataTableColumn<GuestCleaningRequest>[] = [
  { key: 'reservation', header: 'Reserva / Habitación', render: row => `${row.reference} · ${row.roomLabel ?? 'Por asignar'}` },
  { key: 'service', header: 'Servicio', render: row => row.serviceLabel },
  { key: 'schedule', header: 'Fecha / Horario', render: row => `${row.serviceDate} · ${row.timeSlot}` },
  { key: 'notes', header: 'Notas', render: row => row.notes ?? '—' },
  { key: 'status', header: 'Estado', render: row => guestCleaningStatusLabels[row.status] },
];

interface GuestCleaningRequestsProps {
  propertyId: string;
  sessionId: string;
  /** Places the KPI in the board while keeping its query and dialog outside board refreshes. */
  children?: (card: ReactNode, dialogOpen: boolean) => ReactNode;
}

/** One property-scoped query supplies both the pending KPI and the complete read-only table. */
export function GuestCleaningRequests({ propertyId, sessionId, children }: GuestCleaningRequestsProps) {
  const query = useGuestCleaningRequests(propertyId, sessionId);
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
    {open && <Modal title="Solicitudes de limpieza" onClose={close} initialFocusRef={closeButton} className={styles.requestsDialog}
      footer={<button type="button" ref={closeButton} className={styles.secondary} onClick={close}>Cerrar</button>}>
      <button type="button" className={styles.secondary} disabled={query.isFetching} onClick={() => void query.refetch()}>Actualizar solicitudes</button>
      {query.fetchStatus === 'paused' ? <p role="status">Sin conexión. Conéctate para consultar las solicitudes.</p>
        : query.isPending ? <p role="status">Consultando solicitudes…</p>
        : query.isError ? <p role="alert">No pudimos consultar las solicitudes. Revisa tu conexión y acceso a la propiedad y pulsa Actualizar solicitudes para reintentar.</p>
        : !query.data?.length ? <p>Sin solicitudes de limpieza.</p>
        : <DataTable columns={columns} rows={query.data} getRowKey={row => row.id} label="Solicitudes Guest de limpieza" minWidth={760} scrollLabel="Desplazar solicitudes de limpieza" />}
    </Modal>}
  </>;
}

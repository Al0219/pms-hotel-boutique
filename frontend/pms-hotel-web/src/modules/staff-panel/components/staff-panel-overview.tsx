import Link from 'next/link';
import { reservationStatusLabels, reservationStatusVariant, visibleReservationStatus, type ReservationListItem } from '@/modules/reservations';
import type { Room } from '@/modules/rooms';
import { StatusBadge } from '@/shared/components/status-badge';
import { SvgIcon } from '@/shared/components/svg-icon';
import styles from './staff-panel.module.css';

const dateFormat = new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
const dateLabel = (value: Date | null) => value ? dateFormat.format(value) : 'Sin fecha';

export function StaffPanelOverview({ reservations, rooms }: { reservations: ReservationListItem[]; rooms: Room[] }) {
  const states = new Map<ReturnType<typeof visibleReservationStatus>, number>();
  for (const reservation of reservations) {
    const state = visibleReservationStatus(reservation);
    states.set(state, (states.get(state) ?? 0) + 1);
  }
  const types = new Map<string, { label: string; count: number }>();
  for (const room of rooms) {
    const key = room.roomTypeId ?? room.roomTypeLabel;
    const type = types.get(key) ?? { label: room.roomTypeLabel, count: 0 };
    type.count++; types.set(key, type);
  }
  const roomTypes = [...types.entries()].sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label, 'es'));
  const metrics = [
    { title: 'Reservas registradas', count: reservations.length, text: 'Reservas de todos los estados', icon: 'reservations' },
    { title: 'Estadías registradas', count: reservations.reduce((total, item) => total + (item.roomCount ?? 0), 0), text: 'Una reserva puede incluir varias estadías', icon: 'guests' },
    { title: 'Habitaciones físicas', count: rooms.length, text: 'Inventario del hotel seleccionado', icon: 'room' },
  ] as const;

  return <>
    <dl className={styles.metrics} aria-label="Resumen de la propiedad">
      {metrics.map(metric => <div key={metric.title}>
        <dt><span>{metric.title}<small className={styles.metricDescription}>{metric.text}</small></span><span className={styles.metricIcon}><SvgIcon name={metric.icon} /></span></dt>
        <dd>{metric.count}</dd>
      </div>)}
    </dl>
    <div className={styles.overviewGrid}>
      <section className={styles.surface} aria-labelledby="panel-reservation-states">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>SEGUIMIENTO</p><h2 id="panel-reservation-states">Estado de las reservas</h2></div><SvgIcon name="reservations" /></div>
        <p className={styles.sectionDescription}>Distribución de todas las reservas registradas, incluidas las históricas.</p>
        {reservations.length ? <ul className={styles.breakdown}>
          {[...states.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([state, count]) => <li key={state}>
            <div className={styles.barLabel}><StatusBadge size="sm" variant={reservationStatusVariant(state)}>{reservationStatusLabels[state]}</StatusBadge><strong>{count} <span>de {reservations.length}</span></strong></div>
            <div className={styles.track} aria-hidden="true"><span style={{ width: `${count / reservations.length * 100}%` }} /></div>
          </li>)}
        </ul> : <p className={styles.empty}>No hay reservas registradas en esta propiedad.</p>}
      </section>
      <section className={styles.surface} aria-labelledby="panel-inventory">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>INVENTARIO</p><h2 id="panel-inventory">Habitaciones por tipo</h2></div><SvgIcon name="room" /></div>
        <p className={styles.sectionDescription}>Conoce cómo se distribuyen las habitaciones físicas de tu hotel.</p>
        {rooms.length ? <ul className={styles.breakdown}>
          {roomTypes.map(([id, type]) => <li key={id}>
            <div className={styles.barLabel}><span>{type.label}</span><strong>{type.count} <span>{type.count === 1 ? 'habitación' : 'habitaciones'}</span></strong></div>
            <div className={`${styles.track} ${styles.inventoryTrack}`} aria-hidden="true"><span style={{ width: `${type.count / rooms.length * 100}%` }} /></div>
          </li>)}
        </ul> : <p className={styles.empty}>No hay habitaciones físicas registradas en esta propiedad.</p>}
        <p className={styles.inventoryNote}>El inventario físico no indica disponibilidad para reservar. Consulta fechas y estados en Habitaciones.</p>
      </section>
    </div>
    <section className={styles.surface} aria-labelledby="panel-recent">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>RECEPCIÓN</p><h2 id="panel-recent">Últimas reservas registradas</h2></div><Link className={styles.textLink} href="/reservas">Ver todas <SvgIcon name="arrow" /></Link></div>
      <p className={styles.sectionDescription}>Revisa los últimos registros y abre su detalle para continuar la atención.</p>
      {reservations.length ? <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Últimas reservas registradas">
        <table className={styles.table}>
          <thead><tr><th scope="col">Reserva / Huésped</th><th scope="col">Estadía</th><th scope="col">Habitación</th><th scope="col">Estado</th><th scope="col"><span className={styles.srOnly}>Detalle</span></th></tr></thead>
          <tbody>{reservations.slice(0, 5).map(reservation => {
            const state = visibleReservationStatus(reservation);
            return <tr key={reservation.id}>
              <td><Link className={styles.reference} href={`/reservas/${encodeURIComponent(reservation.id)}`}>{reservation.confirmationCode ?? reservation.id}</Link><span className={styles.cellSecondary}>{reservation.guestName ?? 'Huésped sin registrar'}</span></td>
              <td>{dateLabel(reservation.stayStart)} → {dateLabel(reservation.stayEnd)}<span className={styles.cellSecondary}>{reservation.nights === null ? 'Duración sin registrar' : `${reservation.nights} ${reservation.nights === 1 ? 'noche' : 'noches'}`}</span></td>
              <td>{reservation.roomLabel ?? (reservation.roomCount === 0 ? 'Sin estadías' : 'Sin asignar')}<span className={styles.cellSecondary}>{reservation.roomCount ?? 0} {reservation.roomCount === 1 ? 'estadía' : 'estadías'}</span></td>
              <td><StatusBadge size="sm" variant={reservationStatusVariant(state)}>{reservationStatusLabels[state]}</StatusBadge></td>
              <td><Link className={styles.detailLink} aria-label={`Abrir reserva ${reservation.confirmationCode ?? reservation.id}`} href={`/reservas/${encodeURIComponent(reservation.id)}`}><SvgIcon name="arrow" /></Link></td>
            </tr>;
          })}</tbody>
        </table>
      </div> : <div className={styles.empty}><SvgIcon name="reservations" /><p>Las nuevas reservas aparecerán aquí para darles seguimiento.</p><Link className={styles.textLink} href="/reservas">Ir al centro de reservas <SvgIcon name="arrow" /></Link></div>}
    </section>
  </>;
}

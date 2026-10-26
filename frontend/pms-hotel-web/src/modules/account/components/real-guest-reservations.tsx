'use client';
import Link from 'next/link';
import { useState } from 'react';
import { HttpNetworkError } from '@/lib/http/errors';
import { AccountFeedback, AccountSection } from './account-section';
import { useLinkedGuestReservations, useGuestStay } from '../hooks/use-linked-guest-reservations';
import styles from './history-page.module.css';

/** Uses only the confirmed Guest projection; no provisional history/occupants/policy. */
export function RealGuestReservations({ reservationId }: { reservationId?: string }) {
  const query = useLinkedGuestReservations();
  const [selected, setSelected] = useState<{ reservationId: string; stayId: string } | null>(null);
  const stay = useGuestStay(selected?.reservationId, selected?.stayId);
  const rows = reservationId ? query.data?.filter(row => row.id === reservationId) : query.data;
  const error = query.fetchStatus === 'paused' ? new HttpNetworkError() : query.error;
  return <AccountSection title={reservationId ? 'Detalle de reserva' : 'Mis reservas'} description="Reservas y estadías vinculadas a tu cuenta.">
    {reservationId && <Link href="/mis-reservas">← Volver a mis reservas</Link>}
    <div className={styles.list}>
      <AccountFeedback loading={query.isPending && query.fetchStatus !== 'paused'} error={error} retry={() => void query.refetch()} />
      {!error && rows && !rows.length && <div className={styles.empty}><h2>{reservationId ? 'Reserva no disponible' : 'No tienes reservas vinculadas'}</h2><p>{reservationId ? 'No encontramos esta reserva en tu cuenta.' : 'Las reservas confirmadas con tu correo verificado aparecerán aquí.'}</p><Link href="/habitaciones">Explorar habitaciones →</Link></div>}
      {!error && rows?.map(row => <article className={styles.reservation} key={row.id}>
        <div className={styles.cardHeading}><h3><Link href={`/cuenta/reservas/${encodeURIComponent(row.id)}`}>{row.reference}</Link></h3><span className={styles.badge}>{row.status}</span></div>
        <p className={styles.property}>{row.propertyName}</p>
        <ul className={styles.stays}>{row.stays.map(item => <li key={item.id}>
          <strong>{item.roomCode === null ? 'Habitación por asignar' : `Habitación ${item.roomCode}`}</strong>
          <span><time dateTime={item.arrival}>{item.arrival}</time> → <time dateTime={item.departure}>{item.departure}</time> · {item.status}</span>
          <button type="button" className={styles.details} onClick={() => setSelected({ reservationId: row.id, stayId: item.id })}>Ver estancia {item.id}</button>
        </li>)}</ul>
      </article>)}
      {selected && <section aria-label="Información de la estancia">
        <AccountFeedback loading={stay.isPending} error={stay.error} retry={() => void stay.refetch()} />
        {!stay.error && stay.data && <><h2>{stay.data.roomType.name}</h2><p>{stay.data.room ? `Habitación ${stay.data.room.code}` : 'Habitación por asignar'}</p><p>{stay.data.arrival} → {stay.data.departure} · {stay.data.status}</p><p>Estancia {stay.data.id}</p></>}
      </section>}
    </div>
  </AccountSection>;
}

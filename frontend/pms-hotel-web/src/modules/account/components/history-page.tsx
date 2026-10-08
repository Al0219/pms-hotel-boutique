'use client';
import Link from 'next/link';
import { getPublicEnvironment } from '@/lib/env';
import { HttpNetworkError } from '@/lib/http/errors';
import { AccountFeedback, AccountSection } from './account-section';
import { useGuestReservations } from '../hooks/use-guest-reservations';
import { ReservationLinkForm } from './reservation-link-form';
import styles from './history-page.module.css';

export function HistoryPage({ title = 'Reservas e historial' }: { title?: string } = {}) {
  const query = useGuestReservations();
  const offline = query.fetchStatus === 'paused';
  const error = offline ? new HttpNetworkError() : query.error;
  return <AccountSection title={title} description="Reservas actuales y pasadas vinculadas a tu cuenta. Cada reserva puede incluir varias estadías.">
    <div className={styles.layout}><div className={styles.list}>
      <AccountFeedback loading={query.isPending && !offline} error={error} retry={() => void query.refetch()} />
      {!error && query.data && (query.data.length === 0 ? <div className={styles.empty}><h2>Tu próxima estancia comienza aquí</h2><p>No tienes reservas vinculadas.</p><p>Si reservaste como invitado, utiliza el formulario de vinculación. Puedes agregar varias reservas a tu cuenta.</p><Link href="/habitaciones">Explorar habitaciones →</Link></div> : <>
        <p className={styles.count}>{query.data.length} {query.data.length === 1 ? 'reserva vinculada' : 'reservas vinculadas'}</p>
        {(['CURRENT', 'PAST'] as const).map(period => <section key={period}><h2 className={styles.sectionTitle}>{period === 'CURRENT' ? 'Reservas actuales' : 'Reservas pasadas'}</h2>
          {!query.data.some(item => item.period === period) && <p className={styles.small}>No hay reservas en esta sección.</p>}
          {query.data.filter(item => item.period === period).map(reservation => <article className={styles.reservation} key={reservation.id}>
            <div className={styles.cardHeading}><h3><Link href={`/cuenta/reservas/${encodeURIComponent(reservation.id)}`}>{reservation.id}</Link></h3><span className={styles.badge}>{reservation.statusLabel}</span></div>
            <p className={styles.property}>{reservation.propertyName}</p><p className={styles.small}>{reservation.stays.length} {reservation.stays.length === 1 ? 'estadía' : 'estadías'} · Responsable: {reservation.bookingGuest}</p>
            <ul className={styles.stays}>{reservation.stays.map(stay => <li key={stay.id}><strong>{stay.roomType}</strong><span><time dateTime={stay.arrival}>{stay.arrival}</time> → <time dateTime={stay.departure}>{stay.departure}</time> · {stay.statusLabel}</span></li>)}</ul>
            <Link className={styles.details} href={`/cuenta/reservas/${encodeURIComponent(reservation.id)}`}>Ver detalles <span className={styles.visuallyHidden}>de {reservation.id}</span><span aria-hidden="true">→</span></Link>
          </article>)}
        </section>)}
      </>)}
    </div>{getPublicEnvironment().useMockApi && <aside className={styles.linkAside}><ReservationLinkForm /></aside>}</div>
  </AccountSection>;
}

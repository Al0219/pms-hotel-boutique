'use client';
import Link from 'next/link';
import { useState } from 'react';
import { HttpNetworkError, HttpStatusError } from '@/lib/http';
import { useLinkedGuestReservations, useGuestStay } from '../hooks/use-linked-guest-reservations';
import type { LinkedGuestReservation } from '../model/linked-guest-reservation';
import { guestDateLabel, guestReservationLabel, guestStayLabel, guestStayNights } from '../model/real-guest-reservations';
import styles from './real-guest-reservations.module.css';

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className={styles.page}><div className={styles.container}>
    <nav className={styles.nav} aria-label="Tu cuenta"><Link href="/cuenta">← Mi cuenta</Link><Link href="/habitaciones">Buscar otra estancia</Link></nav>
    <header className={styles.header}><div><p className={styles.overline}>TU PRÓXIMA ESTADÍA COMIENZA AQUÍ</p><h1>{title}</h1><p>Consulta las reservas vinculadas a tu cuenta, con todas sus estancias en un solo lugar.</p></div><Link className={styles.secondary} href="/cuenta/reservas/vincular">Vincular reserva existente <span aria-hidden="true">↗</span></Link></header>
    {children}
  </div></section>;
}
function ReadError({ error, retry }: { error: unknown; retry: () => void }) {
  return <div className={styles.feedback}><p role="alert">{error instanceof HttpStatusError && error.status === 404 ? 'Esta estancia no está disponible en tu cuenta.' : 'No pudimos consultar tus reservas. Tu reserva no se cancela por este inconveniente.'}</p><button className={styles.secondary} onClick={retry}>Reintentar consulta</button><Link href="/mis-reservas">Volver a mis reservas</Link></div>;
}

/** Shares the existing Web/Android Guest projection and reconciliation contract. */
export function RealGuestReservations({ reservationId }: { reservationId?: string }) {
  const query = useLinkedGuestReservations();
  const [selected, setSelected] = useState<{ reservationId: string; stayId: string } | null>(null);
  const stay = useGuestStay(selected?.reservationId, selected?.stayId);
  const rows = reservationId ? query.data?.filter(row => row.id === reservationId) : query.data;
  const unavailable = query.isError || query.fetchStatus === 'paused';
  const stayUnavailable = stay.isError || stay.fetchStatus === 'paused';
  return <Frame title={reservationId ? 'Detalle de tu reserva' : 'Mis reservas'}>
    {reservationId && <Link className={styles.back} href="/mis-reservas">← Volver a mis reservas</Link>}
    {query.isPending && !unavailable && <div className={styles.feedback} role="status" aria-live="polite">Consultando tus reservas…</div>}
    {unavailable && <ReadError error={query.error ?? new HttpNetworkError()} retry={() => { void query.refetch(); }} />}
    {!unavailable && rows && <>
      {!rows.length ? <div className={styles.empty}><span className={styles.emptyIcon} aria-hidden="true">⌂</span><h2>{reservationId ? 'Reserva no disponible' : 'Tu próxima estancia comienza aquí'}</h2><p>{reservationId ? 'No encontramos esta reserva en tu cuenta.' : 'Aún no hay reservas vinculadas a esta cuenta.'}</p><p>{reservationId ? 'Puedes volver al historial para consultar tus reservas disponibles.' : 'Las reservas confirmadas compatibles se recuperan con tu correo verificado. Si acabas de reservar como invitado y aún no aparece, puedes vincularla con la referencia de tu comprobante.'}</p><div className={styles.actions}><Link className={styles.primary} href="/cuenta/reservas/vincular">Vincular mi reserva</Link><Link className={styles.secondary} href="/habitaciones">Explorar habitaciones</Link></div></div>
        : <><p className={styles.count}>{rows.length} {rows.length === 1 ? 'reserva vinculada' : 'reservas vinculadas'}</p><div className={styles.grid}>{rows.map(reservation => <ReservationCard key={reservation.id} reservation={reservation} onSelect={stayId => setSelected({ reservationId: reservation.id, stayId })} />)}</div></>}
    </>}
    {selected && !unavailable && rows?.some(row => row.id === selected.reservationId && row.stays.some(item => item.id === selected.stayId)) && <section className={styles.detail} aria-label="Información de la estancia">
      {stay.isPending && !stayUnavailable && <div className={styles.feedback} role="status">Consultando tu estancia…</div>}
      {stayUnavailable && <ReadError error={stay.error ?? new HttpNetworkError()} retry={() => { void stay.refetch(); }} />}
      {!stayUnavailable && stay.data && <article className={styles.card}><p className={styles.overline}>DETALLE DE LA ESTANCIA</p><h2 className={styles.hotel}>{stay.data.roomType.name}</h2><p>{stay.data.room ? `Habitación ${stay.data.room.code}` : 'Habitación por asignar'}</p><p className={styles.dates}><time dateTime={stay.data.arrival}>{guestDateLabel(stay.data.arrival)}</time> → <time dateTime={stay.data.departure}>{guestDateLabel(stay.data.departure)}</time></p><p className={styles.muted}>{guestStayNights(stay.data)} noches · {guestStayLabel(stay.data.status)}</p></article>}
    </section>}
    <aside className={styles.notice}>Reservar como invitado no crea una cuenta. Solo verás aquí reservas vinculadas mediante una verificación de correo.</aside>
  </Frame>;
}
function ReservationCard({ reservation, onSelect }: { reservation: LinkedGuestReservation; onSelect: (stayId: string) => void }) {
  return <article className={styles.card}>
    <div className={styles.cardTop}><div><span className={styles.overline}>CÓDIGO DE RESERVA</span><h2><Link className={styles.reference} href={`/cuenta/reservas/${encodeURIComponent(reservation.id)}`}>{reservation.reference}</Link></h2></div><span className={styles.badge} data-state={reservation.status}>{guestReservationLabel(reservation.status)}</span></div>
    <h3 className={styles.hotel}>{reservation.propertyName}</h3>
    <p className={styles.muted}>{reservation.stays.length} {reservation.stays.length === 1 ? 'estancia' : 'estancias'}</p>
    <ul className={styles.stays}>{reservation.stays.map((stay, i) => <li key={stay.id}><div><span className={styles.overline}>ESTANCIA {i + 1}</span><h3>{stay.roomCode === null ? 'Habitación por asignar' : `Habitación ${stay.roomCode}`}</h3></div>
      {reservation.status !== 'CANCELLED' && <span className={styles.stayStatus}>{guestStayLabel(stay.status)}</span>}
      <p className={styles.dates}><time dateTime={stay.arrival}>{guestDateLabel(stay.arrival)}</time><span aria-hidden="true">→</span><time dateTime={stay.departure}>{guestDateLabel(stay.departure)}</time></p>
      <span className={styles.muted}>{guestStayNights(stay)} {guestStayNights(stay) === 1 ? 'noche' : 'noches'}</span>
      <button className={styles.secondary} type="button" onClick={() => onSelect(stay.id)}>Ver estancia {i + 1}</button>
    </li>)}</ul>
  </article>;
}

'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useGuestSession } from '@/modules/auth';
import { HttpStatusError } from '@/lib/http';
import { useRealGuestReservation, useRealGuestReservations } from '../hooks/use-real-guest-reservations';
import { guestDateLabel, guestReservationLabels, guestStayLabels, guestStayNights, type RealGuestReservation } from '../model/real-guest-reservations';
import styles from './real-guest-reservations.module.css';

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className={styles.page}><div className={styles.container}>
    <nav className={styles.nav} aria-label="Tu cuenta"><Link href="/cuenta">← Mi cuenta</Link><Link href="/habitaciones">Buscar otra estancia</Link></nav>
    <header className={styles.header}><div><p className={styles.overline}>TU PRÓXIMA ESTADÍA COMIENZA AQUÍ</p><h1>{title}</h1><p>Consulta las reservas vinculadas a tu cuenta, con todas sus estancias en un solo lugar.</p></div><Link className={styles.secondary} href="/cuenta/reservas/vincular">Vincular reserva existente <span aria-hidden="true">↗</span></Link></header>
    {children}
  </div></section>;
}
function ReadError({ error, retry }: { error: unknown; retry: () => void }) {
  return <div className={styles.feedback}><p role="alert">{error instanceof HttpStatusError && error.status === 404 ? 'Esta reserva no está disponible en tu cuenta.' : 'No pudimos consultar tus reservas. Tu reserva no se cancela por este inconveniente.'}</p><button className={styles.secondary} onClick={retry}>Reintentar consulta</button><Link href="/mis-reservas">Volver a mis reservas</Link></div>;
}
export function RealGuestReservationsPage() {
  const { account } = useGuestSession();
  return account ? <History key={account.id} /> : null;
}
function History() {
  const [page, setPage] = useState(0); const query = useRealGuestReservations(page);
  const unavailable = query.isError || query.fetchStatus === 'paused';
  return <Frame title="Mis reservas">
    {query.isPending && !unavailable && <div className={styles.feedback} role="status" aria-live="polite">Consultando tus reservas…</div>}
    {unavailable && <ReadError error={query.error} retry={() => { void query.refetch(); }} />}
    {!unavailable && query.data && <>
      {query.data.totalElements === 0 ? <div className={styles.empty}><span className={styles.emptyIcon} aria-hidden="true">⌂</span><h2>Tu próxima estancia comienza aquí</h2><p>Aún no hay reservas vinculadas a esta cuenta.</p><p>Si acabas de reservar como invitado, tu reserva puede estar confirmada sin aparecer todavía aquí. Vincúlala con la referencia de tu comprobante y el mismo correo con el que reservaste.</p><div className={styles.actions}><Link className={styles.primary} href="/cuenta/reservas/vincular">Vincular mi reserva</Link><Link className={styles.secondary} href="/habitaciones">Explorar habitaciones</Link></div></div>
        : <><p className={styles.count}>{query.data.totalElements} {query.data.totalElements === 1 ? 'reserva vinculada' : 'reservas vinculadas'}</p>
          {!query.data.items.length ? <div className={styles.feedback}><p>Esta página no tiene resultados.</p><button className={styles.secondary} onClick={() => setPage(0)}>Volver a la primera página</button></div>
            : <div className={styles.grid}>{query.data.items.map(reservation => <ReservationCard key={reservation.reservationId} reservation={reservation} />)}</div>}
          <nav className={styles.pagination} aria-label="Páginas de mis reservas"><button className={styles.secondary} disabled={page === 0 || query.isFetching} onClick={() => setPage(p => p - 1)}>← Anterior</button><span>Página {page + 1} de {Math.ceil(query.data.totalElements / query.data.size)}</span><button className={styles.secondary} disabled={(page + 1) * query.data.size >= query.data.totalElements || query.isFetching} onClick={() => setPage(p => p + 1)}>Siguiente →</button></nav>
        </>}
    </>}
    <aside className={styles.notice}>Reservar como invitado no crea una cuenta. Solo verás aquí reservas vinculadas mediante una verificación de correo.</aside>
  </Frame>;
}
function ReservationCard({ reservation, detail = false }: { reservation: RealGuestReservation; detail?: boolean }) {
  return <article className={styles.card}>
    <div className={styles.cardTop}><div><span className={styles.overline}>CÓDIGO DE RESERVA</span><h2>{reservation.confirmationCode}</h2></div><span className={styles.badge} data-state={reservation.status}>{guestReservationLabels[reservation.status]}</span></div>
    <h3 className={styles.hotel}>{reservation.propertyName}</h3>
    {reservation.bookingGuestName && <p className={styles.muted}>Responsable: {reservation.bookingGuestName}</p>}
    <p className={styles.muted}>{reservation.stays.length} {reservation.stays.length === 1 ? 'estancia' : 'estancias'} · Hora local del hotel: {reservation.propertyTimeZone}</p>
    <ul className={styles.stays}>{reservation.stays.map((stay, i) => <li key={stay.reservationStayId}><div><span className={styles.overline}>ESTANCIA {i + 1}</span><h3>{stay.roomTypeName}</h3></div>
      {reservation.status !== 'CANCELLED' && <span className={styles.stayStatus}>{guestStayLabels[stay.status]}</span>}
      <p className={styles.dates}><time dateTime={stay.arrival}>{guestDateLabel(stay.arrival)}</time><span aria-hidden="true">→</span><time dateTime={stay.departure}>{guestDateLabel(stay.departure)}</time></p>
      <span className={styles.muted}>{guestStayNights(stay)} {guestStayNights(stay) === 1 ? 'noche' : 'noches'}</span>
    </li>)}</ul>
    {!reservation.stays.length && <p className={styles.muted}>Esta reserva todavía no tiene estancias registradas. Si esperabas una confirmación, consulta al hotel.</p>}
    {!detail && <Link className={styles.details} href={`/cuenta/reservas/${reservation.reservationId}`}>Ver detalle de {reservation.confirmationCode} <span aria-hidden="true">→</span></Link>}
  </article>;
}
export function RealGuestReservationDetail({ reservationId }: { reservationId: string }) {
  const query = useRealGuestReservation(reservationId);
  const unavailable = query.isError || query.fetchStatus === 'paused';
  return <Frame title="Detalle de tu reserva"><Link className={styles.back} href="/mis-reservas">← Volver a mis reservas</Link>
    {query.isPending && !unavailable && <div className={styles.feedback} role="status">Consultando tu reserva…</div>}
    {unavailable && <ReadError error={query.error} retry={() => { void query.refetch(); }} />}
    {!unavailable && query.data && <div className={styles.detail}><ReservationCard reservation={query.data.reservation} detail /><aside className={styles.guide}><p className={styles.overline}>VIAJA CON TRANQUILIDAD</p><h2>Tu estancia, a mano</h2><p>Conserva tu código de reserva para tu llegada. Las fechas que ves corresponden al calendario local del hotel.</p><p>Para cambios o solicitudes especiales, comunícate directamente con el hotel.</p><Link className={styles.secondary} href="/habitaciones">Planear otra estancia</Link></aside></div>}
  </Frame>;
}

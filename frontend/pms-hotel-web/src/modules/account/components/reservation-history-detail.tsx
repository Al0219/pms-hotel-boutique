"use client";
import Link from "next/link";
import { AccountFeedback, AccountSection } from "./account-section";
import { useGuestReservations } from "../hooks/use-guest-reservations";

export function ReservationHistoryDetail({ reservationId }: { reservationId: string }) {
  const query = useGuestReservations();
  const reservation = query.data?.find(item => item.id === reservationId);
  return <AccountSection title="Detalle de reserva">
    <Link href="/cuenta/reservas">← Volver a reservas</Link>
    <AccountFeedback loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    {!query.isPending && !query.error && !reservation && <p role="status">No se encontró una reserva vinculada con ese código.</p>}
    {!query.error && reservation && <>
      <h2>{reservation.id}</h2><p>{reservation.propertyName} · {reservation.statusLabel}</p>
      <p>Responsable de la reserva: {reservation.bookingGuest}</p><p>Política: {reservation.policy}</p>
      <h2>Estadías de esta reserva</h2>
      {reservation.stays.map(stay => <article key={stay.id}>
        <h3>{stay.roomType}</h3><p>Estadía {stay.id} · {stay.statusLabel}</p>
        <p><time dateTime={stay.arrival}>{stay.arrival}</time> → <time dateTime={stay.departure}>{stay.departure}</time></p>
        <h4>Ocupantes</h4><ul>{stay.occupants.map(guest => <li key={guest.profileId}>{guest.name}</li>)}</ul>
        {!stay.occupants.length && <p>Sin ocupantes asignados.</p>}
      </article>)}
    </>}
  </AccountSection>;
}

"use client";
import Link from "next/link";
import { AccountFeedback, AccountSection } from "./account-section";
import { useGuestReservations } from "../hooks/use-guest-reservations";

export function HistoryPage() {
  const query = useGuestReservations();
  return <AccountSection title="Reservas e historial" description="Reservas actuales y pasadas vinculadas a tu cuenta. Cada reserva puede incluir varias estadías.">
    <AccountFeedback loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    {!query.error && query.data && (query.data.length === 0 ? <p>No tienes reservas vinculadas.</p> : (["CURRENT", "PAST"] as const).map(period => <section key={period}>
      <h2>{period === "CURRENT" ? "Reservas actuales" : "Reservas pasadas"}</h2>
      {!query.data.some(item => item.period === period) && <p>No hay reservas en esta sección.</p>}
      {query.data.filter(item => item.period === period).map(reservation => <article key={reservation.id}>
        <h3><Link href={`/cuenta/reservas/${encodeURIComponent(reservation.id)}`}>{reservation.id}</Link></h3>
        <p>{reservation.propertyName} · {reservation.statusLabel}</p>
        <p>{reservation.stays.length} estadías · Responsable: {reservation.bookingGuest}</p>
        <ul>{reservation.stays.map(stay => <li key={stay.id}>{stay.roomType} · {stay.arrival} → {stay.departure} · {stay.statusLabel}</li>)}</ul>
      </article>)}
    </section>))}
  </AccountSection>;
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RoomPhotoCarousel, displayMoney } from '@/modules/booking';
import type { ReservationLookup } from '../model/reservation-lookup';
import { guestDateLabel, guestReservationLabel, guestStayLabel, guestStayNights } from '../model/real-guest-reservations';
import styles from './reservation-lookup-details.module.css';

export function ReservationLookupDetails({ result, contactEmail, onClose, authenticated = false }: {
  result: ReservationLookup; contactEmail: string; onClose: () => void; authenticated?:boolean;
}) {
  const [currency, setCurrency] = useState<'GTQ' | 'USD'>('GTQ');
  const [feedback, setFeedback] = useState('');
  const { reservation, accommodations, overview } = result;
  const first = accommodations[0];
  const arrival = accommodations.reduce((date, stay) => stay.arrival < date ? stay.arrival : date, first.arrival);
  const departure = accommodations.reduce((date, stay) => stay.departure > date ? stay.departure : date, first.departure);
  const sameDates = accommodations.every(stay => stay.arrival === first.arrival && stay.departure === first.departure);
  const nights = guestStayNights(first);
  const creation = new Intl.DateTimeFormat('es-GT', { dateStyle: 'long', timeZone: first.timezone }).format(new Date(overview.createdAt));
  const source = overview.source === 'WEB_DIRECTA' ? 'Sitio web del hotel' : overview.source === 'WALK_IN' ? 'Recepción del hotel' : 'Otro canal';
  const copy = async () => {
    try { await navigator.clipboard.writeText(reservation.reference); setFeedback('Código copiado al portapapeles.'); }
    catch { setFeedback('No se pudo copiar. Puedes seleccionar el código de la reserva.'); }
  };
  return <section className={styles.result} aria-label="Resumen completo de tu reserva">
    <div className={styles.toolbar}><p role="status">Reserva encontrada · Consulta de lectura</p><button type="button" onClick={onClose}>{authenticated ? "Volver al historial" : "Consultar otra reserva"}</button></div>
    <header className={styles.referenceHeader}>
      <div><p className={styles.overline}>TU RESERVA EN {reservation.propertyName}</p><div className={styles.codeRow}><h2>{reservation.reference}</h2><button type="button" className={styles.copy} onClick={() => void copy()} aria-label="Copiar código de reserva">Copiar código</button></div></div>
      <span className={styles.badge} data-state={reservation.status}>{guestReservationLabel(reservation.status)}</span>
    </header>
    {feedback && <p className={styles.feedback} role="status">{feedback}</p>}
    <div className={styles.trip}>
      <div><span>{sameDates ? 'Check-in' : 'Primera llegada'}</span><strong>{guestDateLabel(arrival)}</strong></div>
      <div><span>{sameDates ? 'Check-out' : 'Última salida'}</span><strong>{guestDateLabel(departure)}</strong></div>
      <div><span>Tu selección</span><strong>{accommodations.length} {accommodations.length === 1 ? 'habitación' : 'habitaciones'}</strong><small>{sameDates ? `${nights} ${nights === 1 ? 'noche' : 'noches'} por habitación` : 'Fechas detalladas en cada habitación'}</small></div>
    </div>
    <div className={styles.layout}>
      <div className={styles.rooms}>
        {accommodations.map((stay, index) => <section key={stay.id} aria-label={`Información de la estancia ${index + 1}`}><article className={styles.roomCard}>
          <div className={styles.roomHeader}><div><p className={styles.overline}>HABITACIÓN {index + 1} DE {accommodations.length}</p><h2>{stay.roomType.name}</h2></div>{reservation.status !== 'CANCELLED' && <span className={styles.stayBadge}>{guestStayLabel(stay.status)}</span>}</div>
          <RoomPhotoCarousel key={stay.id} images={stay.images} name={stay.roomType.name} />
          <p className={styles.caption}>Fotografías de referencia del tipo de habitación reservado.</p>
          {stay.description && <p className={styles.description}>{stay.description}</p>}
          <dl className={styles.roomFacts}>
            <div><dt>Llegada</dt><dd><time dateTime={stay.arrival}>{guestDateLabel(stay.arrival)}</time></dd></div>
            <div><dt>Salida</dt><dd><time dateTime={stay.departure}>{guestDateLabel(stay.departure)}</time></dd></div>
            <div><dt>Duración</dt><dd>{guestStayNights(stay)} {guestStayNights(stay) === 1 ? 'noche' : 'noches'}</dd></div>
            <div><dt>Habitación física</dt><dd>{stay.room ? `Habitación ${stay.room.code}` : 'Pendiente de asignación'}</dd></div>
          </dl>
          {!stay.room && <p className={styles.assignment}>Reservaste este tipo de habitación. Recepción asignará el número de habitación para tu estancia.</p>}
          <p className={styles.timezone}>Fechas según la hora local del hotel · {stay.timezone.replaceAll('_', ' ')}</p>
        </article></section>)}
      </div>
      <aside className={styles.sidebar} aria-label="Datos y precio de la reserva">
        <section className={styles.summary}>
          <p className={styles.overline}>LO ESENCIAL, EN UN SOLO LUGAR</p><h2>Resumen de tu reserva</h2>
          <dl className={styles.summaryFacts}><div><dt>Hotel</dt><dd>{reservation.propertyName}</dd></div><div><dt>Fecha de reserva</dt><dd>{creation}</dd></div><div><dt>Canal de reserva</dt><dd>{source}</dd></div><div><dt>Correo de consulta</dt><dd>{contactEmail}</dd></div></dl>
          <div className={styles.amount}><span>Importe al confirmar</span>
            {overview.confirmedTotalMinor === null ? <p className={styles.unavailable}>No hay un importe de confirmación disponible para esta reserva. Consulta tu comprobante o contacta con Recepción.</p> : <>
              <strong>{displayMoney(overview.confirmedTotalMinor / 100, overview.currency, currency)}</strong>
              {['GTQ', 'USD'].includes(overview.currency) && <button className={styles.currency} type="button" onClick={() => setCurrency(value => value === 'GTQ' ? 'USD' : 'GTQ')}>Ver en {currency === 'GTQ' ? 'dólares (US$)' : 'quetzales (Q)'}</button>}
              <small>Importe original: {displayMoney(overview.confirmedTotalMinor / 100, overview.currency, overview.currency === 'USD' ? 'USD' : 'GTQ')}. La conversión es de referencia.</small>
            </>}
          </div>
          <p className={styles.note}>El importe corresponde a la confirmación original. Los cambios o servicios posteriores pueden afectar el saldo actual; puedes consultarlo con Recepción.</p>
          <button className={styles.print} type="button" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        </section>
        <section className={styles.account}><h2>Tu historial, siempre a mano</h2><p>{authenticated ? "Puedes consultar tus otras reservas y actualizar tus preferencias desde tu cuenta." : "Crea una cuenta o inicia sesión para consultar todas tus reservas vinculadas."}</p><Link href={authenticated ? "/cuenta" : "/acceso?returnTo=%2Fmis-reservas"}>Ir a mi cuenta</Link></section>
      </aside>
    </div>
  </section>;
}

'use client';

import Link from 'next/link';
import { displayMoney, PublicCurrencySelector, publicResultsHref, usePublicDisplayCurrency, type BookingSearchCriteria } from '@/modules/booking';
import { EmptyState } from '@/shared/components';
import { useCheckoutConfirmation } from './checkout-draft-provider';
import styles from './public-payment-review-page.module.css';
import confirmationStyles from './public-booking-confirmation-page.module.css';

export function PublicBookingConfirmationPage({ initialCriteria: criteria }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  const { confirmation, guest } = useCheckoutConfirmation(criteria);
  const currency = usePublicDisplayCurrency();
  const money = (minor: number) => displayMoney(minor / 100, confirmation!.currency, currency);
  return <div className={styles.page}>
    <div className={styles.topBar}><Link className={styles.back} href="/">← Volver al inicio</Link><PublicCurrencySelector id="confirmation-display-currency" /></div>
    {!confirmation ? <><EmptyState title="No hay una confirmación en esta sesión" description="Completa el checkout para ver el resultado. Recargar descarta los datos de esta demostración; esta pantalla no confirma una reserva por sí sola."/><Link className={styles.back} href={publicResultsHref(criteria)}>Explorar habitaciones →</Link></> : <>
      <header className={confirmationStyles.header}><span className={confirmationStyles.check} aria-hidden="true">✓</span><p className={styles.eyebrow}>DEMOSTRACIÓN COMPLETADA</p><h1>Confirmación de reserva</h1><p>Gracias, {guest.firstName}. Tu recorrido de reserva como invitado se completó en el simulador.</p></header>
      <p className={styles.demo}>Esta referencia es ficticia. No se creó una reserva en el hotel, no se realizó un cobro ni se envió un correo.</p>
      <div className={styles.layout}><section className={styles.card} aria-labelledby="confirmation-title"><p className={styles.eyebrow}>REFERENCIA DE DEMOSTRACIÓN</p><h2 id="confirmation-title" className={confirmationStyles.reference}>{confirmation.reservationId}</h2><span className={styles.accountBadge}>✓ Confirmación simulada · {confirmation.stays.length} {confirmation.stays.length === 1 ? 'habitación' : 'habitaciones'}</span>
        <p className={styles.stay}>{confirmation.arrival} → {confirmation.departure}<br/>Responsable: {guest.firstName} {guest.lastName}<br/>Correo de contacto: {guest.email}</p>
        <ul className={confirmationStyles.stays}>{confirmation.stays.map((stay, index) => <li key={stay.id}><span>Habitación {index + 1}</span><strong>{stay.roomName}</strong><small>Estadía: {stay.id}</small></li>)}</ul>
        <div className={confirmationStyles.next}><h3>¿Cómo consultar una reserva después?</h3><p>La reserva como invitado no crea una cuenta. En el servicio real recibirás la referencia por correo y podrás vincularla desde «Mis reservas» con Google y un código temporal.</p><p>El historial actual usa ejemplos de demostración independientes; esta referencia no se agrega automáticamente.</p><Link className={styles.back} href="/mis-reservas">Conocer Mis reservas →</Link></div>
      </section><aside className={styles.summary} aria-labelledby="confirmation-price-title"><h2 id="confirmation-price-title">Resumen de la demostración</h2><dl className={styles.amounts}><div><dt>Total estimado</dt><dd>{money(confirmation.totalMinor)}</dd></div><div className={styles.today}><dt>Garantía simulada</dt><dd>{money(confirmation.guaranteeMinor)}</dd></div><div><dt>Restante en check-in</dt><dd>{money(confirmation.remainingMinor)}</dd></div></dl><p className={styles.note}>{confirmation.guarantee.cardBrand} · •••• {confirmation.guarantee.last4}<br/>Sin débito real. La confirmación se conserva solo mientras esta aplicación siga abierta.</p><Link className={confirmationStyles.home} href="/">Volver al inicio</Link></aside></div>
    </>}
  </div>;
}

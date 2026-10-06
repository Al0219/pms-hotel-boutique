'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { displayMoney, PublicCurrencySelector, publicResultsHref, usePublicDisplayCurrency, useResetPublicBooking, type BookingSearchCriteria } from '@/modules/booking';
import { Button, EmptyState } from '@/shared/components';
import { useCheckoutConfirmation, useCheckoutFailure, useResetCheckout } from './checkout-draft-provider';
import { BookingConfirmationTicket, bookingDateLabel } from './booking-confirmation-ticket';
import { publicPaymentHref, publicCheckoutReviewHref } from '../domain/checkout-navigation';
import styles from './public-booking-confirmation-page.module.css';

/** Editable demonstration contact; never presents a fictional number as a working channel. */
const reception = { phone: '+502 2222 0000', isDemo: true };

export function PublicBookingResultPage({ initialCriteria: criteria, status }: { initialCriteria: Partial<BookingSearchCriteria>; status: 'success' | 'error' }) {
  const success = useCheckoutConfirmation(criteria);
  const failed = useCheckoutFailure(criteria);
  const resetDraft = useResetCheckout();
  const resetCart = useResetPublicBooking();
  const currency = usePublicDisplayCurrency();
  const router = useRouter();
  const [leaving, startNavigation] = useTransition();
  const [showHelp, setShowHelp] = useState(false);
  const confirmation = status === 'success' ? success.confirmation : undefined;
  const failure = status === 'error' ? failed.failure : undefined;
  function finish() { startNavigation(() => { resetCart(); resetDraft(); router.push('/'); }); }
  const valid = confirmation || failure;
  const recoveryHref = failure?.outcomeUnknown ? publicPaymentHref(criteria) : failure?.kind === 'availability' ? publicResultsHref(criteria) : failure?.kind === 'quote' ? publicCheckoutReviewHref(criteria) : publicPaymentHref(criteria);
  const recoveryLabel = failure?.outcomeUnknown ? 'Reintentar verificación con la misma tarjeta' : failure?.kind === 'availability' ? 'Buscar otra habitación' : failure?.kind === 'quote' ? 'Revisar disponibilidad y tarifa' : 'Reintentar pago con otra tarjeta';
  return <div className={styles.page}>
    <div className={styles.topBar}><button type="button" className={styles.back} disabled={leaving} onClick={finish}>← Volver al inicio</button><PublicCurrencySelector id="confirmation-display-currency" /></div>
    {!valid ? <><EmptyState title={status === 'success' ? 'No hay una confirmación en esta sesión' : 'No hay un intento fallido en esta sesión'} description="Completa el checkout para ver el resultado. Recargar descarta los datos de esta demostración; esta pantalla no crea ni confirma una reserva."/><Link className={styles.back} href={publicResultsHref(criteria)}>Explorar habitaciones →</Link></> : <>
      <header className={styles.header}><span className={status === 'success' ? styles.check : styles.warning} aria-hidden="true">{status === 'success' ? '✓' : '!'}</span><p className={styles.eyebrow}>{status === 'success' ? 'DEMOSTRACIÓN COMPLETADA' : 'ESTAMOS AQUÍ PARA AYUDARTE'}</p><h1>{status === 'success' ? 'Tu reserva está confirmada' : 'No pudimos completar tu reserva'}</h1><p>{status === 'success' ? 'Guarda este código para consultar tu próxima estadía.' : 'Ocurrió un inconveniente al procesar la garantía o verificar la disponibilidad.'}</p></header>
      <p className={styles.demo}>Modo demostración · {status === 'success' ? 'Esta referencia es ficticia. No se creó una reserva en el hotel, no se realizó un cobro ni se envió un correo.' : 'No se realiza ningún débito real ni se crea una reserva en el hotel.'}</p>
      {confirmation ? <div className={styles.layout}><BookingConfirmationTicket confirmation={confirmation} guest={success.guest} criteria={criteria} currency={currency}/>
        <aside className={`${styles.card} ${styles.summary}`} aria-labelledby="confirmation-price-title"><h2 id="confirmation-price-title">Resumen de la demostración</h2><dl className={styles.amounts}><div><dt>Total estimado</dt><dd>{displayMoney(confirmation.totalMinor / 100, confirmation.currency, currency)}</dd></div><div className={styles.guarantee}><dt>Garantía simulada</dt><dd>{displayMoney(confirmation.guaranteeMinor / 100, confirmation.currency, currency)}</dd></div><div><dt>Restante en check-in</dt><dd>{displayMoney(confirmation.remainingMinor / 100, confirmation.currency, currency)}</dd></div></dl><p className={styles.paymentMethod}>{confirmation.guarantee.cardBrand} · **** {confirmation.guarantee.last4}</p><p className={styles.note}>Sin débito real. La confirmación se conserva solo mientras esta aplicación siga abierta.</p><Button type="button" className={styles.primary} isLoading={leaving} loadingText="Volviendo al inicio…" onClick={finish}>Volver al inicio</Button></aside>
      </div> : failure && <section className={`${styles.card} ${styles.failureCard}`} aria-labelledby="failure-intent-title">
        <div className={styles.alert} role="alert"><strong>{failure.message}</strong><p>{failure.outcomeUnknown ? 'No cambies la tarjeta ni repitas el intento con otros datos hasta verificar el resultado. Conservamos la misma solicitud para el reintento.' : 'El intento no produjo una confirmación válida. Conservamos tus datos para que puedas continuar.'}</p></div>
        <h2 id="failure-intent-title">Tu intención de reserva</h2><dl className={styles.details}><div><dt>Habitación{failure.roomNames.length > 1 ? 'es' : ''}</dt><dd>{failure.roomNames.join(' · ')}</dd></div><div><dt>Fechas</dt><dd>{bookingDateLabel(criteria.checkIn!)} → {bookingDateLabel(criteria.checkOut!)}</dd></div><div><dt>Huésped</dt><dd>{failed.guest.firstName} {failed.guest.lastName}<small>{failed.guest.email}</small></dd></div></dl>
        <div className={styles.failureActions}><Link className={styles.primary} href={recoveryHref}>{recoveryLabel}</Link>{failure.outcomeUnknown ? <button type="button" className={styles.secondary} disabled>Modificar fechas o habitación</button> : <Link className={styles.secondary} href={publicResultsHref(criteria)}>Modificar fechas o habitación</Link>}</div>
        <button type="button" className={styles.help} aria-expanded={showHelp} onClick={() => setShowHelp(value => !value)}>☎ ¿Necesitas ayuda? Contacta a Recepción al {reception.phone}</button>{reception.isDemo && <p className={styles.note}>Contacto de demostración</p>}{showHelp && <p className={styles.helpMessage}>Este número es de ejemplo; el canal de recepción todavía no está disponible.</p>}
      </section>}
    </>}
  </div>;
}

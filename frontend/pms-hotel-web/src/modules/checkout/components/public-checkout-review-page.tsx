'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { BookingStepper, PublicCurrencySelector, displayMoney, publicGuestDataHref, publicSelectionHref, usePublicBookingReview, usePublicSearchCriteria, usePublicDisplayCurrency, type BookingSearchCriteria } from '@/modules/booking';
import { Button, EmptyState } from '@/shared/components';
import { countries, internationalPhone, validateGuest } from '../domain/guest-details';
import { getPublicEnvironment } from '@/lib/env';
import { accommodationQuote } from '../domain/accommodation-quote';
import { paymentEstimate, quoteFingerprint } from '../domain/payment-estimate';
import { publicPaymentHref } from '../domain/checkout-navigation';
import { useCheckoutDraft } from './checkout-draft-provider';
import { CheckoutAvailabilityGate } from './checkout-availability-gate';
import styles from './public-checkout-review-page.module.css';

const dateLabel = (value: string) => new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));

export function PublicCheckoutReviewPage({ initialCriteria: supplied }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  const criteria = usePublicSearchCriteria(supplied);
  const review = usePublicBookingReview(criteria);
  const draft = useCheckoutDraft(review.scope);
  const preferredCurrency = usePublicDisplayCurrency();
  const mock = getPublicEnvironment().useMockApi;
  const currency = mock ? preferredCurrency : 'GTQ';
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const validGuest = draft.approvedSelection === review.selectionKey && !Object.keys(validateGuest(draft.guest)).length;
  const nights = review.availability.data?.totalNights ?? 0;
  const realQuote = mock ? null : accommodationQuote(review.items);
  const estimate = mock ? paymentEstimate(review.items, nights) : realQuote;
  const roomCount = review.items.reduce((count, item) => count + item.quantity, 0);
  const guests = (criteria.adults ?? 0) + (criteria.children ?? 0);
  const guestHref = publicGuestDataHref(criteria);
  function continueToPayment() {
    if (!review.ready || !validGuest || !estimate || navigating) return;
    // Review acknowledgement only. Payment still revalidates availability before sending.
    draft.reviewQuote(review.selectionKey, quoteFingerprint(review.items, nights));
    startNavigation(() => router.push(publicPaymentHref(criteria)));
  }
  return <div className={styles.page}>
    <div className={styles.topBar}><Link className={styles.back} href={guestHref}>← Volver a datos</Link><PublicCurrencySelector id="final-review-display-currency" quotedCurrency={mock ? undefined : 'GTQ'} /></div>
    <header><p className={styles.eyebrow}>TU ESTANCIA, A TU MEDIDA</p><h1>Revisa y confirma tu reserva</h1><p>Paso 3 de 4 · Verifica todos los datos antes de continuar al pago</p></header>
    <BookingStepper step={3} criteria={criteria} completed={validGuest ? 2 : review.ready && review.prices.allValid ? 1 : 0} />
    <CheckoutAvailabilityGate review={review}>{!validGuest ? <><EmptyState title="Completa tus datos antes de continuar" description="Revisa la información del huésped para esta selección antes de pasar al pago." /><Link className={styles.back} href={guestHref}>Completar mis datos →</Link></> : <div className={styles.layout}>
      <section className={styles.card} aria-label="Datos de tu reserva">
        <section className={styles.block} aria-labelledby="final-review-stay"><div className={styles.blockHeading}><h2 id="final-review-stay">Estadía</h2><Link className={styles.edit} href={publicSelectionHref(criteria)} aria-label="Editar estadía">Editar</Link></div>
          <ul className={styles.rooms}>{review.items.map(item => <li key={item.roomTypeId}><strong>{item.room!.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</strong><span>{item.rate!.name}</span></li>)}</ul>
          <p>{dateLabel(criteria.checkIn!)} <span aria-hidden="true">→</span> {dateLabel(criteria.checkOut!)}</p>
          <p>{nights} {nights === 1 ? 'noche' : 'noches'} · {guests} {guests === 1 ? 'huésped' : 'huéspedes'} · {roomCount} {roomCount === 1 ? 'habitación' : 'habitaciones'}</p>
        </section>
        <section className={styles.block} aria-labelledby="final-review-guest"><div className={styles.blockHeading}><h2 id="final-review-guest">Huésped principal</h2><Link className={styles.edit} href={guestHref} aria-label="Editar huésped principal">Editar</Link></div>
          <p className={styles.name}>{draft.guest.firstName.trim()} {draft.guest.lastName.trim()}</p><p>{draft.guest.email.trim()} · {internationalPhone(draft.guest)}</p><p>{countries.find(country => country.code === draft.guest.country)?.label}</p>
        </section>
        <section className={styles.block} aria-labelledby="final-review-requests"><div className={styles.blockHeading}><h2 id="final-review-requests">Solicitudes especiales</h2><Link className={styles.edit} href={`${guestHref}#guest-specialRequests`} aria-label="Editar solicitudes especiales">Editar</Link></div>
          <p className={styles.requests}>{draft.guest.specialRequests.trim() || 'Sin solicitudes adicionales'}</p>
        </section>

      </section>
      <aside className={styles.summary} aria-labelledby="final-review-total"><h2 id="final-review-total">Total de la reserva</h2>
        <dl className={styles.amounts}>{review.prices.rooms.map(total => <div key={total.currency}><dt>Alojamiento</dt><dd>{displayMoney(total.amount, total.currency, currency)}</dd></div>)}
          {!mock ? realQuote && <div className={styles.total}><dt>Total</dt><dd>{displayMoney(realQuote.totalMinor / 100, realQuote.currency, 'GTQ')}</dd></div> : review.prices.completeEstimate ? <>{review.prices.service.map(total => <div key={total.currency}><dt>Cargo de servicio</dt><dd>{displayMoney(total.amount, total.currency, currency)}</dd></div>)}{review.prices.taxes.map(total => <div key={total.currency}><dt>Impuestos estimados</dt><dd>{displayMoney(total.amount, total.currency, currency)}</dd></div>)}
            {review.prices.estimated.map(total => <div key={total.currency} className={styles.total}><dt>Total estimado</dt><dd>{displayMoney(total.amount, total.currency, currency)}</dd></div>)}</> : <><div><dt>Cargo de servicio</dt><dd>Pendiente</dd></div><div><dt>Impuestos estimados</dt><dd>Pendientes</dd></div><div className={styles.total}><dt>Total estimado</dt><dd>Por confirmar</dd></div></>}
        </dl>
        {mock && <p className={styles.note}>Total estimado para las fechas seleccionadas.</p>}
        {!estimate && <p className={styles.error} role="alert">La cotización está incompleta o mezcla monedas. Revisa tu selección antes de pasar al pago.</p>}
        <Button type="button" className={styles.continue} disabled={!review.ready || !estimate} isLoading={navigating} loadingText="Abriendo pago…" onClick={continueToPayment}>Continuar al pago <span aria-hidden="true">→</span></Button>
        <p className={styles.note}>Puedes reservar como invitado. Continuar no crea una cuenta, no confirma la reserva ni realiza un cobro.</p>
      </aside>
    </div>}</CheckoutAvailabilityGate>
  </div>;
}

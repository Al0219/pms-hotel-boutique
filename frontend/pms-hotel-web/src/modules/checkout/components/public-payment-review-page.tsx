'use client';

import Link from 'next/link';
import { BookingStepper, PublicCurrencySelector, publicGuestDataHref, usePublicBookingReview, type BookingSearchCriteria } from '@/modules/booking';
import { EmptyState } from '@/shared/components';
import { validateGuest, internationalPhone, countries } from '../domain/guest-details';
import { useCheckoutDraft } from './checkout-draft-provider';
import { CheckoutAvailabilityGate } from './checkout-availability-gate';
import { ReservationSummary } from './reservation-summary';
import styles from './public-guest-data-page.module.css';

/** Handoff only. A payment-provider contract is required before collecting or charging. */
export function PublicPaymentReviewPage({ initialCriteria: criteria }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  const review = usePublicBookingReview(criteria);
  const { guest, approvedSelection } = useCheckoutDraft(review.scope);
  const valid = approvedSelection === review.selectionKey && !Object.keys(validateGuest(guest)).length;
  return <div className={styles.page}>
    <div className={styles.topBar}><Link className={styles.back} href={publicGuestDataHref(criteria)}>← Volver a mis datos</Link><PublicCurrencySelector id="payment-display-currency" /></div>
    <header><p className={styles.eyebrow}>TU RESERVA, PASO A PASO</p><h1>Pago y Confirmación</h1><p>Paso 3 de 3 · Revisa tus datos antes de la garantía</p></header><BookingStepper step={3} />
    <CheckoutAvailabilityGate review={review}>{!valid ? <><EmptyState title="Completa tus datos antes de continuar" description="Necesitamos la información válida de la persona responsable para esta selección." /><Link className={styles.back} href={publicGuestDataHref(criteria)}>Completar mis datos →</Link></> :
      <div className={styles.layout}><section className={styles.card} aria-labelledby="payment-contact-title"><h2 id="payment-contact-title">Datos del huésped</h2><dl className={styles.contactReview}><dt>Responsable</dt><dd>{guest.firstName.trim()} {guest.lastName.trim()}</dd><dt>Correo electrónico</dt><dd>{guest.email.trim()}</dd><dt>Teléfono</dt><dd>{internationalPhone(guest)}</dd><dt>País / región</dt><dd>{countries.find(country => country.code === guest.country)?.label}</dd>{guest.specialRequests.trim() && <><dt>Solicitudes especiales</dt><dd>{guest.specialRequests}</dd></>}</dl>
        <Link className={styles.back} href={publicGuestDataHref(criteria)}>Editar mis datos</Link><div className={styles.paymentNotice}><strong>Pago y garantía: próxima entrega</strong><p>Conservamos tu selección y tus datos en esta sesión. Todavía no se creó una reserva ni se realizó un cobro. La confirmación requiere conectar la garantía y validar nuevamente la disponibilidad.</p></div>
      </section><ReservationSummary review={review} criteria={criteria} /></div>}</CheckoutAvailabilityGate>
  </div>;
}

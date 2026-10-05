'use client';

import Link from 'next/link';
import { BookingStepper, PublicCurrencySelector, publicResultsHref, publicSelectionHref, usePublicBookingReview, type BookingSearchCriteria } from '@/modules/booking';
import { CheckoutAvailabilityGate } from './checkout-availability-gate';
import { GuestDetailsForm } from './guest-details-form';
import { ReservationSummary } from './reservation-summary';
import styles from './public-guest-data-page.module.css';

export function PublicGuestDataPage({ initialCriteria: criteria }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  const review = usePublicBookingReview(criteria);
  return <div className={styles.page}>
    <div className={styles.topBar}><Link className={styles.back} href={publicSelectionHref(criteria)}>← Volver a mi selección</Link><PublicCurrencySelector id="guest-display-currency" /></div>
    <header><p className={styles.eyebrow}>HOSPITALIDAD DESDE EL PRIMER MOMENTO</p><h1>Datos del huésped</h1><p>Paso 2 de 3 · Completa la información de la persona responsable de la reserva</p></header>
    <BookingStepper step={2} />
    <CheckoutAvailabilityGate review={review}><div className={styles.layout}><GuestDetailsForm key={review.scope} review={review} criteria={criteria} /><ReservationSummary review={review} criteria={criteria} /></div></CheckoutAvailabilityGate>
    <Link className={styles.catalogue} href={publicResultsHref(criteria)}>Volver al catálogo</Link>
  </div>;
}

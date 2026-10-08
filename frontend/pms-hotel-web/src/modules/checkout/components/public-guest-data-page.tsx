'use client';

import Link from 'next/link';
import { getPublicEnvironment } from '@/lib/env';
import { BookingStepper, PublicCurrencySelector, publicSelectionHref, usePublicBookingReview, usePublicSearchCriteria, type BookingSearchCriteria } from '@/modules/booking';
import { CheckoutAvailabilityGate } from './checkout-availability-gate';
import { GuestDetailsForm } from './guest-details-form';
import { ReservationSummary } from './reservation-summary';
import styles from './public-guest-data-page.module.css';

export function PublicGuestDataPage({ initialCriteria: supplied }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  const criteria = usePublicSearchCriteria(supplied);
  const review = usePublicBookingReview(criteria);
  return <div className={styles.page}>
    <div className={styles.topBar}><Link className={styles.back} href={publicSelectionHref(criteria)}>← Volver al carrito</Link><PublicCurrencySelector id="guest-display-currency" quotedCurrency={getPublicEnvironment().useMockApi ? undefined : 'GTQ'} /></div>
    <header><p className={styles.eyebrow}>HOSPITALIDAD DESDE EL PRIMER MOMENTO</p><h1>Datos del huésped</h1><p>Paso 2 de 4 · Completa la información de la persona responsable de la reserva</p></header>
    <BookingStepper step={2} criteria={criteria} completed={review.ready && review.prices.allValid ? 1 : 0} />
    <CheckoutAvailabilityGate review={review}><div className={styles.layout}><GuestDetailsForm key={review.scope} review={review} criteria={criteria} /><ReservationSummary review={review} criteria={criteria} /></div></CheckoutAvailabilityGate>
  </div>;
}

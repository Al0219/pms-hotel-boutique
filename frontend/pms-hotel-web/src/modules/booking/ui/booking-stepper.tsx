import Link from 'next/link';
import { publicGuestDataHref, publicSelectionHref } from '../domain/public-room-navigation';
import type { BookingSearchCriteria } from '../domain/booking-search-criteria';
import styles from './public-booking-review.module.css';

export function BookingStepper({ step, criteria, completed = 0 }: { step: 1 | 2 | 3 | 4; criteria?: Partial<BookingSearchCriteria>; completed?: number }) {
  const hrefs = criteria ? [publicSelectionHref(criteria), publicGuestDataHref(criteria), `${publicGuestDataHref(criteria).replace('/checkout', '/checkout/revision')}`] : [];
  return <nav aria-label="Pasos de la reserva"><ol className={styles.stepper}>
    {['Revisa tu selección', 'Datos del huésped', 'Revisa y confirma', 'Pago y garantía'].map((label, index) => <li key={label}
      aria-current={index + 1 === step ? 'step' : undefined} className={index + 1 <= step ? styles.activeStep : undefined}>
      <span>{index + 1 < step && index < completed ? '✓' : index + 1}</span>{index + 1 < step && index < completed && hrefs[index] ? <Link href={hrefs[index]}>{label}</Link> : <strong>{label}</strong>}
    </li>)}
  </ol></nav>;
}

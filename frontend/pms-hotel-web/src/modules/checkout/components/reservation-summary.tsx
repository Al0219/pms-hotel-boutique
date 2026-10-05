'use client';

import { displayMoney, usePublicDisplayCurrency, type BookingSearchCriteria } from '@/modules/booking';
import type { BookingReview } from './checkout-availability-gate';
import styles from './public-guest-data-page.module.css';

export function ReservationSummary({ review, criteria }: { review: BookingReview; criteria: Partial<BookingSearchCriteria> }) {
  const currency = usePublicDisplayCurrency();
  const dateLabel = (value: string) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  const nights = review.availability.data?.totalNights ?? 0;
  return <aside className={styles.summary} aria-labelledby="reservation-summary-title"><p className={styles.eyebrow}>TU PRÓXIMA ESTANCIA</p>
    <h2 id="reservation-summary-title">Resumen de reserva</h2>
    <ul className={styles.rooms}>{review.items.map(item => <li key={item.roomTypeId}><strong>{item.room?.name}</strong>{item.quantity > 1 && <span> × {item.quantity}</span>}<small>{item.rate?.name}</small></li>)}</ul>
    <p className={styles.stayDates}>{dateLabel(criteria.checkIn!)}<span aria-hidden="true"> → </span>{dateLabel(criteria.checkOut!)}</p>
    <p className={styles.small}>{nights} {nights === 1 ? 'noche' : 'noches'} · {(criteria.adults ?? 0) + (criteria.children ?? 0)} huéspedes</p>
    <div className={styles.total}><span>Total estimado</span>{review.prices.completeEstimate ? review.prices.estimated.map(total => <strong key={total.currency}>{displayMoney(total.amount, total.currency, currency)}</strong>) : <strong>Por confirmar</strong>}</div>
    {!review.prices.completeEstimate && <p className={styles.small}>Impuestos y cargos pendientes de cotización.</p>}
    <div className={styles.secure}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>
      {typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'Conexión cifrada' : 'Datos solo en esta sesión'}</div>
    <p className={styles.small}>La disponibilidad se verificará nuevamente antes de confirmar. Tu selección no retiene inventario.</p>
  </aside>;
}

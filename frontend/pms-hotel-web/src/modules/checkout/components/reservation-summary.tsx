'use client';

import { displayMoney, usePublicDisplayCurrency, type BookingSearchCriteria } from '@/modules/booking';
import { getPublicEnvironment } from '@/lib/env';
import { accommodationQuote } from '../domain/accommodation-quote';
import type { BookingReview } from './checkout-availability-gate';
import styles from './public-guest-data-page.module.css';

export function ReservationSummary({ review, criteria }: { review: BookingReview; criteria: Partial<BookingSearchCriteria> }) {
  const preferredCurrency = usePublicDisplayCurrency();
  const mock = getPublicEnvironment().useMockApi;
  const currency = mock ? preferredCurrency : 'GTQ';
  const quote = mock ? null : accommodationQuote(review.items);
  const dateLabel = (value: string) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  const nights = review.availability.data?.totalNights ?? 0;
  return <aside className={styles.summary} aria-labelledby="reservation-summary-title"><p className={styles.eyebrow}>TU PRÓXIMA ESTANCIA</p>
    <h2 id="reservation-summary-title">Resumen de reserva</h2>
    <ul className={styles.rooms}>{review.items.map(item => <li key={item.roomTypeId}><strong>{item.room?.name}</strong>{item.quantity > 1 && <span> × {item.quantity}</span>}<small>{item.rate?.name}</small></li>)}</ul>
    <p className={styles.stayDates}>{dateLabel(criteria.checkIn!)}<span aria-hidden="true"> → </span>{dateLabel(criteria.checkOut!)}</p>
    <p className={styles.small}>{nights} {nights === 1 ? 'noche' : 'noches'} · {(criteria.adults ?? 0) + (criteria.children ?? 0)} huéspedes</p>
    <div className={styles.total}><span>{mock ? 'Total estimado' : 'Total'}</span>{!mock ? quote ? <strong>{displayMoney(quote.totalMinor / 100, quote.currency, 'GTQ')}</strong> : <strong>Revisa tu selección</strong> : review.prices.completeEstimate ? review.prices.estimated.map(total => <strong key={total.currency}>{displayMoney(total.amount, total.currency, currency)}</strong>) : <strong>Por confirmar</strong>}</div>
    {mock && !review.prices.completeEstimate && <p className={styles.small}>Impuestos y cargos pendientes de cotización.</p>}
  </aside>;
}

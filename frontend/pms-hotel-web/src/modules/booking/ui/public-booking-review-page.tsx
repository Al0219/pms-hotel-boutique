'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button, EmptyState, ErrorState, LoadingState } from '@/shared/components';
import { getPublicEnvironment } from '@/lib/env';
import type { BookingSearchCriteria } from '../domain/booking-search-criteria';
import { publicResultsHref, publicGuestDataHref } from '../domain/public-room-navigation';
import { displayMoney } from '../domain/display-currency';
import { usePublicBookingSession } from '../components/public-booking-provider';
import { usePublicBookingReview } from '../hooks/use-public-booking-review';
import { BookingStepper } from './booking-stepper';
import { BookingIcon } from './booking-icon';
import { CatalogueRoomImage } from './catalogue-room-card';
import { PublicCurrencySelector } from './public-currency-selector';
import styles from './public-booking-review.module.css';

const dateLabel = (value: string) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));

export function PublicBookingReviewPage({ initialCriteria: criteria }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const { hydrated, validCriteria, availability, items, prices, ready, setSelection } = usePublicBookingReview(criteria);
  const { currency } = usePublicBookingSession();
  const nights = availability.data?.totalNights ?? 0;
  return <div className={styles.page}>
    <div className={styles.topBar}><Link href={publicResultsHref(criteria)}>← Volver a resultados</Link><PublicCurrencySelector id="review-display-currency" /></div>
    <header className={styles.heading}><p className={styles.eyebrow}>TU PRÓXIMA ESTANCIA</p><h1>Revisa tu selección</h1><p>Paso 1 de 3 · Habitación seleccionada</p></header>
    <BookingStepper step={1} />
    {!hydrated ? <LoadingState message="Preparando tu selección…" /> : !validCriteria ?
      <EmptyState title="Completa tu búsqueda" description="Necesitamos fechas y huéspedes válidos para revisar la selección." /> :
      availability.fetchStatus === 'paused' ? <ErrorState title="Sin conexión" message="Conservamos tu selección. Recupera la conexión para consultar disponibilidad y tarifas." onRetry={() => { void availability.refetch(); }} /> :
      availability.isFetching ? <LoadingState message="Verificando disponibilidad y tarifas…" /> :
      availability.isError ? <ErrorState title="No pudimos verificar tu selección" message="No se confirmó ninguna reserva. Reintenta o vuelve al catálogo." onRetry={() => { void availability.refetch(); }} /> :
      ready && (items.length === 0 ? <EmptyState title="Tu selección está vacía" description="Vuelve al catálogo para elegir una habitación. Conservamos las fechas y los huéspedes de tu búsqueda." /> : <>
        {getPublicEnvironment().useMockApi && <p className={styles.demo}>Demostración: habitaciones, condiciones y precios de ejemplo. No se confirma ninguna reserva.</p>}
        <div className={styles.layout}><div className={styles.roomList}>
          {items.map(item => <article className={styles.roomCard} key={item.roomTypeId} aria-label={item.room?.name ?? 'Habitación no disponible'}>
            {item.room && <div className={styles.photo}><CatalogueRoomImage room={item.room} /></div>}
            <div className={styles.roomInfo}><div className={styles.roomHeading}><h2>{item.room?.name ?? 'Habitación no disponible'}</h2><span className={styles.quantity}>{item.quantity} {item.quantity === 1 ? 'habitación' : 'habitaciones'}</span></div>
              {item.room && <p className={styles.small}>{item.room.maxOccupancy} huéspedes{item.room.bedDescription && ` · Cama ${item.room.bedDescription}`}{item.room.areaSquareMeters && ` · ${item.room.areaSquareMeters} m²`}</p>}
              <p className={styles.dates}><BookingIcon name="calendar" />{dateLabel(criteria.checkIn!)} → {dateLabel(criteria.checkOut!)} · {nights} {nights === 1 ? 'noche' : 'noches'}</p>
              <p className={styles.small}>{item.rate?.name ?? 'Tarifa no disponible'} · {criteria.adults! + criteria.children!} huéspedes en la búsqueda</p>
              <div className={styles.amenities}>{[...new Set([...(item.room?.amenities?.slice(0, 3) ?? []), ...(item.rate?.mealsIncluded ? [item.rate.mealsIncluded] : [])])].map(value => <span key={value}>{value}</span>)}</div>
              {item.rate && <p className={styles.policy}>{item.rate.cancellationPolicy}</p>}
              {!item.valid && <p role="alert" className={styles.warning}>La habitación, tarifa o cantidad elegida ya no está disponible. Cambia o retira esta selección.</p>}
              <div className={styles.roomActions}><Link href={publicResultsHref(criteria)}>Cambiar habitación <BookingIcon name="arrow" /></Link>
                <button type="button" onClick={() => setSelection(previous => previous.filter(value => value.roomTypeId !== item.roomTypeId))}>Quitar {item.room?.name ?? 'habitación'}</button></div>
            </div>
          </article>)}
        </div><aside className={styles.priceCard} aria-labelledby="review-price-title"><h2 id="review-price-title">Resumen de precio</h2>
          <p className={styles.small}>{items.reduce((sum, item) => sum + item.quantity, 0)} {items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? 'habitación' : 'habitaciones'} · {nights} {nights === 1 ? 'noche' : 'noches'}</p>
          <dl className={styles.priceLines}>
            {items.filter(item => item.valid && item.rate).map(item => <div key={item.roomTypeId}><dt><span>{item.room!.name}{item.quantity > 1 && ` × ${item.quantity}`}</span>
              {Math.round(item.rate!.baseNightlyRate * nights * 100) === Math.round(item.rate!.totalAmount * 100) ?
                <>{displayMoney(item.rate!.baseNightlyRate, item.rate!.currency, currency)} × {nights} {nights === 1 ? 'noche' : 'noches'}</> : <>Cotización para {nights} {nights === 1 ? 'noche' : 'noches'}</>}
            </dt><dd>{displayMoney(item.rate!.totalAmount * item.quantity, item.rate!.currency, currency)}</dd></div>)}
            {prices.completeEstimate ? <>{prices.service.map(total => <div key={total.currency}><dt>Cargo de servicio</dt><dd>{displayMoney(total.amount, total.currency, currency)}</dd></div>)}
              {prices.taxes.map(total => <div key={total.currency}><dt>Impuestos estimados</dt><dd>{displayMoney(total.amount, total.currency, currency)}</dd></div>)}
              {prices.estimated.map(total => <div key={total.currency} className={styles.total}><dt>Total estimado</dt><dd>{displayMoney(total.amount, total.currency, currency)}</dd></div>)}</> :
              <><div><dt>Cargo de servicio</dt><dd>Pendiente</dd></div><div><dt>Impuestos estimados</dt><dd>Pendientes</dd></div><div className={styles.total}><dt>Total estimado</dt><dd>Por confirmar</dd></div></>}
          </dl>
          {!prices.allValid && <p className={styles.warning}>Revisa las selecciones no disponibles antes de continuar. Los subtotales las excluyen.</p>}
          <Button className={styles.continue} isLoading={navigating} loadingText="Abriendo tus datos…" disabled={!ready || !prices.allValid} onClick={() => startNavigation(() => router.push(publicGuestDataHref(criteria)))}>Continuar con mis datos <BookingIcon name="arrow" /></Button>
          <p className={styles.small}>Los importes son estimados. Tu selección no retiene inventario.</p>
          {criteria.promoCode?.trim() && <p className={styles.small}>Código {criteria.promoCode}: pendiente de validación; no se aplicó un descuento.</p>}
        </aside></div>
        <div className={styles.availabilityNote}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z" /><path d="m8 12 3 3 5-6" /></svg><p>La disponibilidad se verificará nuevamente antes de confirmar la reserva.</p></div>
      </>)}
  </div>;
}

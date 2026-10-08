'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import { usePublicAvailability } from '@/modules/availability';
import { Button, EmptyState, ErrorState, LoadingState } from '@/shared/components';
import { getPublicEnvironment } from '@/lib/env';
import { validateBookingSearchCriteria, type BookingSearchCriteria } from '../domain/booking-search-criteria';
import { publicResultsHref, publicRoomHref, publicSelectionHref } from '../domain/public-room-navigation';
import { displayMoney } from '../domain/display-currency';
import { roomSelection } from '../domain/room-catalogue';
import { usePublicBookingSession, usePublicRoomSelection, usePublicSearchCriteria, useRememberPublicSearch } from '../components/public-booking-provider';
import { PublicSearchEditor } from './public-search-editor';
import { PublicCurrencySelector } from './public-currency-selector';
import { usePublicSearchChange } from '../hooks/use-public-search-change';
import { RoomPhotoCarousel } from './room-photo-carousel';
import { BookingIcon } from './booking-icon';
import { publicAvailabilityError } from './public-availability-error';
import styles from './public-room-detail.module.css';

const subscribe = () => () => {};
const dateLabel = (date: string) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

export function PublicRoomDetailPage(props: { roomTypeId: string; initialCriteria: Partial<BookingSearchCriteria>; initialRatePlanId?: string }) {
  const criteria = usePublicSearchCriteria(props.initialCriteria);
  return <RoomDetail key={`${props.roomTypeId}:${JSON.stringify(criteria)}:${props.initialRatePlanId ?? ''}`} {...props} initialCriteria={criteria} />;
}

function RoomDetail({ roomTypeId, initialCriteria, initialRatePlanId }: { roomTypeId: string; initialCriteria: Partial<BookingSearchCriteria>; initialRatePlanId?: string }) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [criteria, setCriteria] = useState(initialCriteria);
  const rateId = initialRatePlanId ?? '';
  const searchChange = usePublicSearchChange();
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState('');
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const valid = hydrated && Object.keys(validateBookingSearchCriteria(criteria)).length === 0;
  const { currency: preferredCurrency } = usePublicBookingSession();
  const mock = getPublicEnvironment().useMockApi;
  const currency = mock ? preferredCurrency : 'GTQ';
  const query = usePublicAvailability(valid ? { checkInDate: criteria.checkIn!, checkOutDate: criteria.checkOut!, adults: criteria.adults!, children: criteria.children!, roomsCount: criteria.roomsCount! } : undefined);
  useRememberPublicSearch(criteria, query.isSuccess && !query.isFetching ? query.data?.propertyId : undefined);
  const { selection, setSelection } = usePublicRoomSelection(criteria, query.data?.propertyId);
  const room = query.data?.roomTypes.find(value => value.roomTypeId === roomTypeId);
  const selected = selection.find(item => item.roomTypeId === roomTypeId);
  const preferredRateId = rateId || selected?.ratePlanId;
  const rate = preferredRateId ? room?.ratePlans.find(value => value.ratePlanId === preferredRateId) : room?.ratePlans[0];
  const nights = query.data?.totalNights ?? 0;
  const ready = valid && query.isSuccess && !query.isFetching && query.fetchStatus !== 'paused';
  const sameRateSelected = selected?.ratePlanId === rate?.ratePlanId;
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const money = (amount: number) => displayMoney(amount, rate!.currency, currency);

  return <div className={styles.page}>
    <div>
      <div className={styles.topBar}><Link className={styles.back} href={publicResultsHref(criteria)}>← Volver a resultados</Link>
        <PublicCurrencySelector id="detail-display-currency" quotedCurrency={mock ? undefined : 'GTQ'} /></div>
      {!hydrated ? <LoadingState message="Preparando tu estancia…" /> : <>
        {(!valid || editing) && <div className={styles.searchEditor}><PublicSearchEditor visible key={JSON.stringify(criteria)} initialCriteria={criteria} onSearchSubmitted={async value => {
          if (!await searchChange.change(value)) return;
          window.history.replaceState(null, '', publicRoomHref(roomTypeId, value, rateId || undefined));
          setCriteria(value); setEditing(false);
        }} /></div>}
        {searchChange.error && <p role="alert">{searchChange.error}</p>}
        {searchChange.notice && <p role="status">{searchChange.notice}</p>}
        {!valid ? <EmptyState title="Indica las fechas de tu estancia" description="Completa fechas y huéspedes para consultar este tipo de habitación." /> :
          query.fetchStatus === 'paused' ? <ErrorState title="Sin conexión" message="Conservamos tu búsqueda. Volveremos a consultar al recuperar la conexión." onRetry={() => { void query.refetch(); }} /> :
          query.isFetching ? <LoadingState message="Consultando habitación y tarifas…" /> :
          query.isError ? <ErrorState {...(mock ? { title: 'No pudimos consultar esta habitación', message: 'Tu búsqueda se conserva. Vuelve a intentarlo.' } : publicAvailabilityError(query.error))} onRetry={() => { void query.refetch(); }} /> :
          ready && (!room || room.availableRoomsCount <= 0 || !room.ratePlans.length ? <EmptyState title="Habitación no disponible" description="No encontramos este tipo de habitación para tu búsqueda. Vuelve a resultados o prueba otras fechas." /> : <>
            <header className={styles.title}><p className={styles.eyebrow}>TU REFUGIO EN HOTEL BOUTIQUE</p><h1>{room.name}</h1>
              <p>{room.maxOccupancy === null ? 'Capacidad por confirmar' : `${room.maxOccupancy} huéspedes`}{room.bedDescription && ` · Cama ${room.bedDescription}`}{room.areaSquareMeters && ` · ${room.areaSquareMeters} m²`}{room.viewDescription && ` · ${room.viewDescription}`}</p>
            </header>
            <div className={styles.layout}>
              <div className={styles.information}>
                <RoomPhotoCarousel key={room.roomTypeId} images={room.images} name={room.name} />
                <section className={styles.description} aria-labelledby="room-details-title"><p className={styles.eyebrow}>COMODIDAD EN CADA DETALLE</p>
                  <h2 id="room-details-title">Detalles que hacen diferente tu estancia</h2><p>{room.description ?? 'Consulta al hotel los detalles de este tipo de habitación.'}</p>
                  <h3>Amenidades incluidas</h3><ul className={styles.amenities}>{[...new Set([...(room.amenities ?? []), ...(rate?.mealsIncluded ? [rate.mealsIncluded] : [])])].map(amenity =>
                    <li key={amenity}><BookingIcon name="check" /><span>{amenity}</span></li>)}</ul>
                  {!room.amenities?.length && !rate?.mealsIncluded && <p className={styles.small}>Las amenidades aún no están informadas para esta opción.</p>}
                </section>
                {rate && <section className={styles.policy} aria-labelledby="cancellation-title"><h2 id="cancellation-title">Política de cancelación</h2>
                  {mock && <p className={styles.small}>Condiciones de {rate.name}</p>}
                  {rate.cancellationTerms ? <ul>{rate.cancellationTerms.map((term, index) => <li key={index}><span>{term.windowLabel}</span>
                    <span className={styles[term.severity]}>{term.penaltyPercent === 0 ? 'Sin cargo' : term.penaltyPercent === 100 ? 'Total de la reserva' : `${term.penaltyPercent}% del total`}</span></li>)}</ul> : <p>{rate.cancellationPolicy ?? 'Consulta al hotel las condiciones de cancelación.'}</p>}
                  {mock && <p className={styles.small}>Los cargos se calculan sobre el precio total de la reserva, impuestos incluidos. La política aplica a la hora local del hotel.</p>}
                </section>}
              </div>
              <aside className={styles.stayCard} aria-labelledby="stay-title"><div className={styles.stayHeading}><h2 id="stay-title">Tu estadía</h2>
                </div>
                <div className={styles.staySummary}><BookingIcon name="calendar" /><div><strong>{dateLabel(criteria.checkIn!)} → {dateLabel(criteria.checkOut!)}</strong>
                  <span>{nights} {nights === 1 ? 'noche' : 'noches'} · {criteria.adults! + criteria.children!} huéspedes</span></div></div>
                <button className={styles.modify} type="button" onClick={() => setEditing(true)}>Modificar fechas y huéspedes</button>
                {!rate ? <p role="alert">La tarifa seleccionada ya no está disponible. Vuelve a resultados para consultar las opciones vigentes.</p> : <>
                  {rate.totalMinor !== undefined ? <dl className={styles.priceLines}>
                    <div><dt>Por noche</dt><dd>{money(rate.baseNightlyRate)}</dd></div>
                    <div className={styles.total}><dt>Total de habitación · {nights} noches</dt><dd>{money(rate.totalAmount)}</dd></div>
                  </dl> : <dl className={styles.priceLines}><div><dt>{money(rate.baseNightlyRate)} × {nights} {nights === 1 ? 'noche' : 'noches'}</dt><dd>{money(rate.totalAmount)}</dd></div>
                    {Math.round(rate.baseNightlyRate * nights * 100) !== Math.round(rate.totalAmount * 100) && <div><dt>Precio ajustado para estas fechas</dt><dd>Incluido en la cotización</dd></div>}
                    <div><dt>Cargo de servicio</dt><dd>{rate.priceBreakdown ? money(rate.priceBreakdown.serviceCharge) : 'Pendiente'}</dd></div>
                    <div><dt>Impuestos estimados</dt><dd>{rate.priceBreakdown ? money(rate.priceBreakdown.estimatedTaxes) : 'Pendientes'}</dd></div>
                    <div className={styles.total}><dt>Total estimado</dt><dd>{rate.priceBreakdown ? money(rate.priceBreakdown.estimatedTotal) : 'Por confirmar'}</dd></div>
                  </dl>}
                  <Button className={styles.selectRoom} disabled={!ready} isLoading={navigating} loadingText="Abriendo tu selección…" aria-pressed={sameRateSelected} onClick={() => {
                    setSelection(items => items.some(item => item.roomTypeId === roomTypeId) ? items.map(item => item.roomTypeId === roomTypeId ? roomSelection(room, rate, item.quantity) : item) : [...items, roomSelection(room, rate)]);
                    setToast(`${room.name} ${selected ? 'actualizada' : 'agregada'} a tu selección.`);
                    startNavigation(() => router.push(publicSelectionHref(criteria)));
                  }}>{sameRateSelected ? <><BookingIcon name="check" />Revisar mi selección</> : selected ? 'Actualizar selección' : 'Seleccionar habitación'}</Button>
                  <p className={styles.small}>Precio por habitación para tu estancia. {currency === 'GTQ' && rate.currency === 'USD' ? 'Conversión indicativa a quetzales. ' : ''}</p>
                  {criteria.promoCode?.trim() && <p className={styles.small}>El código {criteria.promoCode} aún debe validarse; no se aplicó un descuento.</p>}
                </>}
              </aside>
            </div>
          </>)}
      </>}
    </div>
    <div className={styles.toast} role="status" aria-live="polite">{toast && <><BookingIcon name="check" /><span>{toast}</span><button type="button" aria-label="Cerrar notificación" onClick={() => setToast('')}>×</button></>}</div>

  </div>;
}

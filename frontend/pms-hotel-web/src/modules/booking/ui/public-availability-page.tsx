"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { usePublicAvailability } from "@/modules/availability";
import { Button, EmptyState, ErrorState, LoadingState } from "@/shared/components";
import { getPublicEnvironment } from "@/lib/env";
import { HttpNetworkError } from "@/lib/http";
import { buildSearchQueryParams, isBookingCalendarDate, validateBookingSearchCriteria, type BookingSearchCriteria } from "../domain/booking-search-criteria";
import { catalogueOptions, clearCatalogueFilters, resolveSelection, type CatalogueSort } from "../domain/room-catalogue";
import { PublicSearchForm } from "./public-search-form";
import { BookingIcon } from "./booking-icon";
import { CatalogueFilterPanel } from "./catalogue-filters";
import { CatalogueRoomCard } from "./catalogue-room-card";
import { CatalogueSelectionDrawer } from "./catalogue-dialogs";
import { usePublicBookingSession, usePublicRoomSelection } from "../components/public-booking-provider";
import { PublicCurrencySelector } from "./public-currency-selector";
import styles from "./public-availability-page.module.css";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const dateLabel = (date?: string) => isBookingCalendarDate(date) ? new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)) : 'Sin fecha';

export function PublicAvailabilityPage({ initialCriteria }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  return <CatalogueSearch key={JSON.stringify(initialCriteria)} initialCriteria={initialCriteria} />;
}

function CatalogueSearch({ initialCriteria }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  const [criteria, setCriteria] = useState(initialCriteria);
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const supplied = Object.values(criteria).some(value => value !== undefined);
  const valid = hydrated && Object.keys(validateBookingSearchCriteria(criteria)).length === 0;
  const [editing, setEditing] = useState(!supplied);
  const [filters, setFilters] = useState(clearCatalogueFilters);
  const [sort, setSort] = useState<CatalogueSort>('recommended');
  const [rates, setRates] = useState<Record<string, string>>({});
  const { currency } = usePublicBookingSession();
  const [dialog, setDialog] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const dialogTrigger = useRef<HTMLElement | null>(null);
  const openDialog = (value: string) => {
    dialogTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDialog(value);
  };
  const closeDialog = useCallback(() => setDialog(null), []);
  const search = valid ? { checkInDate: criteria.checkIn!, checkOutDate: criteria.checkOut!, adults: criteria.adults!, children: criteria.children!, roomsCount: criteria.roomsCount! } : undefined;
  const availability = usePublicAvailability(search);
  const { selection, setSelection } = usePublicRoomSelection(criteria, availability.data?.propertyId);
  const rooms = availability.data?.roomTypes ?? [];
  const selectedRates = { ...Object.fromEntries(selection.map(item => [item.roomTypeId, item.ratePlanId])), ...rates };
  const options = catalogueOptions(rooms, selectedRates, filters, sort);
  const ready = valid && availability.isSuccess && !availability.isFetching && availability.fetchStatus !== 'paused';
  const nights = isBookingCalendarDate(criteria.checkIn) && isBookingCalendarDate(criteria.checkOut) && criteria.checkOut > criteria.checkIn ?
    (Date.parse(`${criteria.checkOut}T00:00:00Z`) - Date.parse(`${criteria.checkIn}T00:00:00Z`)) / 86400000 : 0;
  const guests = `${Number.isSafeInteger(criteria.adults) ? criteria.adults : '—'} ${criteria.adults === 1 ? 'adulto' : 'adultos'}${criteria.children ? ` · ${criteria.children} ${criteria.children === 1 ? 'niño' : 'niños'}` : ''}`;
  const resetFilters = () => setFilters(clearCatalogueFilters());

  return <div className={styles.page}>
    <div inert={dialog === 'cart'}>
      <nav className={styles.breadcrumb} aria-label="Navegación de reserva"><Link href="/">Inicio</Link><span> / Habitaciones</span></nav>
      <section className={styles.searchBar} aria-label="Tu búsqueda">
        <div><BookingIcon name="calendar" /><span><small>Check-in — Check-out</small><strong>{dateLabel(criteria.checkIn)} — {dateLabel(criteria.checkOut)}</strong></span></div>
        <div><BookingIcon name="guests" /><span><small>Huéspedes</small><strong>{guests}</strong></span></div>
        <span className={styles.nights}>{nights} {nights === 1 ? 'noche' : 'noches'}</span>
        <Button variant="secondary" aria-expanded={editing} aria-controls="catalogue-search-editor" onClick={() => setEditing(value => !value)}>Modificar búsqueda</Button>
      </section>
      <div className={styles.currencyBar}><PublicCurrencySelector /></div>
      <div id="catalogue-search-editor" hidden={!editing} className={styles.editor}>
        <PublicSearchForm key={JSON.stringify(criteria)} initialCriteria={criteria} onSearchSubmitted={value => {
          window.history.replaceState(null, '', `/habitaciones?${buildSearchQueryParams(value)}`);
          setCriteria(value); setEditing(false); setSelection([]); setRates({}); closeDialog();
          setNotice(selection.length ? 'Actualizamos la búsqueda. Selecciona habitaciones para las nuevas fechas y ocupación.' : 'Búsqueda actualizada.');
        }} />
      </div>
      <header className={styles.heading}><div><p className={styles.eyebrow}>TU PRÓXIMA ESTANCIA</p><h1>Habitaciones disponibles</h1>
        <p aria-live="polite">{ready ? options.length : '—'} opciones para {dateLabel(criteria.checkIn)} — {dateLabel(criteria.checkOut)} · {guests}</p></div>
        <div className={styles.headingActions}><Button onClick={() => openDialog('cart')}><BookingIcon name="cart" />Mi Selección <span className={styles.count}>({selection.reduce((sum, item) => sum + item.quantity, 0)})</span></Button>
          <label className={styles.sort}>Ordenar por<select value={sort} onChange={event => setSort(event.target.value as CatalogueSort)}>
            <option value="recommended">Recomendados</option><option value="price-asc">Menor a mayor precio</option><option value="price-desc">Mayor a menor precio</option><option value="capacity">Mayor capacidad</option>
          </select></label></div>
      </header>
      {notice && <p role="status" className={styles.small}>{notice}</p>}
      {getPublicEnvironment().useMockApi && <p className={styles.notice}>Demostración: habitaciones y precios de ejemplo. No se realiza ninguna reserva.</p>}
      {criteria.promoCode?.trim() && <p className={styles.small}>Los precios mostrados no incluyen descuentos por el código promocional. Su aplicación debe validarse antes de confirmar.</p>}
      <div className={styles.layout}><CatalogueFilterPanel filters={filters} onChange={setFilters} onClear={resetFilters} />
        <section className={styles.results} aria-label="Resultados de disponibilidad" aria-busy={availability.isFetching}>
          {!hydrated ? <LoadingState message="Preparando búsqueda…" /> : !valid ?
            <EmptyState title={supplied ? "Revisa los criterios de búsqueda" : "Indica las fechas de tu estancia"} description="Modifica la búsqueda para consultar habitaciones y tarifas." /> :
            availability.fetchStatus === 'paused' ? <ErrorState title="Sin conexión" message="Comprueba tu conexión. La búsqueda continuará al recuperarla; conservamos tus criterios." onRetry={() => { void availability.refetch(); }} /> :
            availability.isFetching ? <LoadingState message="Buscando habitaciones…" /> :
            availability.isError ? <ErrorState title={availability.error instanceof HttpNetworkError ? "No pudimos conectar" : "No pudimos consultar disponibilidad"} message="Vuelve a intentarlo. Conservamos tus criterios de búsqueda." onRetry={() => { void availability.refetch(); }} /> : ready &&
            (options.length === 0 ? <EmptyState title="Sin habitaciones disponibles" description="No encontramos habitaciones disponibles para las fechas o filtros seleccionados." actionLabel="Restablecer filtros" onAction={resetFilters} /> :
              <div className={styles.grid}>{options.map(({ room, rate }) => <CatalogueRoomCard key={room.roomTypeId} room={room} rate={rate} nights={nights}
                selected={selection.some(item => item.roomTypeId === room.roomTypeId)} currency={currency}
                detailsHref={`/habitaciones/${encodeURIComponent(room.roomTypeId)}?${buildSearchQueryParams(criteria as BookingSearchCriteria)}&ratePlanId=${encodeURIComponent(rate.ratePlanId)}`}
                onRateChange={ratePlanId => { setRates(value => ({ ...value, [room.roomTypeId]: ratePlanId })); setSelection(value => value.map(item => item.roomTypeId === room.roomTypeId ? { ...item, ratePlanId } : item)); }}
                onSelect={() => setSelection(value => value.some(item => item.roomTypeId === room.roomTypeId) ? value.filter(item => item.roomTypeId !== room.roomTypeId) : [...value, { roomTypeId: room.roomTypeId, ratePlanId: rate.ratePlanId, quantity: 1 }])} />)}</div>)}
        </section>
      </div>
    </div>
    {dialog === 'cart' && <CatalogueSelectionDrawer items={resolveSelection(selection, rooms)} nights={nights} available={ready}
      onClose={closeDialog} returnFocusRef={dialogTrigger} onRemove={id => setSelection(value => value.filter(item => item.roomTypeId !== id))}
      onQuantity={(id, quantity) => setSelection(value => value.map(item => item.roomTypeId === id ? { ...item, quantity } : item))} />}
  </div>;
}

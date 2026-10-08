"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { usePublicAvailability } from "@/modules/availability";
import { Button, EmptyState, ErrorState, LoadingState } from "@/shared/components";
import { getPublicEnvironment } from '@/lib/env';
import { publicAvailabilityError } from './public-availability-error';
import { buildSearchQueryParams, isBookingCalendarDate, validateBookingSearchCriteria, type BookingSearchCriteria } from "../domain/booking-search-criteria";
import { catalogueOptions, clearCatalogueFilters, roomSelection, type CatalogueSort } from "../domain/room-catalogue";
import { PublicSearchEditor } from './public-search-editor';
import { publicResultsHref } from '../domain/public-room-navigation';
import { BookingIcon } from "./booking-icon";
import { CatalogueFilterPanel } from "./catalogue-filters";
import { CatalogueRoomCard } from "./catalogue-room-card";
import { usePublicSearchChange } from '../hooks/use-public-search-change';
import { usePublicBookingSession, usePublicRoomSelection, usePublicSearchCriteria, useRememberPublicSearch } from "../components/public-booking-provider";
import { PublicCurrencySelector } from "./public-currency-selector";
import styles from "./public-availability-page.module.css";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const dateLabel = (date?: string) => isBookingCalendarDate(date) ? new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)) : 'Sin fecha';

export function PublicAvailabilityPage({ initialCriteria: supplied }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  const initialCriteria = usePublicSearchCriteria(supplied);
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
  const { currency: preferredCurrency } = usePublicBookingSession();
  const currency = getPublicEnvironment().useMockApi ? preferredCurrency : 'GTQ';
  const searchChange = usePublicSearchChange();
  const search = valid ? { checkInDate: criteria.checkIn!, checkOutDate: criteria.checkOut!, adults: criteria.adults!, children: criteria.children!, roomsCount: criteria.roomsCount! } : undefined;
  const availability = usePublicAvailability(search);
  useRememberPublicSearch(criteria, availability.isSuccess && !availability.isFetching ? availability.data?.propertyId : undefined);
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
    <div>
      <nav className={styles.breadcrumb} aria-label="Navegación de reserva"><Link href="/">Inicio</Link><span> / Habitaciones</span></nav>
      <header className={styles.heading}><div><p className={styles.eyebrow}>TU PRÓXIMA ESTANCIA</p><h1>{valid ? 'Habitaciones disponibles' : 'Habitaciones'}</h1>
        <p aria-live="polite">{ready ? options.length : '—'} opciones para {dateLabel(criteria.checkIn)} — {dateLabel(criteria.checkOut)} · {guests}</p></div>
        <div className={styles.headingActions}>
          <label className={styles.sort}>Ordenar por<select value={sort} onChange={event => setSort(event.target.value as CatalogueSort)}>
            <option value="recommended">Recomendados</option><option value="name">Nombre / código</option><option value="price-asc">Menor a mayor precio</option><option value="price-desc">Mayor a menor precio</option>{getPublicEnvironment().useMockApi && <option value="capacity">Mayor capacidad</option>}
          </select></label></div>
      </header>
      <section className={styles.searchBar} aria-label="Tu búsqueda">
        <div><BookingIcon name="calendar" /><span><small>Check-in — Check-out</small><strong>{dateLabel(criteria.checkIn)} — {dateLabel(criteria.checkOut)}</strong></span></div>
        <div><BookingIcon name="guests" /><span><small>Huéspedes</small><strong>{guests}</strong></span></div>
        <span className={styles.nights}>{nights} {nights === 1 ? 'noche' : 'noches'}</span>
        <Button variant="secondary" aria-expanded={editing} aria-controls="catalogue-search-editor" onClick={() => setEditing(value => !value)}>Modificar búsqueda</Button>
      </section>
      <div className={styles.currencyBar}><PublicCurrencySelector quotedCurrency={getPublicEnvironment().useMockApi ? undefined : 'GTQ'} /></div>
      <div id="catalogue-search-editor" hidden={!editing} className={styles.editor}>
        <PublicSearchEditor visible={editing} key={JSON.stringify(criteria)} initialCriteria={criteria} variant={supplied ? 'standard' : 'landing'} onSearchSubmitted={async value => {
          if (!await searchChange.change(value)) return;
          window.history.replaceState(null, '', publicResultsHref(value));
          setCriteria(value); setEditing(false); setRates({});
        }} />
      </div>
      {searchChange.error && <p role="alert">{searchChange.error}</p>}
      {searchChange.notice && <p role="status">{searchChange.notice}</p>}
      {criteria.promoCode?.trim() && <p className={styles.small}>Los precios mostrados no incluyen descuentos por el código promocional. Su aplicación debe validarse antes de confirmar.</p>}
      <div className={styles.layout}><CatalogueFilterPanel rooms={rooms} filters={filters} onChange={setFilters} onClear={resetFilters} />
        <section className={styles.results} aria-label="Resultados de disponibilidad" aria-busy={availability.isFetching}>
          {!hydrated ? <LoadingState message="Preparando búsqueda…" /> : !valid ?
            <EmptyState title={supplied ? "Revisa los criterios de búsqueda" : "Indica las fechas de tu estancia"} description="Modifica la búsqueda para consultar habitaciones y tarifas." /> :
            availability.fetchStatus === 'paused' ? <ErrorState title="Sin conexión" message="Comprueba tu conexión. La búsqueda continuará al recuperarla; conservamos tus criterios." onRetry={() => { void availability.refetch(); }} /> :
            availability.isFetching ? <LoadingState message="Buscando habitaciones…" /> :
            availability.isError ? <ErrorState {...publicAvailabilityError(availability.error)} onRetry={() => { void availability.refetch(); }} /> : ready &&
            (options.length === 0 ? <EmptyState title="Sin habitaciones disponibles" description="No encontramos habitaciones disponibles para las fechas o filtros seleccionados." actionLabel="Restablecer filtros" onAction={resetFilters} /> :
              <div className={styles.grid}>{options.map(({ room, rate }) => <CatalogueRoomCard key={room.roomTypeId} room={room} rate={rate} nights={nights}
                selected={selection.some(item => item.roomTypeId === room.roomTypeId)} currency={currency}
                detailsHref={`/habitaciones/${encodeURIComponent(room.roomTypeId)}?${buildSearchQueryParams(criteria as BookingSearchCriteria)}&ratePlanId=${encodeURIComponent(rate.ratePlanId)}`}
                onRateChange={ratePlanId => { setRates(value => ({ ...value, [room.roomTypeId]: ratePlanId })); setSelection(value => value.map(item => item.roomTypeId === room.roomTypeId ? roomSelection(room, room.ratePlans.find(value => value.ratePlanId === ratePlanId)!, item.quantity) : item)); }}
                onSelect={() => setSelection(value => value.some(item => item.roomTypeId === room.roomTypeId) ? value.filter(item => item.roomTypeId !== room.roomTypeId) : [...value, roomSelection(room, rate)])} />)}</div>)}
        </section>
      </div>
    </div>

  </div>;
}

"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePublicAvailability } from "@/modules/availability";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components";
import { getPublicEnvironment } from "@/lib/env";
import { HttpNetworkError } from "@/lib/http";
import { validateBookingSearchCriteria, type BookingSearchCriteria } from "../domain/booking-search-criteria";
import { PublicSearchForm } from "./public-search-form";
import styles from "./public-availability-page.module.css";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function PublicAvailabilityPage({ initialCriteria }: {
  initialCriteria: Partial<BookingSearchCriteria>;
}) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const supplied = Object.values(initialCriteria).some(value => value !== undefined);
  const valid = hydrated && Object.keys(validateBookingSearchCriteria(initialCriteria)).length === 0;
  const search = valid ? {
    checkInDate: initialCriteria.checkIn!, checkOutDate: initialCriteria.checkOut!,
    adults: initialCriteria.adults!, children: initialCriteria.children!, roomsCount: initialCriteria.roomsCount!,
  } : undefined;
  const availability = usePublicAvailability(search);
  const rooms = availability.data?.roomTypes.filter(room => room.availableRoomsCount > 0 && room.ratePlans.length > 0) ?? [];

  return <div className={styles.page}>
    <nav aria-label="Navegación de reserva"><Link href="/">Inicio</Link></nav>
    <h1>Encuentra tu habitación</h1>
    <PublicSearchForm initialCriteria={initialCriteria} />
    <section className={styles.results} aria-labelledby="availability-title" aria-busy={availability.isFetching}>
      <h2 id="availability-title">Disponibilidad para tu estancia</h2>
      {getPublicEnvironment().useMockApi && <p className={styles.notice}>Demostración: habitaciones y precios de ejemplo. No se realiza ninguna reserva.</p>}
      {!hydrated ? <LoadingState message="Preparando búsqueda…" /> : !valid ?
        <EmptyState title={supplied ? "Revisa los criterios de búsqueda" : "Indica las fechas de tu estancia"}
          description="Completa el formulario para consultar habitaciones y tarifas." /> :
        availability.fetchStatus === "paused" ? <ErrorState title="Sin conexión"
          message="Comprueba tu conexión. La búsqueda continuará al recuperarla; conservamos tus criterios."
          onRetry={() => { void availability.refetch(); }} /> :
        availability.isFetching ? <LoadingState message="Buscando habitaciones…" /> :
        availability.isError ? <ErrorState title={availability.error instanceof HttpNetworkError ? "No pudimos conectar" : "No pudimos consultar disponibilidad"}
          message={availability.error instanceof HttpNetworkError ? "Comprueba tu conexión y vuelve a intentarlo. Conservamos tu búsqueda." : "Vuelve a intentarlo en unos momentos. Conservamos tus criterios de búsqueda."}
          onRetry={() => { void availability.refetch(); }} /> : availability.data && <>
          <p>{availability.data.checkInDate} → {availability.data.checkOutDate} · {availability.data.totalNights} noches · {search?.roomsCount} habitaciones solicitadas</p>
          {initialCriteria.promoCode?.trim() && <p className={styles.notice}>Los precios mostrados no incluyen descuentos por el código promocional. Su aplicación debe validarse antes de confirmar.</p>}
          {rooms.length === 0 ? <EmptyState title="Sin habitaciones disponibles" description="Prueba otras fechas o cambia tu búsqueda." /> :
            <div className={styles.grid}>{rooms.map(room => <article key={room.roomTypeId} className={styles.card} aria-label={room.name}>
              <h3>{room.name}</h3>
              {room.description && <p>{room.description}</p>}
              <p>Hasta {room.maxOccupancy} huéspedes por habitación</p>
              <p>{room.availableRoomsCount} habitaciones disponibles para estas fechas</p>
              <details>
                <summary>Ver tarifas y condiciones de {room.name}</summary>
                <ul className={styles.rates}>{room.ratePlans.map(rate => <li key={rate.ratePlanId}>
                  <h4>{rate.name}</h4>
                  {rate.description && <p>{rate.description}</p>}
                  <p><strong>{new Intl.NumberFormat("es", { style: "currency", currency: rate.currency }).format(rate.baseNightlyRate)}</strong> por noche y habitación</p>
                  <p>{new Intl.NumberFormat("es", { style: "currency", currency: rate.currency }).format(rate.totalAmount)} por habitación para la estancia</p>
                  <p>{rate.cancellationPolicy}</p>
                  {rate.mealsIncluded && <p>{rate.mealsIncluded}</p>}
                </li>)}</ul>
              </details>
            </article>)}</div>}
        </>}
    </section>
  </div>;
}

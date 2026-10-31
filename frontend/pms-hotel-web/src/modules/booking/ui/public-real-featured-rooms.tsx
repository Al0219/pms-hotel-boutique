'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePublicAvailability } from '@/modules/availability';
import { EmptyState, LoadingState } from '@/shared/components';
import { validateBookingSearchCriteria, type BookingSearchCriteria } from '../domain/booking-search-criteria';
import { publicRoomHref } from '../domain/public-room-navigation';
import { displayMoney } from '../domain/display-currency';
import { CatalogueRoomImage } from './catalogue-room-card';
import styles from './public-booking-home.module.css';

const fallbackFeaturedRooms = [
  { id: 'rt_deluxe_king', image: 'deluxe-king', name: 'Deluxe King', features: '2 huéspedes · King · 32 m²', price: 145 },
  { id: 'rt_terrace_suite', image: 'terrace-suite', name: 'Suite Terraza', features: '2 huéspedes · King · 48 m²', price: 210 },
  { id: 'rt_double_superior', image: 'double-superior', name: 'Doble Superior', features: '2 huéspedes · Dos camas · 28 m²', price: 125 },
];

export function PublicRealFeaturedRooms({ criteria, onChoose }: { criteria: Partial<BookingSearchCriteria>; onChoose?: (href: string) => Promise<void> }) {
  const valid = Object.keys(validateBookingSearchCriteria(criteria)).length === 0;
  const availability = usePublicAvailability(valid ? { checkInDate: criteria.checkIn!, checkOutDate: criteria.checkOut!, adults: criteria.adults!, children: criteria.children!, roomsCount: criteria.roomsCount! } : undefined);
  if (!valid) return <p>Elige tus fechas y habitaciones para consultar las opciones disponibles.</p>;
  if (availability.isFetching) return <LoadingState message="Buscando habitaciones…" />;
  if (availability.isError) {
    return (
      <div className={styles.fallbackWrapper}>
        <div className={styles.fallbackNotice} role="status">
          <p>
            No pudimos conectar en tiempo real con el servidor. Mostrando habitaciones destacadas de referencia mientras se restablece la conexión.
          </p>
          <button
            type="button"
            className={styles.retryChip}
            onClick={() => { void availability.refetch(); }}
          >
            Reintentar conexión
          </button>
        </div>
        <div className={styles.roomGrid}>
          {fallbackFeaturedRooms.map(room => (
            <article className={styles.roomCard} key={room.name} aria-label={room.name}>
              <div className={styles.roomImage}>
                <Image
                  src={`/images/rooms/demo/${room.image}.webp`}
                  alt={room.name}
                  fill
                  sizes="(max-width: 760px) 100vw, 33vw"
                />
              </div>
              <div className={styles.roomContent}>
                <h3>{room.name}</h3>
                <p className={styles.roomFeatures}>{room.features}</p>
                <p className={styles.roomAmenities}>Wi-Fi · Desayuno · A/C</p>
                <div className={styles.roomBottom}>
                  <p className={styles.price}>
                    <strong>{displayMoney(room.price, 'USD', 'GTQ')}</strong>
                    <span> / noche</span>
                  </p>
                  <Link
                    className={styles.roomLink}
                    href={publicRoomHref(room.id, criteria)}
                    onClick={event => {
                      if (onChoose) {
                        event.preventDefault();
                        void onChoose(publicRoomHref(room.id, criteria));
                      }
                    }}
                  >
                    Ver habitación
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }
  if (!availability.data) return <LoadingState message="Preparando búsqueda…" />;
  if (!availability.data.roomTypes.length) return <EmptyState title="Sin habitaciones disponibles" description="Prueba otras fechas o una cantidad menor de habitaciones." />;
  return <><div className={styles.roomGrid}>{availability.data.roomTypes.map(room => {
    const rate = room.ratePlans[0];
    return <article className={styles.roomCard} key={room.roomTypeId} aria-label={room.name}>
      <div className={styles.roomImage}><CatalogueRoomImage room={room} /></div>
      <div className={styles.roomContent}><h3>{room.name}</h3>{room.description && <p>{room.description}</p>}
        <p>{room.code} · {room.availableRoomsCount} habitaciones disponibles</p>
        <div className={styles.roomBottom}><p className={styles.price}><strong>{displayMoney(rate.nightlyRateMinor! / 100, rate.currency, 'GTQ')}</strong><span> / noche</span></p>
          <Link className={styles.roomLink} href={publicRoomHref(room.roomTypeId, criteria, rate.ratePlanId)} onNavigate={event => {
            if (onChoose) { event.preventDefault(); void onChoose(publicRoomHref(room.roomTypeId, criteria, rate.ratePlanId)); }
          }}>Ver habitación</Link></div>
        <p>Total: {displayMoney(rate.totalMinor! / 100, rate.currency, 'GTQ')}</p>
      </div>
    </article>;
  })}</div></>;
}

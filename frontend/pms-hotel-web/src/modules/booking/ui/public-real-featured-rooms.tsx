'use client';

import Link from 'next/link';
import { usePublicAvailability } from '@/modules/availability';
import { EmptyState, ErrorState, LoadingState } from '@/shared/components';
import { validateBookingSearchCriteria, type BookingSearchCriteria } from '../domain/booking-search-criteria';
import { publicRoomHref } from '../domain/public-room-navigation';
import { displayMoney } from '../domain/display-currency';
import { CatalogueRoomImage } from './catalogue-room-card';
import { publicAvailabilityError } from './public-availability-error';
import styles from './public-booking-home.module.css';

export function PublicRealFeaturedRooms({ criteria, onChoose }: { criteria: Partial<BookingSearchCriteria>; onChoose?: (href: string) => Promise<void> }) {
  const valid = Object.keys(validateBookingSearchCriteria(criteria)).length === 0;
  const availability = usePublicAvailability(valid ? { checkInDate: criteria.checkIn!, checkOutDate: criteria.checkOut!, adults: criteria.adults!, children: criteria.children!, roomsCount: criteria.roomsCount! } : undefined);
  if (!valid) return <p>Elige tus fechas y habitaciones para consultar las opciones disponibles.</p>;
  if (availability.isFetching) return <LoadingState message="Buscando habitaciones…" />;
  if (availability.isError) return <ErrorState {...publicAvailabilityError(availability.error)} onRetry={() => { void availability.refetch(); }} />;
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

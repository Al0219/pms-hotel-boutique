'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { BookingSearchCriteria } from '../domain/booking-search-criteria';
import { PublicSearchForm } from './public-search-form';
import { FloatingBookingSearch } from './floating-booking-search';
import { PublicCurrencySelector } from './public-currency-selector';
import { usePublicBookingSession } from '../components/public-booking-provider';
import { displayMoney } from '../domain/display-currency';
import { publicRoomHref } from '../domain/public-room-navigation';
import styles from './public-booking-home.module.css';

// Editorial examples supplied in the approved design, not inventory or a rate quote.
const featuredRooms = [
  { id: 'rt_deluxe_king', image: 'deluxe-king', name: 'Deluxe King', features: '2 huéspedes · King · 32 m²', price: 145 },
  { id: 'rt_terrace_suite', image: 'terrace-suite', name: 'Suite Terraza', features: '2 huéspedes · King · 48 m²', price: 210 },
  { id: 'rt_double_superior', image: 'double-superior', name: 'Doble Superior', features: '2 huéspedes · Dos camas · 28 m²', price: 125 },
];

export function PublicBookingHome({ initialCriteria }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  const { currency } = usePublicBookingSession();
  const searchRef = useRef<HTMLDivElement | null>(null);
  const [draftCriteria, setDraftCriteria] = useState<Partial<BookingSearchCriteria>>(initialCriteria);
  const [searchPending, setSearchPending] = useState(false);
  return <>
    <section className={styles.hero} aria-labelledby="booking-hero-title">
      <div className={styles.decoration} aria-hidden="true"><span /><span /><span /></div>
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>HOSPITALIDAD · CONFORT · EXPERIENCIA</p>
        <h1 id="booking-hero-title">Encuentra una estadía<br className={styles.desktopBreak} /> hecha para ti</h1>
        <p className={styles.heroDescription}>Consulta disponibilidad, compara habitaciones y reserva de forma simple y segura.</p>
      </div>
    </section>
    <div id="buscar" ref={searchRef} className={styles.search}>
      <PublicSearchForm key={JSON.stringify(initialCriteria)} initialCriteria={initialCriteria} variant="landing"
        onCriteriaChange={setDraftCriteria} onPendingChange={setSearchPending} />
    </div>
    <FloatingBookingSearch searchRef={searchRef} criteria={draftCriteria} pending={searchPending} />
    <section className={styles.featured} aria-labelledby="featured-title">
      <div className={styles.sectionHeading}><h2 id="featured-title">Habitaciones destacadas</h2>
        <p>Opciones diseñadas para distintos tipos de estadía.</p><div className={styles.currencyControl}><PublicCurrencySelector id="home-display-currency" /></div></div>
      <div className={styles.roomGrid}>
        {featuredRooms.map(room => <article className={styles.roomCard} key={room.name} aria-label={room.name}>
          <div className={styles.roomImage}><Image src={`/images/rooms/demo/${room.image}.webp`} alt={`Imagen ilustrativa de ${room.name}`} fill sizes="(max-width: 760px) 100vw, 33vw" /></div>
          <div className={styles.roomContent}>
            <h3>{room.name}</h3><p className={styles.roomFeatures}>{room.features}</p>
            <p className={styles.roomAmenities}>Wi-Fi · Desayuno · A/C</p>
            <div className={styles.roomBottom}><p className={styles.price}><strong>{displayMoney(room.price, 'USD', currency)}</strong><span> / noche</span></p>
              <Link className={styles.roomLink} href={publicRoomHref(room.id, draftCriteria)}>Ver habitación</Link>
            </div>
          </div>
        </article>)}
      </div>
      <p className={styles.referenceNote}>Imágenes ilustrativas y precios de referencia. Consulta la disponibilidad y tarifa para tus fechas.</p>
      <section id="amenidades" className={styles.amenities} aria-labelledby="amenities-title">
        <h3 id="amenities-title">Comodidad en cada detalle</h3>
        <p>Wi-Fi <span aria-hidden="true">·</span> Desayuno <span aria-hidden="true">·</span> Aire acondicionado</p>
      </section>
    </section>
  </>;
}

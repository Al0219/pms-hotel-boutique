'use client';

import { useRef, useState } from 'react';
import { Button, Modal } from '@/shared/components';
import type { BookingSearchCriteria } from '../domain/booking-search-criteria';
import { PublicSearchForm } from './public-search-form';
import { FloatingBookingSearch } from './floating-booking-search';
import styles from './public-booking-home.module.css';

// Editorial examples supplied in the approved design, not inventory or a rate quote.
const featuredRooms = [
  { name: 'Deluxe King', features: '2 huéspedes · King · 32 m²', price: 145 },
  { name: 'Suite Terraza', features: '2 huéspedes · King · 48 m²', price: 210 },
  { name: 'Doble Superior', features: '2 huéspedes · Dos camas · 28 m²', price: 125 },
];

export function PublicBookingHome({ initialCriteria }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  const [selectedRoom, setSelectedRoom] = useState<(typeof featuredRooms)[number] | null>(null);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const [draftCriteria, setDraftCriteria] = useState<Partial<BookingSearchCriteria>>(initialCriteria);
  const [searchPending, setSearchPending] = useState(false);
  const closePreview = () => { setSelectedRoom(null); previewTrigger.current?.focus(); };
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
        <p>Opciones diseñadas para distintos tipos de estadía.</p></div>
      <div className={styles.roomGrid}>
        {featuredRooms.map((room, index) => <article className={styles.roomCard} key={room.name} aria-label={room.name}>
          <div className={`${styles.roomImage} ${styles[`roomImage${index}`] ?? ''}`} role="img" aria-label={`Imagen de referencia de ${room.name}`} />
          <div className={styles.roomContent}>
            <h3>{room.name}</h3><p className={styles.roomFeatures}>{room.features}</p>
            <p className={styles.roomAmenities}>Wi-Fi · Desayuno · A/C</p>
            <div className={styles.roomBottom}><p className={styles.price}><strong>US$ {room.price}</strong><span> / noche</span></p>
              <Button size="sm" onClick={event => { previewTrigger.current = event.currentTarget; setSelectedRoom(room); }}>Ver habitación</Button>
            </div>
          </div>
        </article>)}
      </div>
      <p className={styles.referenceNote}>Habitaciones y precios de referencia. Consulta la disponibilidad y tarifa para tus fechas.</p>
      <section id="amenidades" className={styles.amenities} aria-labelledby="amenities-title">
        <h3 id="amenities-title">Comodidad en cada detalle</h3>
        <p>Wi-Fi <span aria-hidden="true">·</span> Desayuno <span aria-hidden="true">·</span> Aire acondicionado</p>
      </section>
    </section>
    {selectedRoom && <div className={styles.modalLayer}><Modal title={selectedRoom.name} onClose={closePreview}
      footer={<><Button variant="outline" onClick={closePreview}>Cerrar</Button><Button onClick={() => {
        setSelectedRoom(null); document.getElementById('search-check-in')?.focus();
        document.getElementById('buscar')?.scrollIntoView({ behavior: 'instant', block: 'center' });
      }}>Consultar disponibilidad</Button></>}>
      <p>{selectedRoom.features}</p><p>Wi-Fi · Desayuno · A/C</p><p><strong>US$ {selectedRoom.price} / noche</strong></p>
      <p>Presentación de referencia. Consulta tus fechas para conocer las habitaciones disponibles, las tarifas y sus condiciones.</p>
    </Modal></div>}
  </>;
}

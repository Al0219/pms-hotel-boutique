import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/shared/components";
import type { AvailableRoomType, RatePlanOption } from "@/modules/availability";
import { displayMoney, type DisplayCurrency } from "../domain/display-currency";
import { BookingIcon } from "./booking-icon";
import styles from "./public-availability-page.module.css";

export function CatalogueRoomImage({ room }: { room: AvailableRoomType }) {
  const [failed, setFailed] = useState(false);
  const image = room.images[0];
  return <div className={styles.roomImage}>
    {image && !failed ? <Image src={image} alt={room.name} fill unoptimized sizes="(max-width: 800px) 100vw, 40vw" onError={() => setFailed(true)} /> :
      <><div className={styles.imageArt} aria-hidden="true" /><span className={styles.imageCaption}>HOTEL BOUTIQUE · {room.code}</span></>}
    {room.badge && <span className={styles.badge}>{room.badge}</span>}
  </div>;
}

export function CatalogueRoomCard({ room, rate, nights, selected, currency, detailsHref, onRateChange, onSelect }: {
  room: AvailableRoomType; rate: RatePlanOption; nights: number; selected: boolean;
  currency: DisplayCurrency; detailsHref: string;
  onRateChange: (rateId: string) => void; onSelect: () => void;
}) {
  return <article className={styles.card} aria-label={room.name}>
    <CatalogueRoomImage room={room} />
    <div className={styles.cardBody}><h3>{room.name}</h3>
      <p className={styles.features}>{room.maxOccupancy === null ? 'Capacidad por confirmar' : `${room.maxOccupancy} huéspedes`}{room.bedDescription && ` · ${room.bedDescription}`}{room.areaSquareMeters && ` · ${room.areaSquareMeters} m²`}</p>
      <div className={styles.amenities}>{room.amenities?.map(amenity => <span key={amenity}>{amenity}</span>)}{rate.mealsIncluded && <span>{rate.mealsIncluded}</span>}</div>
      <p className={styles.small}>{room.availableRoomsCount} {room.availableRoomsCount === 1 ? 'habitación disponible' : 'habitaciones disponibles'} para estas fechas</p>
      {room.ratePlans.length > 1 && <label className={styles.rateLabel}>Tarifa de {room.name}<select value={rate.ratePlanId} onChange={event => onRateChange(event.target.value)}>
        {room.ratePlans.map(value => <option key={value.ratePlanId} value={value.ratePlanId}>{value.name}</option>)}
      </select></label>}
      <div className={styles.cardBottom}><p className={styles.price}><strong>{displayMoney(rate.baseNightlyRate, rate.currency, currency)}</strong><span> / noche</span>
        <small>Total de habitación: {displayMoney(rate.totalAmount, rate.currency, currency)} por {nights} {nights === 1 ? 'noche' : 'noches'}</small></p>
        <div className={styles.cardActions}><Link className={styles.detailsLink} href={detailsHref}>Ver detalles</Link>
          <Button aria-pressed={selected} onClick={onSelect}>{selected ? <><BookingIcon name="check" />Seleccionada</> : <><BookingIcon name="cart" />Agregar al carrito</>}</Button></div>
      </div>
    </div>
  </article>;
}

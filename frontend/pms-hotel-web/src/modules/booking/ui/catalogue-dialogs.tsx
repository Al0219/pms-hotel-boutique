import { useLayoutEffect, type RefObject } from "react";
import type { AvailableRoomType, RatePlanOption } from "@/modules/availability";
import { Button, Modal } from "@/shared/components";
import { catalogueMoney, selectionTotals, type resolveSelection } from "../domain/room-catalogue";
import { CatalogueRoomImage } from "./catalogue-room-card";
import styles from "./public-availability-page.module.css";

function useCatalogueDialog(returnFocusRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    // Capture before the parent applies inert: browsers blur inert descendants.
    const trigger = returnFocusRef.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      // Wait until React removes inert from the catalogue background.
      queueMicrotask(() => { if (trigger?.isConnected) trigger.focus(); });
    };
  }, [returnFocusRef]);
}

export function CatalogueDetailsDialog({ room, rate, onClose, returnFocusRef }: { room: AvailableRoomType; rate: RatePlanOption; onClose: () => void; returnFocusRef: RefObject<HTMLElement | null> }) {
  useCatalogueDialog(returnFocusRef);
  return <div className={styles.modalLayer}><Modal title={room.name} onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Cerrar detalles</Button>}>
    <CatalogueRoomImage room={room} />
    {!room.images.length && <p className={styles.small}>Fotografías aún no disponibles. Imagen ilustrativa.</p>}
    <p>{room.description}</p><p>Hasta {room.maxOccupancy} huéspedes por habitación{room.areaSquareMeters && ` · ${room.areaSquareMeters} m²`}</p>
    {room.bedDescription && <p>{room.bedDescription}</p>}
    {room.amenities?.length ? <p>{room.amenities.join(' · ')}</p> : null}
    <h3>Tarifa y políticas</h3><p>{rate.name} · {catalogueMoney(rate.baseNightlyRate, rate.currency)} / noche</p>
    <p>{rate.cancellationPolicy}</p>{rate.description && <p>{rate.description}</p>}{rate.mealsIncluded && <p>{rate.mealsIncluded}</p>}
    <p className={styles.small}>Consulta las condiciones de esta tarifa antes de continuar. Seleccionar una habitación no confirma una reserva.</p>
  </Modal></div>;
}

export function CatalogueSelectionDrawer({ items, nights, available, onQuantity, onRemove, onClose, returnFocusRef }: {
  items: ReturnType<typeof resolveSelection>; nights: number; available: boolean;
  onQuantity: (id: string, quantity: number) => void; onRemove: (id: string) => void; onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  useCatalogueDialog(returnFocusRef);
  const totals = selectionTotals(items);
  return <div className={`${styles.modalLayer} ${styles.drawer}`}><Modal title="Mi selección" onClose={onClose}
    footer={<><Button variant="secondary" onClick={onClose}>Seguir explorando</Button><Button disabled aria-describedby="checkout-note">Continuar con el Checkout</Button></>}>
    <button className={styles.closeDrawer} type="button" aria-label="Cerrar mi selección" onClick={onClose}>×</button>
    <p>{nights} {nights === 1 ? 'noche' : 'noches'} · {items.reduce((sum, item) => sum + item.quantity, 0)} habitaciones seleccionadas</p>
    {!available && <p role="alert">Debemos consultar nuevamente la disponibilidad antes de continuar.</p>}
    {items.length === 0 ? <p>Tu selección está vacía. Agrega una habitación para comparar tu estancia.</p> :
      <ul className={styles.selectionList}>{items.map(item => <li key={item.roomTypeId}>
        <h3>{item.room?.name ?? "Habitación no disponible"}</h3><p>{item.rate?.name ?? "Tarifa no disponible"}</p>
        {!item.valid && <p role="alert">Esta selección ya no está disponible. Retírala o modifica la cantidad.</p>}
        {item.rate && <p>{catalogueMoney(item.rate.totalAmount, item.rate.currency)} por habitación / estancia</p>}
        <div className={styles.quantity}><span>Cantidad</span><button type="button" aria-label={`Reducir cantidad de ${item.room?.name}`} disabled={item.quantity <= 1} onClick={() => onQuantity(item.roomTypeId, item.quantity - 1)}>−</button>
          <span aria-live="polite">{item.quantity}</span><button type="button" aria-label={`Aumentar cantidad de ${item.room?.name}`} disabled={!available || !item.room || item.quantity >= item.room.availableRoomsCount} onClick={() => onQuantity(item.roomTypeId, item.quantity + 1)}>+</button>
          <button type="button" className={styles.remove} onClick={() => onRemove(item.roomTypeId)}>Quitar {item.room?.name}</button></div>
      </li>)}</ul>}
    <div className={styles.totals}><h3>Resumen de la estancia</h3>
      {totals.map(total => <p key={total.currency}><span>Importe cotizado ({total.currency})</span><strong>{catalogueMoney(total.amount, total.currency)}</strong></p>)}
      <p><span>Impuestos</span><span>Pendientes de confirmar</span></p>
      <p><span>Total final</span><span>Pendiente de confirmar</span></p>
      {items.some(item => !item.valid) && <p>Los importes excluyen selecciones no disponibles.</p>}
    </div>
    <p className={styles.small} id="checkout-note">El checkout estará disponible en una próxima entrega. El contrato actual no incluye el desglose de impuestos. Tu selección no retiene inventario ni confirma una reserva.</p>
  </Modal></div>;
}

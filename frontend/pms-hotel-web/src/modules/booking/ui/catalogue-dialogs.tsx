import { useLayoutEffect, type RefObject } from "react";
import { useRouter } from 'next/navigation';
import { Button, Modal } from "@/shared/components";
import type { resolveSelection } from "../domain/room-catalogue";
import { selectionPriceSummary } from '../domain/selection-price-summary';
import { displayMoney } from "../domain/display-currency";
import { usePublicBookingSession } from "../components/public-booking-provider";
import { publicSelectionHref } from '../domain/public-room-navigation';
import type { BookingSearchCriteria } from '../domain/booking-search-criteria';
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

export function CatalogueSelectionDrawer({ items, nights, available, criteria, onQuantity, onRemove, onClose, returnFocusRef }: {
  items: ReturnType<typeof resolveSelection>; nights: number; available: boolean;
  criteria: Partial<BookingSearchCriteria>;
  onQuantity: (id: string, quantity: number) => void; onRemove: (id: string) => void; onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  useCatalogueDialog(returnFocusRef);
  const router = useRouter();
  const { currency } = usePublicBookingSession();
  const prices = selectionPriceSummary(items);
  return <div className={`${styles.modalLayer} ${styles.drawer}`}><Modal title="Mi selección" onClose={onClose}
    footer={<><Button variant="secondary" onClick={onClose}>Seguir explorando</Button><Button disabled={!available || items.length === 0 || items.some(item => !item.valid)} aria-describedby="checkout-note" onClick={() => { onClose(); router.push(publicSelectionHref(criteria)); }}>Continuar con el Checkout</Button></>}>
    <button className={styles.closeDrawer} type="button" aria-label="Cerrar mi selección" onClick={onClose}>×</button>
    <p>{nights} {nights === 1 ? 'noche' : 'noches'} · {items.reduce((sum, item) => sum + item.quantity, 0)} habitaciones seleccionadas</p>
    {!available && <p role="alert">Debemos consultar nuevamente la disponibilidad antes de continuar.</p>}
    {items.length === 0 ? <p>Tu selección está vacía. Agrega una habitación para comparar tu estancia.</p> :
      <ul className={styles.selectionList}>{items.map(item => <li key={item.roomTypeId}>
        <h3>{item.room?.name ?? "Habitación no disponible"}</h3><p>{item.rate?.name ?? "Tarifa no disponible"}</p>
        {!item.valid && <p role="alert">Esta selección ya no está disponible. Retírala o modifica la cantidad.</p>}
        {item.rate && <p>{displayMoney(item.rate.totalAmount, item.rate.currency, currency)} por habitación / estancia</p>}
        <div className={styles.quantity}><span>Cantidad</span><button type="button" aria-label={`Reducir cantidad de ${item.room?.name}`} disabled={item.quantity <= 1} onClick={() => onQuantity(item.roomTypeId, item.quantity - 1)}>−</button>
          <span aria-live="polite">{item.quantity}</span><button type="button" aria-label={`Aumentar cantidad de ${item.room?.name}`} disabled={!available || !item.room || item.quantity >= item.room.availableRoomsCount} onClick={() => onQuantity(item.roomTypeId, item.quantity + 1)}>+</button>
          <button type="button" className={styles.remove} onClick={() => onRemove(item.roomTypeId)}>Quitar {item.room?.name}</button></div>
      </li>)}</ul>}
    <div className={styles.totals}><h3>Resumen de la estancia</h3>
      {prices.rooms.map(total => <p key={total.currency}><span>Habitaciones ({total.currency === 'USD' || total.currency === 'GTQ' ? currency : total.currency})</span><strong>{displayMoney(total.amount, total.currency, currency)}</strong></p>)}
      {prices.completeEstimate ? <>{prices.service.map(total => <p key={total.currency}><span>Cargo de servicio</span><span>{displayMoney(total.amount, total.currency, currency)}</span></p>)}
        {prices.taxes.map(total => <p key={total.currency}><span>Impuestos estimados</span><span>{displayMoney(total.amount, total.currency, currency)}</span></p>)}
        {prices.estimated.map(total => <p key={total.currency}><span>Total estimado</span><strong>{displayMoney(total.amount, total.currency, currency)}</strong></p>)}</> :
        <><p><span>Impuestos</span><span>Pendientes de confirmar</span></p><p><span>Total final</span><span>Pendiente de confirmar</span></p></>}
      {items.some(item => !item.valid) && <p>Los importes excluyen selecciones no disponibles.</p>}
    </div>
    <p className={styles.small} id="checkout-note">Continúa para revisar tu selección antes de ingresar tus datos. Los importes son estimados y deben confirmarse al reservar. Tu selección no retiene inventario ni confirma una reserva.</p>
  </Modal></div>;
}

import { useLayoutEffect, type RefObject } from "react";
import { Button, Modal } from "@/shared/components";
import { selectionTotals, type resolveSelection } from "../domain/room-catalogue";
import { displayMoney } from "../domain/display-currency";
import { usePublicBookingSession } from "../components/public-booking-provider";
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

export function CatalogueSelectionDrawer({ items, nights, available, onQuantity, onRemove, onClose, returnFocusRef }: {
  items: ReturnType<typeof resolveSelection>; nights: number; available: boolean;
  onQuantity: (id: string, quantity: number) => void; onRemove: (id: string) => void; onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  useCatalogueDialog(returnFocusRef);
  const { currency } = usePublicBookingSession();
  const totals = selectionTotals(items);
  const estimatedTotals = selectionTotals(items.map(item => item.rate ? { ...item, rate: { ...item.rate, totalAmount: item.rate.priceBreakdown?.estimatedTotal ?? item.rate.totalAmount } } : item));
  const completeEstimate = items.length > 0 && items.every(item => item.valid && item.rate?.priceBreakdown);
  const feeTotals = (field: 'serviceCharge' | 'estimatedTaxes') => selectionTotals(items.map(item => item.rate ? { ...item, rate: { ...item.rate, totalAmount: item.rate.priceBreakdown?.[field] ?? 0 } } : item));
  return <div className={`${styles.modalLayer} ${styles.drawer}`}><Modal title="Mi selección" onClose={onClose}
    footer={<><Button variant="secondary" onClick={onClose}>Seguir explorando</Button><Button disabled aria-describedby="checkout-note">Continuar con el Checkout</Button></>}>
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
      {totals.map(total => <p key={total.currency}><span>Habitaciones ({total.currency})</span><strong>{displayMoney(total.amount, total.currency, currency)}</strong></p>)}
      {completeEstimate ? <>{feeTotals('serviceCharge').map(total => <p key={total.currency}><span>Cargo de servicio</span><span>{displayMoney(total.amount, total.currency, currency)}</span></p>)}
        {feeTotals('estimatedTaxes').map(total => <p key={total.currency}><span>Impuestos estimados</span><span>{displayMoney(total.amount, total.currency, currency)}</span></p>)}
        {estimatedTotals.map(total => <p key={total.currency}><span>Total estimado</span><strong>{displayMoney(total.amount, total.currency, currency)}</strong></p>)}</> :
        <><p><span>Impuestos</span><span>Pendientes de confirmar</span></p><p><span>Total final</span><span>Pendiente de confirmar</span></p></>}
      {items.some(item => !item.valid) && <p>Los importes excluyen selecciones no disponibles.</p>}
    </div>
    <p className={styles.small} id="checkout-note">El checkout estará disponible en una próxima entrega. Los importes son estimados y deben confirmarse al reservar. Tu selección no retiene inventario ni confirma una reserva.</p>
  </Modal></div>;
}

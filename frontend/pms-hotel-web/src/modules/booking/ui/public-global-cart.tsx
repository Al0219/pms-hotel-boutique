'use client';

import { useCallback, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { usePublicAvailability } from '@/modules/availability';
import { usePublicBookingSession } from '../components/public-booking-provider';
import { cartCriteria } from '../domain/public-cart-storage';
import { validateBookingSearchCriteria } from '../domain/booking-search-criteria';
import { changeSelectionQuantity, resolveSelection } from '../domain/room-catalogue';
import { CatalogueSelectionDrawer } from './catalogue-dialogs';
import { BookingIcon } from './booking-icon';
import styles from './public-booking-shell.module.css';

export function PublicGlobalCart() {
  const { cart } = usePublicBookingSession();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const close = useCallback(() => setOpen(false), []);

  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return <><button ref={trigger} type="button" className={styles.cartAction} aria-label="Carrito" aria-describedby="public-cart-count" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
    <BookingIcon name="cart" /><span id="public-cart-count" aria-live="polite">{count}</span>
  </button>{open && createPortal(<GlobalCartContents onClose={close} returnFocusRef={trigger} />, document.body)}</>;
}


function GlobalCartContents({ onClose, returnFocusRef }: { onClose: () => void; returnFocusRef: RefObject<HTMLElement | null> }) {
  const { cart, setCart } = usePublicBookingSession();
  const criteria = cartCriteria(cart);
  const valid = cart.items.length > 0 && !Object.keys(validateBookingSearchCriteria(criteria)).length;
  const availability = usePublicAvailability(valid ? { propertyId: cart.propertyId, checkInDate: criteria.checkIn!, checkOutDate: criteria.checkOut!, adults: criteria.adults!, children: criteria.children!, roomsCount: criteria.roomsCount! } : undefined);
  const rooms = availability.data?.roomTypes ?? [];
  const ready = Boolean(valid && availability.isSuccess && !availability.isFetching && availability.fetchStatus !== 'paused');
  return <CatalogueSelectionDrawer items={resolveSelection(cart.items, ready ? rooms : [])} nights={availability.data?.totalNights ?? 0} available={ready} criteria={criteria} onClose={onClose} returnFocusRef={returnFocusRef}
    onRemove={id => setCart(previous => ({ ...previous, items: previous.items.filter(item => item.roomTypeId !== id) }))}
    onQuantity={(id, quantity) => setCart(previous => ({ ...previous, items: changeSelectionQuantity(previous.items, rooms, id, quantity) }))} />;
}

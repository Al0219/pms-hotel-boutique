'use client';

import { useEffect, useState, type RefObject } from 'react';
import { Button } from '@/shared/components';
import type { BookingSearchCriteria } from '../domain/booking-search-criteria';
import { isBookingCalendarDate } from '../domain/booking-search-criteria';
import { BookingIcon } from './booking-icon';
import styles from './floating-booking-search.module.css';

function dateLabel(value: string | undefined) {
  if (!value) return 'Elige fecha';
  if (!isBookingCalendarDate(value)) return 'Revisa fecha';
  // Keep calendar dates independent of the browser's UTC offset.
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${value}T12:00:00Z`));
}

export function FloatingBookingSearch({ searchRef, criteria, pending }: {
  searchRef: RefObject<HTMLDivElement | null>;
  criteria: Partial<BookingSearchCriteria>;
  pending: boolean;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const search = searchRef.current;
    if (!search) return;
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(([entry]) => {
        setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
      }, { threshold: 0 });
      observer.observe(search);
      return () => observer.disconnect();
    }
    const update = () => setVisible(search.getBoundingClientRect().bottom <= 0);
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [searchRef]);

  function modify(target: 'dates' | 'guests') {
    const search = searchRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    search?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
    if (target === 'dates') search?.querySelector<HTMLInputElement>('#search-check-in')?.focus({ preventScroll: true });
    else {
      const guests = search?.querySelector<HTMLButtonElement>('button[aria-controls="occupancy-options"]');
      if (guests?.getAttribute('aria-expanded') === 'false') guests.click();
      guests?.focus({ preventScroll: true });
    }
  }

  const adults = Number.isFinite(criteria.adults) ? criteria.adults : '—';
  return <aside className={`${styles.floating} ${visible ? styles.visible : ''}`} aria-label="Búsqueda flotante"
    aria-hidden={!visible} inert={!visible} data-floating-search={visible}>
    <div className={styles.inner}>
      <button type="button" className={styles.summary} disabled={pending} onClick={() => modify('dates')} aria-label="Modificar fechas">
        <BookingIcon name="calendar" /><span><small>Check-in — Check-out</small><strong>{dateLabel(criteria.checkIn)} — {dateLabel(criteria.checkOut)}</strong></span>
      </button>
      <button type="button" className={styles.summary} disabled={pending} onClick={() => modify('guests')} aria-label="Modificar huéspedes">
        <BookingIcon name="guests" /><span><small>Huéspedes</small><strong>{adults} {adults === 1 ? 'adulto' : 'adultos'}{(criteria.children ?? 0) > 0 ? ` · ${criteria.children} ${criteria.children === 1 ? 'niño' : 'niños'}` : ''}{(criteria.roomsCount ?? 1) > 1 ? ` · ${criteria.roomsCount} hab.` : ''}</strong></span>
      </button>
      <Button size="sm" isLoading={pending} loadingText="Buscando…" onClick={() => searchRef.current?.querySelector('form')?.requestSubmit()}>Buscar <BookingIcon name="arrow" /></Button>
    </div>
  </aside>;
}

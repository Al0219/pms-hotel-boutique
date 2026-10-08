'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/shared/components';
import {
  BookingSearchCriteria,
  BookingSearchValidationErrors,
  validateBookingSearchCriteria,
  buildSearchQueryParams,
  getBookingCalendarDate,
  nextBookingCalendarDate,
  isBookingCalendarDate,
} from '../domain/booking-search-criteria';
import styles from './public-search-form.module.css';
import { BookingIcon } from './booking-icon';

export interface PublicSearchFormProps {
  initialCriteria?: Partial<BookingSearchCriteria>;
  onSearchSubmitted?: (criteria: BookingSearchCriteria) => void | Promise<void>;
  propertyTimeZone?: string;
  variant?: 'standard' | 'landing';
  onCriteriaChange?: (criteria: BookingSearchCriteria) => void;
  onPendingChange?: (pending: boolean) => void;
}

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function PublicSearchForm({
  initialCriteria,
  onSearchSubmitted,
  propertyTimeZone,
  variant = 'standard',
  onCriteriaChange,
  onPendingChange,
}: PublicSearchFormProps) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);

  const defaultCheckIn = getBookingCalendarDate(new Date(), propertyTimeZone);
  const defaultCheckOut = nextBookingCalendarDate(defaultCheckIn);

  const [checkIn, setCheckIn] = useState(initialCriteria?.checkIn);
  const [checkOut, setCheckOut] = useState(initialCriteria?.checkOut);
  // A static/server render cannot know the browser calendar or current day.
  const arrival = checkIn ?? (hydrated ? defaultCheckIn : '');
  const departure = checkOut ?? (hydrated ? defaultCheckOut : '');
  const [adults, setAdults] = useState<number>(
    initialCriteria?.adults !== undefined ? initialCriteria.adults : 2
  );
  const [childrenCount, setChildrenCount] = useState<number>(
    initialCriteria?.children !== undefined ? initialCriteria.children : 0
  );
  const [promoCode, setPromoCode] = useState<string>(
    initialCriteria?.promoCode || ''
  );
  const [roomsCount, setRoomsCount] = useState<number>(initialCriteria?.roomsCount ?? 1);

  const [errors, setErrors] = useState<BookingSearchValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isNavigating, startNavigation] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submissionLock = useRef(false);
  const isBusy = isSubmitting || isNavigating;
  const isLanding = variant === 'landing';
  const [occupancyOpen, setOccupancyOpen] = useState(false);
  const occupancyToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    onCriteriaChange?.({ checkIn: arrival, checkOut: departure, adults, children: childrenCount, roomsCount, promoCode });
  }, [arrival, departure, adults, childrenCount, roomsCount, promoCode, onCriteriaChange]);
  useEffect(() => { onPendingChange?.(isBusy); }, [isBusy, onPendingChange]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submissionLock.current || isBusy) return;

    const criteria: BookingSearchCriteria = {
      checkIn: arrival,
      checkOut: departure,
      adults: Number(adults),
      children: Number(childrenCount),
      roomsCount,
      promoCode,
    };

    const validationErrors = validateBookingSearchCriteria(criteria, defaultCheckIn);
    setSubmitError(null);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const fields: Record<keyof BookingSearchValidationErrors, string> = {
        checkIn: 'check-in', checkOut: 'check-out', adults: 'adults',
        children: 'children', roomsCount: 'rooms', promoCode: 'promo',
      };
      const firstError = Object.keys(validationErrors)[0] as keyof BookingSearchValidationErrors;
      if (isLanding && ['adults', 'children', 'roomsCount', 'promoCode'].includes(firstError)) {
        setOccupancyOpen(true);
        // The disclosure must render before its invalid field can receive focus.
        requestAnimationFrame(() => document.getElementById(`search-${fields[firstError]}`)?.focus());
        return;
      }
      e.currentTarget.querySelector<HTMLInputElement>(`#search-${fields[firstError]}`)?.focus();
      return;
    }

    setErrors({});
    submissionLock.current = true;
    setIsSubmitting(true);
    try {
      if (onSearchSubmitted) {
        await onSearchSubmitted(criteria);
      } else {
        const queryString = buildSearchQueryParams(criteria);
        startNavigation(() => router.push(`/habitaciones?${queryString}`));
      }
    } catch {
      setSubmitError('No se pudo iniciar la búsqueda. Conservamos tus datos; inténtalo de nuevo.');
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <section className={`${styles.card} ${isLanding ? styles.landing : ''}`} aria-labelledby="search-form-title">
      <div className={styles.header}>
        <h2 id="search-form-title" className={isLanding ? styles.srOnly : styles.title}>
          Reserva tu Estancia Exclusiva
        </h2>
        {!isLanding && <p className={styles.subtitle}>
          Encuentra disponibilidad en nuestro hotel boutique para tus próximas fechas
        </p>}
      </div>

      <form onSubmit={handleSubmit} noValidate aria-label="Búsqueda de disponibilidad" aria-busy={isBusy}>
        <fieldset className={styles.fields} disabled={isBusy}>
        <legend className={styles.legend}>Fechas y ocupación</legend>
        <div className={styles.formGrid}>
          <div className={styles.dateField}>
          {isLanding && <BookingIcon name="calendar" className={styles.fieldIcon} />}
          <Input
            id="search-check-in"
            type="date"
            label={isLanding ? 'Check-in' : 'Fecha de Llegada'}
            isRequired
            value={arrival}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (errors.checkIn) setErrors((prev) => ({ ...prev, checkIn: undefined }));
            }}
            errorMessage={errors.checkIn}
            min={hydrated ? defaultCheckIn : undefined}
          />
          </div>

          <div className={styles.dateField}>
          {isLanding && <BookingIcon name="calendar" className={styles.fieldIcon} />}
          <Input
            id="search-check-out"
            type="date"
            label={isLanding ? 'Check-out' : 'Fecha de Salida'}
            isRequired
            value={departure}
            onChange={(e) => {
              setCheckOut(e.target.value);
              if (errors.checkOut) setErrors((prev) => ({ ...prev, checkOut: undefined }));
            }}
            errorMessage={errors.checkOut}
            min={hydrated ? (isBookingCalendarDate(arrival) ? nextBookingCalendarDate(arrival) : defaultCheckOut) : undefined}
          />
          </div>

          {isLanding && <div className={styles.occupancy}>
            <span className={styles.occupancyLabel} id="occupancy-label">Huéspedes</span>
            <button type="button" ref={occupancyToggle} className={styles.occupancyToggle}
              aria-labelledby="occupancy-label occupancy-value" aria-expanded={occupancyOpen}
              aria-controls="occupancy-options" onClick={() => setOccupancyOpen(open => !open)}>
              <BookingIcon name="guests" />
              <span id="occupancy-value">{Number.isFinite(adults) ? adults : '—'} {adults === 1 ? 'adulto' : 'adultos'}{childrenCount > 0 ? ` · ${childrenCount} ${childrenCount === 1 ? 'niño' : 'niños'}` : ''}{roomsCount > 1 ? ` · ${roomsCount} hab.` : ''}</span>
              <BookingIcon name="chevron" />
            </button>
          </div>}

          {isLanding && <Button type="submit" size="lg" isLoading={isBusy} loadingText="Buscando…" className={styles.landingSubmit}>
            Buscar disponibilidad <BookingIcon name="arrow" />
          </Button>}

          </div>
          <div id={isLanding ? 'occupancy-options' : undefined}
            hidden={isLanding && !occupancyOpen} className={isLanding ? styles.occupancyOptions : styles.additionalFields}
            onKeyDown={event => {
              if (isLanding && event.key === 'Escape') {
                setOccupancyOpen(false);
                occupancyToggle.current?.focus();
              }
            }}>
          <div className={styles.occupancyGrid}>

          <Input
            id="search-adults"
            type="number"
            label="Adultos"
            isRequired
            min={1}
            step={1}
            value={Number.isNaN(adults) ? '' : adults}
            onChange={(e) => {
              setAdults(e.target.value === '' ? Number.NaN : Number(e.target.value));
              if (errors.adults) setErrors((prev) => ({ ...prev, adults: undefined }));
            }}
            errorMessage={errors.adults}
          />

          <Input
            id="search-children"
            type="number"
            label="Niños"
            min={0}
            step={1}
            value={Number.isNaN(childrenCount) ? '' : childrenCount}
            onChange={(e) => {
              setChildrenCount(e.target.value === '' ? Number.NaN : Number(e.target.value));
              if (errors.children) setErrors((prev) => ({ ...prev, children: undefined }));
            }}
            errorMessage={errors.children}
          />
          <Input
            id="search-rooms"
            type="number"
            label="Habitaciones"
            isRequired
            min={1}
            step={1}
            value={Number.isNaN(roomsCount) ? '' : roomsCount}
            onChange={event => {
              setRoomsCount(event.target.value === '' ? Number.NaN : Number(event.target.value));
              if (errors.roomsCount) setErrors(previous => ({ ...previous, roomsCount: undefined }));
            }}
            errorMessage={errors.roomsCount}
          />
        </div>

        <div className={styles.promotion}>
          <Input
            id="search-promo"
            type="text"
            label="Código Promocional (Opcional)"
            placeholder="Ej: BOUTIQUE2026"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            errorMessage={errors.promoCode}
          />
        </div>
        {isLanding && <button className={styles.doneButton} type="button" onClick={() => {
          setOccupancyOpen(false);
          occupancyToggle.current?.focus();
        }}>Listo</button>}
        </div>

        </fieldset>
        {submitError && <p role="alert">{submitError}</p>}

        {!isLanding && <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isBusy}
            loadingText="Buscando habitaciones..."
            className={styles.submitButton}
          >
            Buscar Disponibilidad
          </Button>
        </div>}
      </form>
    </section>
  );
}

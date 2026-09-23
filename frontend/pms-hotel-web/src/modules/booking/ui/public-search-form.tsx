'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/shared/components';
import {
  BookingSearchCriteria,
  BookingSearchValidationErrors,
  validateBookingSearchCriteria,
  buildSearchQueryParams,
} from '../domain/booking-search-criteria';
import styles from './public-search-form.module.css';

export interface PublicSearchFormProps {
  initialCriteria?: Partial<BookingSearchCriteria>;
  onSearchSubmitted?: (criteria: BookingSearchCriteria) => void;
}

export function PublicSearchForm({
  initialCriteria,
  onSearchSubmitted,
}: PublicSearchFormProps) {
  const router = useRouter();

  // Helper to get default dates in YYYY-MM-DD
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const defaultCheckIn = today.toISOString().split('T')[0];
  const defaultCheckOut = tomorrow.toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState<string>(
    initialCriteria?.checkIn || defaultCheckIn
  );
  const [checkOut, setCheckOut] = useState<string>(
    initialCriteria?.checkOut || defaultCheckOut
  );
  const [adults, setAdults] = useState<number>(
    initialCriteria?.adults !== undefined ? initialCriteria.adults : 2
  );
  const [childrenCount, setChildrenCount] = useState<number>(
    initialCriteria?.children !== undefined ? initialCriteria.children : 0
  );
  const [promoCode, setPromoCode] = useState<string>(
    initialCriteria?.promoCode || ''
  );

  const [errors, setErrors] = useState<BookingSearchValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const criteria: BookingSearchCriteria = {
      checkIn,
      checkOut,
      adults: Number(adults),
      children: Number(childrenCount),
      promoCode,
    };

    const validationErrors = validateBookingSearchCriteria(criteria);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    if (onSearchSubmitted) {
      onSearchSubmitted(criteria);
    } else {
      const queryString = buildSearchQueryParams(criteria);
      router.push(`/habitaciones?${queryString}`);
    }
  };

  return (
    <section className={cardClassName(styles.card)} aria-labelledby="search-form-title">
      <div className={styles.header}>
        <h2 id="search-form-title" className={styles.title}>
          Reserva tu Estancia Exclusiva
        </h2>
        <p className={styles.subtitle}>
          Encuentra disponibilidad en nuestro hotel boutique para tus próximas fechas
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate aria-label="Búsqueda de disponibilidad">
        <div className={styles.formGrid}>
          <Input
            id="search-check-in"
            type="date"
            label="Fecha de Llegada"
            isRequired
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (errors.checkIn) setErrors((prev) => ({ ...prev, checkIn: undefined }));
            }}
            errorMessage={errors.checkIn}
            min={defaultCheckIn}
          />

          <Input
            id="search-check-out"
            type="date"
            label="Fecha de Salida"
            isRequired
            value={checkOut}
            onChange={(e) => {
              setCheckOut(e.target.value);
              if (errors.checkOut) setErrors((prev) => ({ ...prev, checkOut: undefined }));
            }}
            errorMessage={errors.checkOut}
            min={checkIn || defaultCheckIn}
          />

          <Input
            id="search-adults"
            type="number"
            label="Adultos"
            isRequired
            min={1}
            max={10}
            value={adults}
            onChange={(e) => {
              setAdults(parseInt(e.target.value, 10) || 0);
              if (errors.adults) setErrors((prev) => ({ ...prev, adults: undefined }));
            }}
            errorMessage={errors.adults}
          />

          <Input
            id="search-children"
            type="number"
            label="Niños (0-12 años)"
            min={0}
            max={10}
            value={childrenCount}
            onChange={(e) => {
              setChildrenCount(parseInt(e.target.value, 10) || 0);
              if (errors.children) setErrors((prev) => ({ ...prev, children: undefined }));
            }}
            errorMessage={errors.children}
          />
        </div>

        <div style={{ marginTop: '16px' }}>
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

        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            loadingText="Buscando habitaciones..."
            className={styles.submitButton}
          >
            Buscar Disponibilidad
          </Button>
        </div>
      </form>
    </section>
  );
}

function cardClassName(className: string): string {
  return className;
}

'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { BookingStepper, publicResultsHref, publicSelectionHref, usePublicBookingReview, type BookingSearchCriteria } from '@/modules/booking';
import { Button, EmptyState, ErrorState, LoadingState } from '@/shared/components';
import styles from './public-guest-data-page.module.css';

export function PublicGuestDataPage({ initialCriteria: criteria }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  const { hydrated, validCriteria, availability, items, ready, prices } = usePublicBookingReview(criteria);
  const [reviewed, setReviewed] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity() || !name.trim() || !ready || !prices.allValid) return;
    setReviewed(true);
  }
  return <div className={styles.page}><Link className={styles.back} href={publicSelectionHref(criteria)}>← Volver a mi selección</Link>
    <header><p className={styles.eyebrow}>UN PASO MÁS CERCA</p><h1>Datos del huésped</h1><p>Paso 2 de 3 · Datos de quien realiza la reserva</p></header>
    <BookingStepper step={2} />
    {!hydrated ? <LoadingState message="Preparando tu estancia…" /> : !validCriteria ? <EmptyState title="Completa tu búsqueda" description="Necesitamos fechas y huéspedes para continuar." /> :
      availability.fetchStatus === 'paused' ? <ErrorState title="Sin conexión" message="Recupera la conexión para revisar tu selección." onRetry={() => { void availability.refetch(); }} /> :
      availability.isFetching ? <LoadingState message="Verificando tu selección…" /> :
      availability.isError ? <ErrorState title="No pudimos verificar tu selección" message="Reintenta antes de ingresar tus datos." onRetry={() => { void availability.refetch(); }} /> :
      ready && (!items.length || !prices.allValid ? <EmptyState title="Revisa tu selección antes de continuar" description="Falta elegir una habitación disponible para tus fechas." /> :
        <section className={styles.card} aria-labelledby="contact-title"><h2 id="contact-title">¿Quién realiza la reserva?</h2>
          <p>Puedes continuar como invitado. Estos datos no crean una cuenta ni asignan automáticamente los ocupantes de las habitaciones.</p>
          <form onSubmit={submit} onChange={() => setReviewed(false)}>
            <label>Nombre completo<input name="name" autoComplete="name" required maxLength={150} pattern=".*\S.*" value={name} onChange={event => setName(event.target.value)} /></label>
            <label>Correo electrónico<input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
            <label>Teléfono de contacto <span>(opcional)</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} /></label>
            <Button type="submit">Revisar mis datos</Button>
          </form>
          {reviewed && <div role="status" className={styles.notice}><strong>Datos revisados</strong><p>{name.trim()} · {email}</p><p>Se mantienen únicamente en esta pantalla. La garantía y el pago estarán disponibles en la siguiente entrega; todavía no se creó una reserva.</p></div>}
          <p className={styles.small}>Formulario inicial de presentación. No envía datos al servidor, no realiza cobros y no confirma reservas.</p>
        </section>)}
    <Link className={styles.catalogue} href={publicResultsHref(criteria)}>Volver al catálogo</Link>
  </div>;
}

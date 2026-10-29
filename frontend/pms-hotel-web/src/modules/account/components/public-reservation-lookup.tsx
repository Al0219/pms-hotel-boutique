'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useReservationLookup } from '../hooks/use-reservation-lookup';
import { ReservationLookupDetails } from './reservation-lookup-details';
import styles from './real-guest-reservations.module.css';
import form from './public-reservation-lookup.module.css';

export function PublicReservationLookup() {
  const lookup = useReservationLookup();
  const [email, setEmail] = useState(''), [reference, setReference] = useState('');
  const [errors, setErrors] = useState<{ email?: string; reference?: string }>({});
  const close = () => { lookup.clear(); setEmail(''); setReference(''); setErrors({}); };
  return <section className={styles.page}><div className={styles.container}>
    <nav className={styles.nav} aria-label="Reservas"><Link href="/">← Volver al inicio</Link><Link href="/habitaciones">Buscar otra estancia</Link></nav>
    <header className={styles.header}><div><p className={styles.overline}>TU ESTADÍA, A UN PASO</p><h1>Mis reservas</h1><p>¿Reservaste como invitado? Consulta tu reserva con el correo y el código de tu comprobante.</p></div><Link className={styles.secondary} href="/acceso?returnTo=%2Fmis-reservas">Ya tengo una cuenta</Link></header>
    {!lookup.result && <div className={form.layout}>
      <form className={`${styles.card} ${form.form}`} noValidate onSubmit={event => {
        event.preventDefault();
        const next: typeof errors = {};
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 320) next.email = 'Ingresa un correo electrónico válido.';
        if (!/^[A-Za-z0-9][A-Za-z0-9-]{5,39}$/.test(reference.trim())) next.reference = 'Ingresa el código de tu comprobante de reserva.';
        setErrors(next);
        if (Object.keys(next).length) { document.getElementById(next.email ? 'lookup-email' : 'lookup-reference')?.focus(); return; }
        void lookup.search(email.trim(), reference.trim());
      }}>
        <span className={form.icon} aria-hidden="true">⌕</span><h2>Consulta tu reserva</h2><p>Ingresa ambos datos tal como aparecen en la confirmación. No necesitas iniciar sesión.</p>
        <label htmlFor="lookup-email">Correo utilizado al reservar</label>
        <input id="lookup-email" type="email" autoComplete="email" maxLength={320} value={email} disabled={lookup.busy} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'lookup-email-error' : undefined} onChange={event => { setEmail(event.target.value); setErrors(current => ({ ...current, email: undefined })); }} placeholder="tu@correo.com" />
        {errors.email && <p id="lookup-email-error" className={form.fieldError} role="alert">{errors.email}</p>}
        <label htmlFor="lookup-reference">Código de reserva</label>
        <input id="lookup-reference" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={40} value={reference} disabled={lookup.busy} aria-invalid={Boolean(errors.reference)} aria-describedby={errors.reference ? 'lookup-reference-error' : undefined} onChange={event => { setReference(event.target.value); setErrors(current => ({ ...current, reference: undefined })); }} placeholder="Ej. HB-2026-08421" />
        {errors.reference && <p id="lookup-reference-error" className={form.fieldError} role="alert">{errors.reference}</p>}
        <button className={styles.primary} disabled={lookup.busy} type="submit">{lookup.busy ? 'Consultando reserva…' : 'Consultar reserva'}</button>
        {lookup.busy && <p role="status">Estamos buscando tu reserva…</p>}
        {lookup.error && <div className={form.error} role="alert">{lookup.error}</div>}
      </form>
      <aside className={form.guide}><h2>Una reserva, sin registro.</h2><p>El código está en la confirmación que recibiste al reservar. Esta consulta muestra únicamente la reserva que coincida con tu correo y código.</p><h2>Tu historial, en tu cuenta.</h2><p>Para consultar todas tus reservas y tu historial, crea una cuenta con el correo que utilizaste al reservar o inicia sesión si ya tienes una.</p><Link className={styles.secondary} href="/acceso?returnTo=%2Fmis-reservas">Crear cuenta o iniciar sesión</Link></aside>
    </div>}
    {lookup.result && <ReservationLookupDetails result={lookup.result} contactEmail={email.trim()} onClose={close} />}
    <aside className={styles.notice}>Tu correo y código permiten consultar esta reserva. No los compartas. La consulta se cierra al salir o recargar esta página y se limpia después de 15 minutos.</aside>
  </div></section>;
}

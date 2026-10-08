'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { getPublicEnvironment } from '@/lib/env';
import { useGuestSession } from '@/modules/auth';
import { ReservationLinkForm } from './reservation-link-form';
import styles from './reservation-link-page.module.css';

/** The account route layout owns Guest access. Linking remains frontend-only. */
export function ReservationLinkPage() {
  const { account } = useGuestSession();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  if (!account) return null;
  return <section className={styles.page} aria-labelledby="link-reservation-heading">
    <div className={styles.container}>
      <Link className={styles.back} href="/cuenta">← Volver a mi cuenta</Link>
      <header className={styles.heading}>
        <p className={styles.overline}>TUS ESTADÍAS, EN UN SOLO LUGAR</p>
        <h1 id="link-reservation-heading" ref={heading} tabIndex={-1}>Vincular reserva existente</h1>
        <p>¿Reservaste como invitado? Ingresa tu referencia y verifica la reserva para consultarla desde tu cuenta.</p>
      </header>
      <div className={styles.layout}>
        <ReservationLinkForm standalone />
        <aside className={styles.guide} aria-labelledby="link-guide-title">
          <span className={styles.icon} aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></svg></span>
          <h2 id="link-guide-title">Antes de comenzar</h2>
          <ul>
            <li>Ten a mano la referencia que aparece en tu confirmación.</li>
            <li>Usa la cuenta con el mismo correo registrado en la reserva.</li>
            <li>Verifica el código antes de añadir la reserva a tu historial.</li>
          </ul>
          <div className={styles.account}><span>Cuenta que recibirá la reserva</span><strong>{account.email ?? 'Cuenta de huésped'}</strong></div>
          <p className={styles.privacy}>Solo podrás consultar la reserva después de verificar que te pertenece. Puedes vincular más de una reserva.</p>
          <Link href="/mis-reservas">Ver mis reservas <span aria-hidden="true">→</span></Link>
        </aside>
      </div>
      {getPublicEnvironment().useMockApi && <p className={styles.note}>Vincular una reserva no crea una nueva ni modifica sus fechas, habitaciones o cargos.</p>}
    </div>
  </section>;
}

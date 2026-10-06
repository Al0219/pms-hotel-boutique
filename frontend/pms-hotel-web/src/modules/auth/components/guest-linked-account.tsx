'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useGuestCheckoutReturn } from '../hooks/use-guest-checkout-return';
import { clearGuestCheckoutReturn } from '../model/guest-checkout-context';
import { useGuestSession } from './guest-session-provider';
import styles from './guest-linked-account.module.css';

/** Presentation data only; these optional fields do not extend an authentication contract. */
export interface LinkedAccountDetails {
  profileName?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  isActive?: boolean;
  linkedReservationsCount?: number;
  state?: 'loading' | 'ready' | 'error';
  onRetry?: () => void;
}

export function GuestLinkedAccount({ authProvider, returnTo, details = {} }: {
  authProvider: 'google' | 'email'; returnTo?: string; details?: LinkedAccountDetails;
}) {
  const { account, signOut, isPending, error } = useGuestSession();
  const title = useRef<HTMLHeadingElement>(null);
  const [failedAvatar, setFailedAvatar] = useState<string>();
  const checkout = useGuestCheckoutReturn(returnTo);
  const name = details.profileName?.trim();
  const initials = name?.split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase();
  const avatar = authProvider === 'google' && details.avatarUrl?.startsWith('https://') && failedAvatar !== details.avatarUrl
    ? details.avatarUrl : undefined;
  useEffect(() => { title.current?.focus(); }, []);
  if (!account) return null;

  const isGoogle = authProvider === 'google';
  return <section className={styles.page} aria-labelledby="linked-account-title" aria-busy={isPending}>
    <div className={styles.container}>
      <button className={styles.back} type="button" disabled={isPending} onClick={async () => { if (await signOut()) clearGuestCheckoutReturn(); }}
        title="Cerrar sesión y volver a las opciones de acceso">
        {isPending ? 'Cerrando sesión…' : '← Volver a opciones'}
      </button>
      <header className={styles.heading}>
        <span className={styles.successIcon} aria-hidden="true">✓</span>
        <p className={styles.overline}>AUTENTICACIÓN COMPLETADA</p>
        <h1 id="linked-account-title" ref={title} tabIndex={-1}>Cuenta vinculada</h1>
        <p>{isGoogle
          ? 'Volviste al PMS después de autenticarte con Google. Tu identidad externa quedó asociada a tu cuenta de huésped.'
          : 'Tu sesión con correo electrónico ha sido iniciada correctamente. Tu cuenta de huésped está lista para gestionar tus estadías.'}</p>
      </header>
      <div className={styles.card}>
        {checkout && <aside className={styles.checkoutNotice} aria-label="Reserva en curso">
          <span className={styles.noticeIcon} aria-hidden="true">↗</span>
          <div><strong>Tienes una reserva en curso</strong><p>Retoma tus fechas y huéspedes seleccionados. En el checkout podrás usar los datos disponibles de tu cuenta.</p>
            <Link href={checkout} onNavigate={clearGuestCheckoutReturn}>Volver al Checkout <span aria-hidden="true">→</span></Link>
          </div>
        </aside>}
        <div className={styles.profile}>
          <div className={styles.avatar} aria-hidden="true">
            {avatar ? <Image src={avatar} width={64} height={64} alt="" unoptimized onError={() => setFailedAvatar(avatar)} />
              : initials || <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>}
          </div>
          <div className={styles.identity}><h2>{name ?? 'Cuenta de huésped'}</h2><p>{account.email ?? 'Correo no disponible'}</p></div>
          <span className={styles.badge}><span aria-hidden="true">✓</span>{isGoogle ? 'Google conectado' : details.emailVerified ? 'Correo verificado' : 'Correo conectado'}</span>
        </div>
        {details.state === 'loading' && <p className={styles.feedback} role="status">Cargando los detalles de tu cuenta…</p>}
        {details.state === 'error' && <div className={styles.error} role="alert"><p>No pudimos cargar los detalles de tu cuenta. Puedes continuar con tu sesión iniciada.</p>
          {details.onRetry && <button type="button" onClick={details.onRetry}>Reintentar detalles</button>}
        </div>}
        <dl className={styles.properties}>
          <div><dt>Cuenta PMS</dt><dd>{details.isActive === undefined ? 'Consultar en mi cuenta' : details.isActive ? <span className={styles.active}><span aria-hidden="true">●</span> Activa</span> : 'Inactiva'}</dd></div>
          <div><dt>{isGoogle ? 'Identidad externa' : 'Método de acceso'}</dt><dd>{isGoogle ? 'Google' : 'Correo y contraseña'}</dd></div>
          <div><dt>Reservas vinculadas</dt><dd>{details.linkedReservationsCount === undefined ? 'Consulta tus reservas' : details.linkedReservationsCount === 0 ? 'Sin reservas vinculadas' : `${details.linkedReservationsCount} ${details.linkedReservationsCount === 1 ? 'reserva vinculada' : 'reservas vinculadas'}`}<Link href="/mis-reservas">Disponibles en Mis reservas <span aria-hidden="true">↗</span></Link></dd></div>
        </dl>
        <div className={styles.privacy}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></svg>
          <p>{isGoogle ? 'El PMS no almacena tu contraseña de Google. ' : ''}La sesión de huésped queda separada de la sesión del personal.</p>
        </div>
        <div className={styles.actions}><Link className={styles.primary} href="/cuenta" onNavigate={clearGuestCheckoutReturn}>Ir a mi cuenta <span aria-hidden="true">→</span></Link>
          <Link className={styles.secondary} href={checkout ?? '/habitaciones'} onNavigate={clearGuestCheckoutReturn}>Continuar reservando</Link></div>
        <div className={styles.linkExisting}><Link href="/cuenta/reservas/vincular">Vincular reserva existente</Link><p>¿Reservaste como invitado? Consulta las opciones de vinculación de tus reservas.</p></div>
      </div>
      {error && <p className={styles.logoutError} role="alert">No se pudo cerrar la sesión. Inténtalo nuevamente.</p>}
      <p className={styles.returnNote}>Volver a opciones cerrará tu sesión de huésped.</p>
    </div>
  </section>;
}

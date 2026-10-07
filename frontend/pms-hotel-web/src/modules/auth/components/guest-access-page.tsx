"use client";
import { useEffect, useRef } from 'react';
import { useStaffAccessRedirect } from '../hooks/use-staff-access-redirect';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGuestSession } from './guest-session-provider';
import { GuestSessionCheck } from './guest-session-check';
import { AuthPasswordField } from './auth-password-field';
import { useUnifiedLogin } from '../hooks/use-unified-login';
import { guestAccessReturn } from '../model/checkout-return';
import { clearGuestCheckoutReturn, readGuestCheckoutReturn, rememberGuestCheckoutReturn } from '../model/guest-checkout-context';
import styles from './guest-access-page.module.css';

/** One canonical access form in every environment. */
export function GuestAccessPage({ returnTo, googleError }: { returnTo?: string; googleError?: boolean } = {}) {
  const { status, account } = useGuestSession();
  const login = useUnifiedLogin(returnTo, googleError);
  const router = useRouter();
  useStaffAccessRedirect(status === 'signed-out' && !account && !login.busy && !login.redirecting);
  const redirected = useRef(false);
  const destination = guestAccessReturn(returnTo);
  useEffect(() => {
    if (!account || redirected.current || login.busy || login.redirecting) return;
    redirected.current = true;
    const target = destination ?? (returnTo === undefined ? readGuestCheckoutReturn() : undefined) ?? '/cuenta';
    clearGuestCheckoutReturn(); router.replace(target);
  }, [account, destination, returnTo, router, login.busy, login.redirecting]);
  if (status === 'checking' || status === 'error') return <GuestSessionCheck />;
  if (account || login.redirecting) return <p role="status">Acceso correcto. Redirigiendo…</p>;
  const publicDestination = destination === '/mis-reservas' || destination === '/cuenta/reservas/vincular' ? '/habitaciones' : destination ?? '/';
  return <section className={`${styles.page} ${styles.authPage}`} aria-labelledby="access-title" aria-busy={login.busy}>
    <div className={styles.content}>
      <h1 id="access-title">Accede a tu cuenta</h1>
      <p>Inicia sesión para continuar o reserva como invitado.</p>
      <div className={`${styles.card} ${styles.authCard}`}>
        <form className={styles.credentialsForm} onSubmit={event => { event.preventDefault(); void login.submit(); }}>
          <div className={styles.field}>
            <label htmlFor="auth-email">Correo electrónico</label>
            <input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={50}
              value={login.email} onChange={event => login.changeEmail(event.target.value)} disabled={login.busy} />
          </div>
          <AuthPasswordField id="auth-password" label="Contraseña" value={login.password} onChange={login.changePassword}
            onBlur={() => {}} disabled={login.busy} autoComplete="current-password" />
          {login.contexts.length > 0 ? <fieldset disabled={login.busy}>
            <legend>¿Cómo deseas continuar?</legend>
            <button className={styles.primary} type="button" onClick={() => void login.submit('STAFF')}>Personal del hotel</button>
            <button className={styles.secondary} type="button" onClick={() => void login.submit('GUEST')}>Huésped</button>
          </fieldset> : <button className={styles.primary} type="submit" disabled={login.busy || !login.password}>Iniciar sesión</button>}
        </form>
        {login.busy && <p role="status" className={styles.status}>Verificando acceso…</p>}
        {login.error && <p role="alert" className={styles.accessError}>{login.error}</p>}
        <div className={styles.divider}><span>o</span></div>
        <a className={styles.google} href="/api/auth/guest/google" onClick={() => rememberGuestCheckoutReturn(returnTo)}>Continuar con Google</a>
        <div className={styles.guestOption}><Link className={styles.secondary} href={publicDestination}>Continuar como invitado</Link></div>
      </div>
    </div>
  </section>;
}

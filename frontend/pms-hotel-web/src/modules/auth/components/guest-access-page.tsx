"use client";
import { useEffect, useRef, useState } from 'react';
import { useStaffAccessRedirect } from '../hooks/use-staff-access-redirect';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGuestSession } from './guest-session-provider';
import { GuestSessionCheck } from './guest-session-check';
import { AuthPasswordField } from './auth-password-field';
import { AuthModeTabs, type AuthMode } from './auth-mode-tabs';
import { GuestRegistrationForm } from './guest-registration-form';
import { Modal, Button } from '@/shared/components';
import { useUnifiedLogin } from '../hooks/use-unified-login';
import { guestAccessReturn } from '../model/checkout-return';
import { clearGuestCheckoutReturn, readGuestCheckoutReturn, rememberGuestCheckoutReturn } from '../model/guest-checkout-context';
import styles from './guest-access-page.module.css';

const accessInformation = {
  recovery: { title: 'Recupera el acceso a tu cuenta', text: 'La recuperación de contraseña por correo no está disponible en este momento. Si accediste con Google, utiliza ese mismo método. Puedes seguir reservando como invitado.' },
  terms: { title: 'Términos y condiciones', text: 'Los términos y condiciones del hotel están pendientes de publicación. Consulta al hotel las condiciones antes de crear tu cuenta.' },
  privacy: { title: 'Política de privacidad', text: 'La política de privacidad del hotel está pendiente de publicación. Solicita al hotel información sobre el tratamiento de tus datos antes de enviar información personal.' },
} as const;

/** Shared presentation; login always delegates to BD1's existing BFF. */
export function GuestAccessPage({ returnTo, googleError }: { returnTo?: string; googleError?: boolean } = {}) {
  const { status, account } = useGuestSession();
  const login = useUnifiedLogin(returnTo, googleError);
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [terms, setTerms] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [information, setInformation] = useState<keyof typeof accessInformation | null>(null);
  const informationTrigger = useRef<HTMLElement | null>(null);
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
  const reservationsAccess = destination === '/mis-reservas' || destination === '/cuenta/reservas/vincular';
  function changeMode(next: AuthMode) {
    if (login.busy) return;
    login.changePassword(''); setNotice(undefined); setTerms(false); setMode(next);
  }
  function openInformation(key: keyof typeof accessInformation) {
    informationTrigger.current = document.activeElement as HTMLElement;
    setInformation(key);
  }
  function closeInformation() {
    setInformation(null); informationTrigger.current?.focus();
  }
  return <section className={`${styles.page} ${styles.authPage}`} aria-labelledby="access-title" aria-busy={login.busy}>
    <div className={styles.content}>
      <p className={styles.eyebrow}>TU PRÓXIMA ESTADÍA COMIENZA AQUÍ</p>
      <h1 id="access-title">Accede a tu cuenta</h1>
      <p>Consulta tus reservas, beneficios y preferencias. Iniciar sesión es opcional: puedes buscar y reservar sin crear una cuenta.</p>
      <div className={`${styles.card} ${styles.authCard}`}>
        <AuthModeTabs mode={mode} disabled={login.busy} onChange={changeMode} />
        <div id={`auth-panel-${mode === 'login' ? 'register' : 'login'}`} role="tabpanel"
          aria-labelledby={`auth-tab-${mode === 'login' ? 'register' : 'login'}`} hidden />
        <div id={`auth-panel-${mode}`} role="tabpanel" aria-labelledby={`auth-tab-${mode}`} tabIndex={0}>
          {mode === 'register' && <p className={styles.welcome}>Regístrate para guardar tu historial de reservas y obtener tarifas exclusivas.</p>}
          {reservationsAccess && <div className={styles.linkNotice}><strong>¿Reservaste como invitado?</strong>
            <p>Accede con el mismo correo de tu reserva. Necesitarás su referencia y un código de verificación para vincularla.</p></div>}
          <div className={styles.socialOptions}>
            <a className={styles.google} href="/api/auth/guest/google" aria-disabled={login.busy || undefined} onClick={event => {
              if (login.busy) { event.preventDefault(); return; }
              if (mode === 'register' && !terms) {
                event.preventDefault(); setNotice('Acepta los términos y la política de privacidad para continuar.');
                document.getElementById('auth-terms')?.focus(); return;
              }
              rememberGuestCheckoutReturn(returnTo);
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.6Z" />
                <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.8-2.5l-3.3-2.6c-.9.6-2.1.9-3.5.9-2.6 0-4.9-1.8-5.7-4.2H2.9v2.7A10 10 0 0 0 12 22Z" />
                <path fill="#FBBC05" d="M6.3 13.6a6 6 0 0 1 0-3.2V7.7H2.9a10 10 0 0 0 0 8.6l3.4-2.7Z" />
                <path fill="#EA4335" d="M12 6.2c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 2.9 7.7l3.4 2.7c.8-2.4 3.1-4.2 5.7-4.2Z" />
              </svg>{mode === 'register' ? 'Registrarse' : 'Continuar'} con Google
            </a>
          </div>
          <div className={styles.divider}><span>o continúa con correo</span></div>
          {mode === 'register' ? <GuestRegistrationForm email={registrationEmail} onEmailChange={value => { setRegistrationEmail(value); setNotice(undefined); }}
            terms={terms} onTermsChange={accepted => { setTerms(accepted); setNotice(undefined); }} onLegal={openInformation}
            onContinue={() => setNotice('La creación de cuentas no está disponible en este momento. Puedes acceder con Google o continuar como invitado.')} /> :
        <form className={styles.credentialsForm} onSubmit={event => { event.preventDefault(); void login.submit(); }}>
          <div className={styles.field}>
            <label htmlFor="auth-email">Correo electrónico</label>
            <input id="auth-email" name="email" type="email" autoComplete="email" placeholder="ejemplo@correo.com" required maxLength={50}
              value={login.email} onChange={event => login.changeEmail(event.target.value)} disabled={login.busy} />
          </div>
          <AuthPasswordField id="auth-password" label="Contraseña" value={login.password} onChange={login.changePassword}
            onBlur={() => {}} disabled={login.busy} autoComplete="current-password" />
          <button type="button" className={styles.recovery} disabled={login.busy} onClick={() => openInformation('recovery')}>¿Olvidaste tu contraseña?</button>
          {login.contexts.length > 0 ? <fieldset disabled={login.busy}>
            <legend>¿Cómo deseas continuar?</legend>
            <button className={styles.primary} type="button" onClick={() => void login.submit('STAFF')}>Personal del hotel</button>
            <button className={styles.secondary} type="button" onClick={() => void login.submit('GUEST')}>Huésped</button>
          </fieldset> : <button className={styles.primary} type="submit" disabled={login.busy || !login.password}>
            {login.busy && <span className={styles.spinner} aria-hidden="true" />}Iniciar sesión
          </button>}
        </form>}
        {login.busy && <p role="status" className={styles.status}>Verificando acceso…</p>}
        {(notice || (mode === 'login' && login.error)) && <p role="alert" className={styles.accessError}>{notice ?? login.error}</p>}
        </div>
        <div className={styles.guestOption}><Link className={styles.secondary} href={publicDestination}>Continuar como invitado</Link>
          <p>Al crear una cuenta podrás consultar reservas, beneficios y preferencias. La reserva pública funciona también sin cuenta.</p>
        </div>
      </div>
    </div>
    {information && <div className={styles.modalLayer}><Modal title={accessInformation[information].title} onClose={closeInformation}
      footer={<Button onClick={closeInformation}>Entendido</Button>}><p>{accessInformation[information].text}</p></Modal></div>}
  </section>;
}

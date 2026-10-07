'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPublicEnvironment } from '@/lib/env';
import { HttpNetworkError } from '@/lib/http/errors';
import { Modal, Button } from '@/shared/components';
import { useGuestSession } from './guest-session-provider';
import { GuestSessionCheck } from './guest-session-check';
import { GuestLinkedAccount } from './guest-linked-account';
import { guestAccessReturn } from '../model/checkout-return';
import { clearGuestCheckoutReturn, readGuestCheckoutReturn, rememberGuestCheckoutReturn } from '../model/guest-checkout-context';
import type { AuthMode, GuestAccessDetails } from '../model/guest-credentials';
import type { GuestAccessInput } from '../model/guest-access';
import { AuthModeTabs } from './auth-mode-tabs';
import { AuthSocialButtons, type SocialAccessProvider } from './auth-social-buttons';
import { GuestCredentialsForm } from './guest-credentials-form';
import { useLocalStaffAccess } from '../hooks/use-local-staff-access';
import styles from './guest-access-page.module.css';

const accessInformation = {
  recovery: { title: 'Recupera el acceso a tu cuenta', text: 'La recuperación de contraseña por correo no está disponible en este momento. Si accediste con Google, utiliza ese mismo método. Puedes seguir reservando como invitado.' },
  terms: { title: 'Términos y condiciones', text: 'Los términos y condiciones del hotel están pendientes de publicación. Consulta al hotel las condiciones antes de crear tu cuenta.' },
  privacy: { title: 'Política de privacidad', text: 'La política de privacidad del hotel está pendiente de publicación. Solicita al hotel información sobre el tratamiento de tus datos antes de enviar información personal.' },
} as const;

export function GuestAccessPage({ returnTo, confirmation }: { returnTo?: string; confirmation?: ReactNode } = {}) {
  const { status, account } = useGuestSession();
  if (status === 'checking' || status === 'error') return <GuestSessionCheck />;
  return getPublicEnvironment().useMockApi
    ? <MockGuestAccessPage returnTo={returnTo} confirmation={confirmation} />
    : account ? <GuestSignInRedirect returnTo={returnTo} /> : <RealGuestAccessPage returnTo={returnTo} />;
}

function GuestSignInRedirect({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    const destination = guestAccessReturn(returnTo)
      ?? (returnTo === undefined ? readGuestCheckoutReturn() : undefined) ?? '/cuenta';
    clearGuestCheckoutReturn();
    router.replace(destination);
  }, [returnTo, router]);
  return <section className={styles.page} aria-busy="true"><div className={styles.content}>
    <p role="status">Acceso correcto. Redirigiendo…</p>
  </div></section>;
}

function RealGuestAccessPage({ returnTo }: { returnTo?: string }) {
  const destination = guestAccessReturn(returnTo);
  const reservationsAccess = destination === '/mis-reservas' || destination === '/cuenta/reservas/vincular';
  return <section className={`${styles.page} ${styles.authPage}`} aria-labelledby="access-title">
    <div className={styles.content}>
        <h1 id="access-title">Accede a tu cuenta</h1>
        <p>Tu cuenta se vincula de forma segura mediante Google. También puedes reservar sin crear una cuenta.</p>
        <div className={`${styles.card} ${styles.authCard}`}>
          {reservationsAccess && <p>Accede con Google para vincular y consultar tu reserva. Necesitarás su referencia y un código enviado al correo registrado.</p>}
          <a className={styles.google} href="/api/auth/guest/google" onClick={() => rememberGuestCheckoutReturn(returnTo)}>Continuar con Google</a>
          <Link className={styles.secondary} href={reservationsAccess ? '/habitaciones' : destination ?? '/'}>Continuar como invitado</Link>
        </div>
    </div>
  </section>;
}

function MockGuestAccessPage({ returnTo, confirmation }: { returnTo?: string; confirmation?: ReactNode }) {
  const router = useRouter();
  const localStaff = useLocalStaffAccess();
  const destination = guestAccessReturn(returnTo);
  const reservationsAccess = destination === '/mis-reservas' || destination === '/cuenta/reservas/vincular';
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [terms, setTerms] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<SocialAccessProvider>();
  const [notice, setNotice] = useState<string>();
  const [information, setInformation] = useState<keyof typeof accessInformation | null>(null);
  const informationTrigger = useRef<HTMLElement | null>(null);
  const requestActive = useRef(false);
  const { account, accessMethod, signIn, isPending, error, resetError } = useGuestSession();
  const busy = isPending || localStaff.busy;

  function openInformation(key: keyof typeof accessInformation) {
    informationTrigger.current = document.activeElement as HTMLElement;
    setInformation(key);
  }
  function closeInformation() {
    setInformation(null);
    informationTrigger.current?.focus();
  }
  function changeMode(mode: AuthMode) {
    if (busy) return;
    resetError(); setNotice(undefined); setTerms(false); setAuthMode(mode);
  }
  async function access(input: GuestAccessInput): Promise<boolean> {
    if (busy || requestActive.current) return false;
    if (!getPublicEnvironment().useMockApi) {
      setNotice('El acceso a tu cuenta no está disponible en este momento. Inténtalo más tarde o continúa como invitado.');
      return false;
    }
    requestActive.current = true;
    resetError(); setNotice(undefined);
    try {
      const accepted = await signIn(input);
      return accepted;
    } finally { requestActive.current = false; setPendingProvider(undefined); }
  }
  function socialAccess(provider: SocialAccessProvider) {
    if (authMode === 'register' && !terms) {
      setNotice('Acepta los términos y la política de privacidad para continuar.');
      document.getElementById('auth-terms')?.focus();
      return;
    }
    setPendingProvider(provider);
    void access({ method: provider });
  }
  function credentialsAccess(details: GuestAccessDetails) {
    return access({ method: 'EMAIL', email: details.email,
      ...(authMode === 'register' ? { registration: { fullName: details.fullName } } : {}) });
  }

  const errorMessage = error instanceof HttpNetworkError
    ? 'No pudimos conectar. Comprueba tu conexión y vuelve a intentarlo.'
    : 'No pudimos completar el acceso. Revisa los datos o vuelve a intentarlo.';

  if (account) return authMode === 'register'
    ? confirmation ?? <GuestLinkedAccount authProvider={accessMethod === 'EMAIL' ? 'email' : 'google'} returnTo={returnTo} />
    : <GuestSignInRedirect returnTo={returnTo} />;

  return <section className={`${styles.page} ${styles.authPage}`} aria-labelledby="access-title" aria-busy={busy}>
    <div className={styles.content}>
      <p className={styles.eyebrow}>TU PRÓXIMA ESTADÍA COMIENZA AQUÍ</p>
      <h1 id="access-title">Accede a tu cuenta</h1>
      <p>Consulta tus reservas, beneficios y preferencias. Iniciar sesión es opcional: puedes buscar y reservar sin crear una cuenta.</p>
      <div className={`${styles.card} ${styles.authCard}`}>
        <AuthModeTabs mode={authMode} disabled={busy} onChange={changeMode} />
        <div id={`auth-panel-${authMode === 'login' ? 'register' : 'login'}`} role="tabpanel"
          aria-labelledby={`auth-tab-${authMode === 'login' ? 'register' : 'login'}`} hidden />
        <div id={`auth-panel-${authMode}`} role="tabpanel" aria-labelledby={`auth-tab-${authMode}`} tabIndex={0}>
          {authMode === 'register' && <p className={styles.welcome}>Regístrate para guardar tu historial de reservas y obtener tarifas exclusivas.</p>}
          {reservationsAccess && <div className={styles.linkNotice}><strong>¿Reservaste como invitado?</strong><p>Accede con el mismo correo de tu reserva. Necesitarás su referencia y un código de verificación para vincularla.</p></div>}
          <AuthSocialButtons mode={authMode} disabled={busy} pendingProvider={isPending ? pendingProvider : undefined} onAccess={socialAccess} />
          <div className={styles.divider}><span>o continúa con correo</span></div>
          <GuestCredentialsForm key={authMode} mode={authMode} busy={busy} email={email} terms={terms}
            onTermsChange={accepted => { setTerms(accepted); setNotice(undefined); }}
            onEmailChange={value => { setEmail(value); resetError(); localStaff.resetError(); setNotice(undefined); }}
            onLocalStaffAccess={localStaff.enabled ? async (email, password) => {
              const accepted = await localStaff.signIn(email, password);
              if (accepted) router.replace('/dashboard');
              return accepted;
            } : undefined}
            onSubmit={credentialsAccess} onRecovery={() => openInformation('recovery')} onLegal={openInformation} />
          {busy && <p className={styles.status} role="status">Verificando acceso…</p>}
          {(error || notice || localStaff.error) && <p id="access-error" className={styles.accessError} role="alert">{localStaff.error ?? notice ?? errorMessage}</p>}
        </div>
        <div className={styles.guestOption}>
          <Link className={styles.secondary} href={reservationsAccess ? '/habitaciones' : destination ?? '/'}>Continuar como invitado</Link>
          <p>Al crear una cuenta podrás consultar reservas, beneficios y preferencias. La reserva pública funciona también sin cuenta.</p>
        </div>
      </div>
    </div>
    {information && <div className={styles.modalLayer}><Modal title={accessInformation[information].title} onClose={closeInformation}
      footer={<Button onClick={closeInformation}>Entendido</Button>}><p>{accessInformation[information].text}</p></Modal></div>}
  </section>;
}

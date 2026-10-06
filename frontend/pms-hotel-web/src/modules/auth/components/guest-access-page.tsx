'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPublicEnvironment } from '@/lib/env';
import { HttpNetworkError } from '@/lib/http/errors';
import { Modal, Button } from '@/shared/components';
import { useGuestSession } from './guest-session-provider';
import { GuestSessionCheck } from './guest-session-check';
import { guestAccessReturn } from '../model/checkout-return';
import type { AuthMode, GuestAccessDetails } from '../model/guest-credentials';
import type { GuestAccessInput } from '../model/guest-access';
import { AuthModeTabs } from './auth-mode-tabs';
import { AuthSocialButtons, type SocialAccessProvider } from './auth-social-buttons';
import { GuestCredentialsForm } from './guest-credentials-form';
import styles from './guest-access-page.module.css';

const accessInformation = {
  recovery: { title: 'Recupera el acceso a tu cuenta', text: 'La recuperación de contraseña por correo no está disponible en este momento. Si accediste con Google, utiliza ese mismo método. Puedes seguir reservando como invitado.' },
  terms: { title: 'Términos y condiciones', text: 'Los términos y condiciones del hotel están pendientes de publicación. Consulta al hotel las condiciones antes de crear tu cuenta.' },
  privacy: { title: 'Política de privacidad', text: 'La política de privacidad del hotel está pendiente de publicación. Solicita al hotel información sobre el tratamiento de tus datos antes de enviar información personal.' },
} as const;

export function GuestAccessPage({ returnTo }: { returnTo?: string } = {}) {
  const { status } = useGuestSession();
  if (status === 'checking' || status === 'error') return <GuestSessionCheck />;
  return getPublicEnvironment().useMockApi
    ? <MockGuestAccessPage returnTo={returnTo} />
    : <RealGuestAccessPage returnTo={returnTo} />;
}

function RealGuestAccessPage({ returnTo }: { returnTo?: string }) {
  const destination = guestAccessReturn(returnTo);
  const reservationsAccess = destination === '/mis-reservas';
  const { account, signOut, isPending, error } = useGuestSession();
  return <section className={`${styles.page} ${styles.authPage}`} aria-labelledby={account ? 'access-success-title' : 'access-title'} aria-busy={isPending}>
    <div className={styles.content}>
      {account ? <>
        <h1 id="access-success-title">Tu cuenta está lista</h1>
        <p>Tu sesión está iniciada. Puedes consultar tu cuenta o continuar reservando.</p>
        <div className={`${styles.card} ${styles.authCard}`}>
          <p>{account.email ?? 'Cuenta de huésped'}</p>
          <Link className={styles.primary} href="/cuenta">Ir a mi cuenta</Link>
          <Link className={styles.secondary} href={destination ?? '/'}>{reservationsAccess ? 'Ir a Mis reservas' : destination ? 'Continuar mi reserva' : 'Continuar reservando'}</Link>
          <button className={styles.secondary} type="button" disabled={isPending} onClick={() => void signOut()}>{isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
          {error && <p role="alert">No se pudo cerrar la sesión. Inténtalo nuevamente.</p>}
        </div>
      </> : <>
        <h1 id="access-title">Accede a tu cuenta</h1>
        <p>Tu cuenta se vincula de forma segura mediante Google. También puedes reservar sin crear una cuenta.</p>
        <div className={`${styles.card} ${styles.authCard}`}>
          {reservationsAccess && <p>Accede con Google para vincular y consultar tu reserva. Necesitarás su referencia y un código enviado al correo registrado.</p>}
          <a className={styles.google} href="/api/auth/guest/google">Continuar con Google</a>
          <Link className={styles.secondary} href={reservationsAccess ? '/habitaciones' : destination ?? '/'}>Continuar como invitado</Link>
        </div>
      </>}
    </div>
  </section>;
}

function MockGuestAccessPage({ returnTo }: { returnTo?: string }) {
  const destination = guestAccessReturn(returnTo);
  const reservationsAccess = destination === '/mis-reservas';
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [terms, setTerms] = useState(false);
  const [completion, setCompletion] = useState<AuthMode | null>(null);
  const [pendingProvider, setPendingProvider] = useState<SocialAccessProvider>();
  const [notice, setNotice] = useState<string>();
  const [information, setInformation] = useState<keyof typeof accessInformation | null>(null);
  const informationTrigger = useRef<HTMLElement | null>(null);
  const requestActive = useRef(false);
  const { account, signIn, signOut, isPending, error, resetError } = useGuestSession();
  const busy = isPending || completion !== null;

  useEffect(() => {
    if (!completion || !account) return;
    const timeout = window.setTimeout(() => router.replace(destination ?? '/mis-reservas'), 900);
    return () => window.clearTimeout(timeout);
  }, [completion, account, destination, router]);

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
      if (accepted) { setCompletion(authMode); setEmail(''); }
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

  if (account) return <section className={`${styles.page} ${styles.authPage}`} aria-labelledby="access-success-title">
    <div className={styles.content}>
      <div className={styles.successMark} aria-hidden="true">✓</div>
      <h1 id="access-success-title">{completion === 'register' ? 'Tu cuenta está creada' : 'Tu cuenta está lista'}</h1>
      <p role="status">{completion ? 'Ya puedes continuar. Te estamos redirigiendo…' : 'Tu sesión está iniciada. Puedes consultar tus reservas o continuar reservando.'}</p>
      <div className={`${styles.card} ${styles.authCard} ${styles.successCard}`}>
        <p>{account.email ?? 'Cuenta de huésped'}</p>
        <Link className={styles.primary} href={destination ?? '/mis-reservas'}>{destination && !reservationsAccess ? 'Continuar mi reserva' : 'Ir a Mis reservas'}</Link>
        <Link className={styles.secondary} href="/cuenta">Ir a mi cuenta</Link>
        <button className={styles.recovery} type="button" disabled={isPending} onClick={() => { setCompletion(null); void signOut(); }}>Cerrar sesión</button>
      </div>
    </div>
  </section>;

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
          {reservationsAccess && <div className={styles.linkNotice}><strong>¿Reservaste como invitado?</strong><p>Accede con Google para vincular y consultar tu reserva. Necesitarás su referencia y un código enviado al correo registrado.</p></div>}
          <AuthSocialButtons mode={authMode} disabled={busy} pendingProvider={isPending ? pendingProvider : undefined} onAccess={socialAccess} />
          <div className={styles.divider}><span>o continúa con correo</span></div>
          <GuestCredentialsForm key={authMode} mode={authMode} busy={busy} email={email} terms={terms}
            onTermsChange={accepted => { setTerms(accepted); setNotice(undefined); }}
            onEmailChange={value => { setEmail(value); resetError(); setNotice(undefined); }}
            onSubmit={credentialsAccess} onRecovery={() => openInformation('recovery')} onLegal={openInformation} />
          {isPending && <p className={styles.status} role="status">Verificando acceso…</p>}
          {(error || notice) && <p id="access-error" className={styles.accessError} role="alert">{notice ?? errorMessage}</p>}
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

'use client';

import { useRef, useState, type FormEvent } from 'react';
import { passwordStrength, validateGuestCredentials, type AuthMode, type CredentialField, type GuestAccessDetails, type GuestCredentials } from '../model/guest-credentials';
import { AuthPasswordField } from './auth-password-field';
import styles from './guest-access-page.module.css';

export function GuestCredentialsForm({ mode, busy, email, onEmailChange, terms, onTermsChange, onSubmit, onRecovery, onLegal }: {
  mode: AuthMode; busy: boolean; email: string; onEmailChange: (email: string) => void;
  terms: boolean; onTermsChange: (accepted: boolean) => void;
  onSubmit: (details: GuestAccessDetails) => Promise<boolean>;
  onRecovery: () => void; onLegal: (policy: 'terms' | 'privacy') => void;
}) {
  // Credentials are transient input state. They never enter a service, session, query cache or storage.
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fullName, setFullName] = useState('');
  const [marketing, setMarketing] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<CredentialField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const register = mode === 'register';
  const values: GuestCredentials = { fullName, email, password, confirmation, terms, marketing };
  const errors = validateGuestCredentials(mode, values);
  const visibleError = (field: CredentialField) => submitted || touched[field] ? errors[field] : undefined;
  const touch = (field: CredentialField) => setTouched(current => ({ ...current, [field]: true }));
  const strength = passwordStrength(password);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitting.current) return;
    setSubmitted(true);
    if (Object.keys(errors).length) {
      const field = (['fullName', 'email', 'password', 'confirmation', 'terms'] as const).find(name => errors[name]);
      if (field) formRef.current?.querySelector<HTMLInputElement>(`#auth-${field}`)?.focus();
      return;
    }
    submitting.current = true;
    try {
      if (await onSubmit({ fullName: fullName.trim(), email: email.trim(), terms, marketing })) {
        setPassword('');
        setConfirmation('');
      }
    } finally { submitting.current = false; }
  }

  return <form ref={formRef} className={styles.credentialsForm} onSubmit={submit} noValidate aria-label={register ? 'Crear cuenta con correo' : 'Acceder con correo'}>
    {register && <div className={styles.field}>
      <label htmlFor="auth-fullName">Nombre completo</label>
      <input id="auth-fullName" name="fullName" autoComplete="name" type="text" placeholder="Ej. Alan Palacios" required maxLength={150}
        value={fullName} onChange={event => setFullName(event.target.value)} onBlur={() => touch('fullName')} disabled={busy}
        aria-invalid={!!visibleError('fullName')} aria-describedby={visibleError('fullName') ? 'auth-fullName-error' : undefined} />
      {visibleError('fullName') && <p id="auth-fullName-error" className={styles.fieldError}>{errors.fullName}</p>}
    </div>}
    <div className={styles.field}>
      <label htmlFor="auth-email">Correo electrónico</label>
      <input id="auth-email" name="email" autoComplete="email" type="email" inputMode="email" placeholder="ejemplo@correo.com" required maxLength={254}
        value={email} onChange={event => onEmailChange(event.target.value)} onBlur={() => touch('email')} disabled={busy}
        aria-invalid={!!visibleError('email')} aria-describedby={visibleError('email') ? 'auth-email-error' : undefined} />
      {visibleError('email') && <p id="auth-email-error" className={styles.fieldError}>{errors.email}</p>}
    </div>
    <AuthPasswordField id="auth-password" label="Contraseña" value={password} onChange={setPassword} onBlur={() => touch('password')}
      error={visibleError('password')} disabled={busy} autoComplete={register ? 'new-password' : 'current-password'} hintId={register ? 'password-strength' : undefined} />
    {register ? <>
      <div className={styles.strength} id="password-strength">
        <div className={styles.strengthTrack} role="meter" aria-label="Fortaleza de contraseña" aria-valuemin={0} aria-valuemax={3} aria-valuenow={strength.level} aria-valuetext={strength.label}>
          <span data-strength={strength.level} style={{ width: `${strength.level / 3 * 100}%` }} />
        </div>
        <span>{strength.label}</span>
      </div>
      <AuthPasswordField id="auth-confirmation" label="Confirmar contraseña" value={confirmation} onChange={setConfirmation}
        onBlur={() => touch('confirmation')} error={visibleError('confirmation')} disabled={busy} autoComplete="new-password" />
      <div className={styles.consents}>
        <div><label className={styles.checkboxLabel}>
          <input id="auth-terms" name="terms" type="checkbox" checked={terms} onChange={event => { onTermsChange(event.target.checked); touch('terms'); }} disabled={busy} required
            aria-invalid={!!visibleError('terms')} aria-describedby={visibleError('terms') ? 'auth-terms-error' : undefined} />
          <span>Acepto los Términos y Condiciones y la Política de Privacidad de Hotel Boutique.</span>
        </label>
        <div className={styles.legalLinks}><button type="button" onClick={() => onLegal('terms')}>Leer términos</button><span aria-hidden="true">·</span><button type="button" onClick={() => onLegal('privacy')}>Leer política de privacidad</button></div>
        {visibleError('terms') && <p id="auth-terms-error" className={styles.fieldError}>{errors.terms}</p>}</div>
        <label className={styles.checkboxLabel}><input name="marketing" type="checkbox" checked={marketing} onChange={event => setMarketing(event.target.checked)} disabled={busy} />
          <span>Deseo recibir ofertas especiales y promociones por correo electrónico (opcional).</span></label>
      </div>
    </> : <button type="button" className={styles.recovery} disabled={busy} onClick={onRecovery}>¿Olvidaste tu contraseña?</button>}
    <button className={`${styles.primary} ${register ? styles.registerAction : ''}`} disabled={busy} type="submit">
      {busy ? <><span className={styles.spinner} aria-hidden="true" />Procesando…</> : register ? 'Crear mi cuenta' : 'Iniciar sesión'}
    </button>
  </form>;
}

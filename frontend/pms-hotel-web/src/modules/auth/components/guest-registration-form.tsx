'use client';

import { useRef, useState, type FormEvent } from 'react';
import { passwordStrength, registrationErrors, type RegistrationField } from '../model/guest-registration';
import { AuthPasswordField } from './auth-password-field';
import styles from './guest-access-page.module.css';

/** Registration presentation only. No credential transport until BD1 confirms the API. */
export function GuestRegistrationForm({ email, onEmailChange, terms, onTermsChange, onContinue, onLegal }: {
  email: string; onEmailChange: (value: string) => void; terms: boolean; onTermsChange: (value: boolean) => void;
  onContinue: () => void; onLegal: (policy: 'terms' | 'privacy') => void;
}) {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [marketing, setMarketing] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<RegistrationField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = registrationErrors({ fullName, email, password, confirmation, terms });
  const visibleError = (field: RegistrationField) => submitted || touched[field] ? errors[field] : undefined;
  const touch = (field: RegistrationField) => setTouched(current => ({ ...current, [field]: true }));
  const strength = passwordStrength(password);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitted(true);
    const field = (['fullName', 'email', 'password', 'confirmation', 'terms'] as const).find(name => errors[name]);
    if (field) { formRef.current?.querySelector<HTMLInputElement>(`#auth-${field}`)?.focus(); return; }
    onContinue();
  }

  return <form ref={formRef} className={styles.credentialsForm} onSubmit={submit} noValidate aria-label="Crear cuenta con correo">
    <div className={styles.field}>
      <label htmlFor="auth-fullName">Nombre completo</label>
      <input id="auth-fullName" name="fullName" autoComplete="name" type="text" placeholder="Ej. Alan Palacios" required maxLength={150}
        value={fullName} onChange={event => setFullName(event.target.value)} onBlur={() => touch('fullName')}
        aria-invalid={!!visibleError('fullName')} aria-describedby={visibleError('fullName') ? 'auth-fullName-error' : undefined} />
      {visibleError('fullName') && <p id="auth-fullName-error" className={styles.fieldError}>{errors.fullName}</p>}
    </div>
    <div className={styles.field}>
      <label htmlFor="auth-email">Correo electrónico</label>
      <input id="auth-email" name="email" autoComplete="email" type="email" placeholder="ejemplo@correo.com" required maxLength={254}
        value={email} onChange={event => onEmailChange(event.target.value)} onBlur={() => touch('email')}
        aria-invalid={!!visibleError('email')} aria-describedby={visibleError('email') ? 'auth-email-error' : undefined} />
      {visibleError('email') && <p id="auth-email-error" className={styles.fieldError}>{errors.email}</p>}
    </div>
    <AuthPasswordField id="auth-password" label="Contraseña" value={password} onChange={setPassword}
      onBlur={() => touch('password')} error={visibleError('password')} disabled={false} autoComplete="new-password" hintId="password-strength" />
    <div className={styles.strength} id="password-strength">
      <div className={styles.strengthTrack} role="meter" aria-label="Fortaleza de contraseña" aria-valuemin={0} aria-valuemax={3}
        aria-valuenow={strength.level} aria-valuetext={strength.label}>
        <span data-strength={strength.level} style={{ width: `${strength.level / 3 * 100}%` }} />
      </div><span>{strength.label}</span>
    </div>
    <AuthPasswordField id="auth-confirmation" label="Confirmar contraseña" value={confirmation} onChange={setConfirmation}
      onBlur={() => touch('confirmation')} error={visibleError('confirmation')} disabled={false} autoComplete="new-password" />
    <div className={styles.consents}>
      <div><label className={styles.checkboxLabel}>
        <input id="auth-terms" name="terms" type="checkbox" checked={terms} required
          onChange={event => { onTermsChange(event.target.checked); touch('terms'); }}
          aria-invalid={!!visibleError('terms')} aria-describedby={visibleError('terms') ? 'auth-terms-error' : undefined} />
        <span>Acepto los Términos y Condiciones y la Política de Privacidad de Hotel Boutique.</span>
      </label>
      <div className={styles.legalLinks}><button type="button" onClick={() => onLegal('terms')}>Leer términos</button>
        <span aria-hidden="true">·</span><button type="button" onClick={() => onLegal('privacy')}>Leer política de privacidad</button></div>
      {visibleError('terms') && <p id="auth-terms-error" className={styles.fieldError}>{errors.terms}</p>}</div>
      <label className={styles.checkboxLabel}><input name="marketing" type="checkbox" checked={marketing} onChange={event => setMarketing(event.target.checked)} />
        <span>Deseo recibir ofertas especiales y promociones por correo electrónico (opcional).</span></label>
    </div>
    <button className={`${styles.primary} ${styles.registerAction}`} type="submit">Crear mi cuenta</button>
  </form>;
}

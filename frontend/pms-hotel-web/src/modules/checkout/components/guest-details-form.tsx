'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useGuestSession } from '@/modules/auth';
import { publicGuestDataHref, type BookingSearchCriteria } from '@/modules/booking';
import { Button } from '@/shared/components';
import { callingCodes, countries, normalizeGuest, validateGuest, type GuestField } from '../domain/guest-details';
import { publicCheckoutReviewHref } from '../domain/checkout-navigation';
import { useCheckoutDraft } from './checkout-draft-provider';
import { GuestProfilePrefill } from './guest-profile-prefill';
import type { BookingReview } from './checkout-availability-gate';
import styles from './public-guest-data-page.module.css';

export function GuestDetailsForm({ review, criteria }: { review: BookingReview; criteria: Partial<BookingSearchCriteria> }) {
  const { guest, update, approve } = useCheckoutDraft(review.scope);
  const { account } = useGuestSession();
  const [touched, setTouched] = useState<Partial<Record<GuestField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [rejectedPhone, setRejectedPhone] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const pending = useRef(false);
  const [editedFields, setEditedFields] = useState<ReadonlySet<GuestField>>(() => new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const router = useRouter();
  const errors = validateGuest(guest);
  if (rejectedPhone) errors.phone = 'Ingresa solo dígitos en el teléfono.';
  const busy = processing || navigating;
  useEffect(() => () => { clearTimeout(timer.current); }, []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !review.ready || !review.prices.allValid) return;
    setSubmitted(true);
    const firstError = Object.keys(errors)[0];
    if (firstError) { (event.currentTarget.elements.namedItem(firstError) as HTMLElement | null)?.focus(); return; }
    update(normalizeGuest(guest));
    pending.current = true;
    setProcessing(true);
    // Presentation transition only: no account, reservation or payment mutation.
    timer.current = setTimeout(() => {
      approve(review.selectionKey);
      startNavigation(() => router.push(publicCheckoutReviewHref(criteria)));
      pending.current = false;
      setProcessing(false);
    }, 350);
  }
  const fieldProps = (field: GuestField) => ({
    id: `guest-${field}`, name: field, value: guest[field], disabled: busy,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setEditedFields(previous => new Set(previous).add(field));
      if (field === 'phone') {
        setRejectedPhone(!/^\d*$/.test(event.target.value));
        if (!/^\d*$/.test(event.target.value)) { setTouched(previous => ({ ...previous, phone: true })); return; }
      }
      update({ [field]: event.target.value });
    },
    onBlur: () => setTouched(previous => ({ ...previous, [field]: true })),
    'aria-invalid': Boolean((submitted || touched[field]) && errors[field]),
    'aria-describedby': `guest-${field}-hint${(submitted || touched[field]) && errors[field] ? ` guest-${field}-error` : ''}`,
  });
  const errorFor = (field: GuestField) => (submitted || touched[field]) && errors[field] ? <span className={styles.fieldError} id={`guest-${field}-error`} role="alert">{errors[field]}</span> : null;
  return <section className={styles.card} aria-labelledby="contact-title"><h2 id="contact-title">Información personal</h2>
    {account ? <GuestProfilePrefill guest={guest} editedFields={editedFields} onFill={patch => { if (!busy) update(patch); }} /> :
      <div className={styles.loginBanner}><span>¿Ya tienes una cuenta?</span><Link href={`/acceso?returnTo=${encodeURIComponent(publicGuestDataHref(criteria))}`}>Inicia sesión para autocompletar tus datos <span aria-hidden="true">↗</span></Link></div>}
    <form noValidate onSubmit={submit} aria-busy={busy}>
      <div className={styles.fields}>
        <div className={styles.field}><label htmlFor="guest-firstName">Nombre *</label><input {...fieldProps('firstName')} required autoComplete="given-name" maxLength={50} placeholder="Ej. Carlos" /><small id="guest-firstName-hint">Tal como aparece en tu documento oficial.</small>{errorFor('firstName')}</div>
        <div className={styles.field}><label htmlFor="guest-lastName">Apellidos *</label><input {...fieldProps('lastName')} required autoComplete="family-name" maxLength={60} placeholder="Ej. Mendoza Pérez" /><small id="guest-lastName-hint">Incluye tus apellidos completos.</small>{errorFor('lastName')}</div>
        <div className={styles.field}><label htmlFor="guest-email">Correo electrónico *</label><input {...fieldProps('email')} required type="email" autoComplete="email" maxLength={120} placeholder="ejemplo@correo.com" /><small id="guest-email-hint">Enviaremos la confirmación y el comprobante a esta dirección cuando completes la reserva.</small>{errorFor('email')}</div>
        <div className={styles.field}><label htmlFor="guest-phone">Teléfono *</label><div className={styles.phoneGroup}><input name="phoneCode" type="tel" autoComplete="tel-country-code" list="guest-phone-codes" maxLength={4} aria-label="Código de país del teléfono" aria-invalid={Boolean((submitted || touched.phone) && errors.phone)} value={guest.phoneCode} disabled={busy} onChange={event => update({ phoneCode: event.target.value })} /><datalist id="guest-phone-codes">{callingCodes.map(value => <option key={value.code} value={value.code}>{value.label}</option>)}</datalist><input {...fieldProps('phone')} required type="tel" autoComplete="tel-national" maxLength={guest.phoneCode === '+502' ? 8 : 15} inputMode="numeric" pattern="[0-9]*" placeholder="55555555" /></div><small id="guest-phone-hint">Selecciona o escribe el código de país e ingresa tu número.</small>{errorFor('phone')}</div>
        <div className={styles.field}><label htmlFor="guest-country">País / región *</label><select {...fieldProps('country')} required autoComplete="country"><option value="">Selecciona un país</option>{countries.map(value => <option key={value.code} value={value.code}>{value.label}</option>)}</select><small id="guest-country-hint">País de residencia.</small>{errorFor('country')}</div>
        <div className={styles.field}><label htmlFor="guest-document">Documento de identificación *</label><input {...fieldProps('document')} required maxLength={25} autoComplete="off" placeholder="DPI, pasaporte o documento nacional" /><small id="guest-document-hint">Agiliza tu proceso de check-in a tu llegada.</small>{errorFor('document')}</div>
      </div>
      <div className={`${styles.field} ${styles.requests}`}><label htmlFor="guest-specialRequests">Solicitudes especiales</label><textarea {...fieldProps('specialRequests')} maxLength={250} rows={4} placeholder="Ej. Llegada tardía (después de las 20:00 h), preferencia de cama, piso alto, alergias o accesibilidad reducida." /><div className={styles.textareaFooter}><small id="guest-specialRequests-hint">Sujetas a disponibilidad del hotel.</small><small aria-label="Caracteres de solicitudes especiales">{guest.specialRequests.length}/250</small></div>{errorFor('specialRequests')}</div>
      <p className={styles.small}>* Campos obligatorios. Verificaremos el formato de tu información antes de continuar.</p>
      <div className={styles.formFooter}><p>Puedes continuar como invitado.<br />Estos datos no crean una cuenta.</p><Button type="submit" className={styles.continue} isLoading={busy} loadingText="Procesando…" disabled={!review.ready}>Revisar mi reserva <span aria-hidden="true">→</span></Button></div>
    </form>
  </section>;
}

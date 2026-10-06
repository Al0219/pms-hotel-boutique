'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useGuestSession } from '@/modules/auth';
import { HttpNetworkError, HttpStatusError } from '@/lib/http/errors';
import { Button } from '@/shared/components';
import { useReservationLink } from '../hooks/use-reservation-link';
import { otpError, referenceError } from '../model/reservation-link';
import styles from './reservation-link-form.module.css';

export function ReservationLinkForm() {
  const { account } = useGuestSession();
  const link = useReservationLink();
  const [reference, setReference] = useState('');
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState<string>();
  const otpInput = useRef<HTMLInputElement>(null);
  const referenceInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (link.challenge) otpInput.current?.focus(); }, [link.challenge]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (link.isPending) return;
    const error = link.challenge ? otpError(otp) : referenceError(reference);
    setLocalError(error);
    if (error) { (link.challenge ? otpInput : referenceInput).current?.focus(); return; }
    if (link.challenge) void link.confirm(otp); else void link.request(reference);
  }
  function restart() { link.reset(); setReference(''); setOtp(''); setLocalError(undefined); requestAnimationFrame(() => referenceInput.current?.focus()); }
  const errorMessage = link.error instanceof HttpNetworkError ? 'Sin conexión. Conservamos tu referencia; vuelve a intentarlo.' :
    link.error instanceof HttpStatusError && link.error.status === 410 ? 'El código venció. Solicita uno nuevo.' :
    link.error instanceof HttpStatusError && link.error.status === 429 ? 'Se agotaron los intentos de este código. Solicita uno nuevo.' :
    link.error instanceof HttpStatusError && link.error.status === 422 ? 'No pudimos verificar la reserva. Revisa el código, la referencia y el correo de tu cuenta.' : 'No pudimos completar la vinculación. Inténtalo de nuevo.';
  return <section className={styles.card} aria-labelledby="reservation-link-title"><div className={styles.intro}><span className={styles.eyebrow}>RESERVASTE COMO INVITADO</span><h2 id="reservation-link-title">Vincula tu reserva</h2><p>Consulta una reserva anterior desde tu cuenta. Necesitarás su referencia y verificar el correo que utilizaste al reservar.</p></div>
    {!account?.externalIdentities.some(identity => identity.provider === 'GOOGLE') ? <div className={styles.notice}><p>Para vincular una reserva, continúa con Google usando el mismo correo de la reserva.</p><Link href="/acceso?returnTo=%2Fmis-reservas">Acceder con Google →</Link></div> : <>
      {link.linked ? <div className={styles.success} role="status"><strong>Reserva {link.linked.reservationId} vinculada.</strong><p>Ya puedes consultarla en el listado. También puedes vincular otra reserva.</p><Button type="button" onClick={restart}>Vincular otra reserva</Button></div> : <form onSubmit={submit} noValidate aria-busy={link.isPending}>
        {link.challenge ? <><p className={styles.notice}>Ingresa el código de verificación correspondiente a <strong>{reference}</strong>. Revisa el correo que utilizaste al reservar.</p><label htmlFor="reservation-link-otp">Código de verificación</label><input ref={otpInput} id="reservation-link-otp" name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={otp} disabled={link.isPending} aria-invalid={Boolean(localError)} aria-describedby="reservation-link-help reservation-link-error" onChange={event => { setOtp(event.target.value); if (localError) setLocalError(otpError(event.target.value)); link.clearError(); }} placeholder="8 dígitos" />
          <small id="reservation-link-help">El código vence a las {new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit' }).format(new Date(link.challenge.expiresAt))}.</small></> : <>
          <label htmlFor="reservation-link-reference">Referencia de reserva</label><input ref={referenceInput} id="reservation-link-reference" name="reference" autoComplete="off" maxLength={16} value={reference} disabled={link.isPending} aria-invalid={Boolean(localError)} aria-describedby="reservation-link-help reservation-link-error" onChange={event => { setReference(event.target.value); if (localError) setLocalError(referenceError(event.target.value)); link.clearError(); }} placeholder="Ej. HB-2026-10420" /><small id="reservation-link-help">Encontrarás la referencia en el correo de confirmación. Cuenta actual: {account.email}.</small></>}
        <div id="reservation-link-error">{localError && <p role="alert" className={styles.error}>{localError}</p>}{link.error && <p role="alert" className={styles.error}>{errorMessage}</p>}</div>
        <Button type="submit" className={styles.primary} isLoading={link.isPending} loadingText={link.challenge ? 'Verificando…' : 'Solicitando código…'}>{link.challenge ? 'Verificar y vincular reserva' : 'Solicitar código de verificación'}</Button>
        {link.challenge && <div className={styles.actions}><button type="button" disabled={link.isPending} onClick={() => { setOtp(''); setLocalError(undefined); void link.request(reference); }}>Reenviar código</button><button type="button" disabled={link.isPending} onClick={restart}>Cambiar referencia</button></div>}
      </form>}
    </>}
  </section>;
}

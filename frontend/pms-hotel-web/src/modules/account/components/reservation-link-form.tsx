'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useGuestSession } from '@/modules/auth';
import { getPublicEnvironment } from '@/lib/env';
import { HttpNetworkError, HttpStatusError } from '@/lib/http/errors';
import { Button } from '@/shared/components';
import { useReservationLink } from '../hooks/use-reservation-link';
import { otpError, referenceError } from '../model/reservation-link';
import styles from './reservation-link-form.module.css';

export function ReservationLinkForm({ standalone = false }: { standalone?: boolean } = {}) {
  const { account } = useGuestSession();
  const mockMode = getPublicEnvironment().useMockApi;
  const link = useReservationLink();
  const [reference, setReference] = useState('');
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState<string>();
  const otpInput = useRef<HTMLInputElement>(null);
  const referenceInput = useRef<HTMLInputElement>(null);
  const successTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (link.challenge) otpInput.current?.focus(); }, [link.challenge]);
  useEffect(() => { if (link.linked) successTitle.current?.focus(); }, [link.linked]);
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
  const step = link.linked ? 3 : link.challenge ? 2 : 1;
  return <section className={`${styles.card} ${standalone ? styles.standalone : ''}`} aria-labelledby="reservation-link-title"><div className={styles.intro}><span className={styles.eyebrow}>RESERVASTE COMO INVITADO</span><h2 id="reservation-link-title">{standalone ? 'Encuentra tu reserva' : 'Vincula tu reserva'}</h2><p>Necesitarás su referencia y verificar el correo que utilizaste al reservar.</p></div>
    {!mockMode ? <div className={styles.notice} role="status"><p>La vinculación no está disponible en este momento. Tu sesión y tus reservas permanecen intactas.</p><Link href="/cuenta">Volver a mi cuenta →</Link></div> : !account ? <div className={styles.notice}><p>Inicia sesión para vincular una reserva a tu cuenta.</p><Link href="/acceso?returnTo=%2Fcuenta%2Freservas%2Fvincular">Iniciar sesión →</Link></div> : <>
      {standalone && <ol className={styles.steps} aria-label="Proceso de vinculación">{['Referencia', 'Verificación', 'Vinculada'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} data-completed={step > index + 1}><span aria-hidden="true">{step > index + 1 ? '✓' : index + 1}</span>{label}</li>)}</ol>}
      {link.linked ? <div className={styles.success} role="status"><span className={styles.successIcon} aria-hidden="true">✓</span><h3 ref={successTitle} tabIndex={-1}>Reserva {link.linked.reservationId} vinculada.</h3><p>Ya puedes consultarla en tu cuenta. También puedes vincular otra reserva.</p><Link className={styles.viewReservations} href="/mis-reservas">Ver mis reservas →</Link><Button type="button" onClick={restart}>Vincular otra reserva</Button></div> : <form onSubmit={submit} noValidate aria-busy={link.isPending}>
        {link.challenge ? <><p className={styles.notice}>Ingresa el código de verificación correspondiente a <strong>{reference}</strong>. Revisa el correo que utilizaste al reservar.</p><label htmlFor="reservation-link-otp">Código de verificación</label><input ref={otpInput} id="reservation-link-otp" name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={otp} disabled={link.isPending} aria-invalid={Boolean(localError)} aria-describedby="reservation-link-help reservation-link-error" onChange={event => { setOtp(event.target.value); if (localError) setLocalError(otpError(event.target.value)); link.clearError(); }} placeholder="8 dígitos" />
          <small id="reservation-link-help">El código vence a las {new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit' }).format(new Date(link.challenge.expiresAt))}.</small></> : <>
          <label htmlFor="reservation-link-reference">Referencia de reserva</label><input ref={referenceInput} id="reservation-link-reference" name="reference" autoComplete="off" maxLength={16} value={reference} disabled={link.isPending} aria-invalid={Boolean(localError)} aria-describedby="reservation-link-help reservation-link-error" onChange={event => { setReference(event.target.value); if (localError) setLocalError(referenceError(event.target.value)); link.clearError(); }} placeholder="Ej. HB-2026-10420" /><small id="reservation-link-help">Encontrarás la referencia en el correo de confirmación. Cuenta actual: {account?.email}.</small></>}
        <div id="reservation-link-error">{localError && <p role="alert" className={styles.error}>{localError}</p>}{link.error && <p role="alert" className={styles.error}>{errorMessage}</p>}</div>
        <Button type="submit" className={styles.primary} isLoading={link.isPending} loadingText={link.challenge ? 'Verificando…' : 'Solicitando código…'}>{link.challenge ? 'Verificar y vincular reserva' : 'Solicitar código de verificación'}</Button>
        {link.challenge && <div className={styles.actions}><button type="button" disabled={link.isPending} onClick={() => { setOtp(''); setLocalError(undefined); void link.request(reference); }}>Reenviar código</button><button type="button" disabled={link.isPending} onClick={restart}>Cambiar referencia</button></div>}
      </form>}
      {standalone && <p className={styles.security}>Tu referencia por sí sola no permite acceder a la reserva. La vinculación requiere verificar el código.</p>}
    </>}
  </section>;
}

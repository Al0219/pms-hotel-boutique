'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useGuestSession } from '@/modules/auth';
import { Button } from '@/shared/components';
import { HttpStatusError } from '@/lib/http';
import { useRealReservationLink } from '../hooks/use-real-reservation-link';
import { otpError, referenceError } from '../model/reservation-link';
import styles from './reservation-link-form.module.css';

export function RealReservationLinkForm({ standalone = false }: { standalone?: boolean }) {
  const { account, sessionId } = useGuestSession();
  return account ? <LinkForm key={`${account.id}:${sessionId}`} standalone={standalone} /> : <p>Inicia sesión para vincular una reserva a tu cuenta.</p>;
}
function LinkForm({ standalone }: { standalone: boolean }) {
  const { account } = useGuestSession(); const link = useRealReservationLink();
  const [reference, setReference] = useState(''), [otp, setOtp] = useState(''), [error, setError] = useState<string>();
  const [clock, setClock] = useState(() => Date.now());
  const referenceInput = useRef<HTMLInputElement>(null), otpInput = useRef<HTMLInputElement>(null), success = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (link.challenge) otpInput.current?.focus(); }, [link.challenge]);
  useEffect(() => { if (link.linked) success.current?.focus(); }, [link.linked]);
  useEffect(() => {
    if (!link.challenge || link.linked) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [link.challenge, link.linked]);
  // C3 requires 60 seconds between sends. This is a local resend cooldown, not an OTP expiry.
  const resendSeconds = link.challenge ? Math.min(60, Math.max(0, Math.ceil((link.challenge.receivedAt + 60000 - clock) / 1000))) : 0;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (link.busy) return;
    const invalid = link.challenge ? otpError(otp) : referenceError(reference); setError(invalid);
    if (invalid) { (link.challenge ? otpInput : referenceInput).current?.focus(); return; }
    if (link.challenge) void link.verify(otp); else void link.request(reference);
  }
  function reset() { link.reset(); setReference(''); setOtp(''); setError(undefined); requestAnimationFrame(() => referenceInput.current?.focus()); }
  const failure = link.error instanceof HttpStatusError && link.error.status === 401 ? 'Tu sesión ha caducado. Vuelve a iniciar sesión antes de continuar.'
    : link.error instanceof HttpStatusError && link.error.status === 422 ? 'No pudimos verificar la reserva. Revisa el código, la referencia y el correo de tu cuenta.'
    : link.error instanceof HttpStatusError && link.error.status === 429 ? 'Espera antes de intentarlo de nuevo. Se ha alcanzado el límite de solicitudes.'
    : 'No pudimos comprobar el resultado. Conserva tu referencia y revisa Mis reservas antes de volver a intentarlo.';
  return <section className={`${styles.card} ${standalone ? styles.standalone : ''}`} aria-labelledby="reservation-link-title">
    <div className={styles.intro}><span className={styles.eyebrow}>TUS RESERVAS, SIEMPRE CONTIGO</span><h2 id="reservation-link-title">{standalone ? 'Encuentra tu reserva' : 'Vincula tu reserva'}</h2><p>Usa la referencia de tu comprobante y verifica el correo con el que reservaste.</p></div>
    {link.linked ? <div className={styles.success} role="status"><span className={styles.successIcon} aria-hidden="true">✓</span><h3 ref={success} tabIndex={-1}>Reserva vinculada a tu cuenta.</h3><p>Ya puedes consultar sus estancias en tu historial.</p><Link className={styles.viewReservations} href="/mis-reservas">Ver mis reservas →</Link><Button onClick={reset}>Vincular otra reserva</Button></div> :
      <form onSubmit={submit} noValidate aria-busy={link.busy}>
        {link.challenge ? <><p className={styles.notice}>Si la referencia y el correo coinciden y corresponde el envío, recibirás un código en el correo registrado. Tu cuenta actual es <strong>{account?.email}</strong>.</p>
          <label htmlFor="reservation-link-otp">Código de verificación</label><input ref={otpInput} id="reservation-link-otp" autoComplete="one-time-code" inputMode="numeric" maxLength={8} value={otp} disabled={link.busy} onChange={e => { setOtp(e.target.value); setError(undefined); }} aria-invalid={Boolean(error)} aria-describedby="reservation-link-help reservation-link-error" />
          <small id="reservation-link-help">El código es de un solo uso y tiene una vigencia limitada. Si ha vencido, solicita uno nuevo.</small></> : <>
          <label htmlFor="reservation-link-reference">Referencia de reserva</label><input ref={referenceInput} id="reservation-link-reference" autoComplete="off" maxLength={16} placeholder="Referencia de tu comprobante" value={reference} disabled={link.busy} onChange={e => { setReference(e.target.value); setError(undefined); }} aria-invalid={Boolean(error)} aria-describedby="reservation-link-help reservation-link-error" />
          <small id="reservation-link-help">Usa una reserva realizada con el correo de esta cuenta: {account?.email}.</small></>}
        <div id="reservation-link-error">{Boolean(error || link.error) && <p className={styles.error} role="alert">{error ?? failure}</p>}</div>
        <Button type="submit" className={styles.primary} isLoading={link.busy} loadingText={link.challenge ? 'Verificando…' : 'Solicitando código…'}>{link.challenge ? 'Verificar y vincular reserva' : 'Solicitar código de verificación'}</Button>
        {link.challenge && <div className={styles.actions}><button type="button" disabled={link.busy || resendSeconds > 0} onClick={() => { setOtp(''); setError(undefined); void link.request(reference); }}>Solicitar un nuevo código{resendSeconds > 0 ? ` (${resendSeconds}s)` : ''}</button><button type="button" disabled={link.busy} onClick={reset}>Cambiar referencia</button></div>}
      </form>}
    <p className={styles.security}>Tu referencia por sí sola no permite consultar una reserva. Vincularla no modifica sus fechas, habitaciones ni cargos.</p>
  </section>;
}

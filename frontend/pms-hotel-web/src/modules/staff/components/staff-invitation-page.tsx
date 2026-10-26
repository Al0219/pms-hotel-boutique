'use client';
import Link from 'next/link';
import { Button } from '@/shared/components';
import { useStaffInvitationConsume } from '../hooks/use-staff-invitation-consume';
import styles from './staff-admin.module.css';
export function StaffInvitationPage() {
  const form = useStaffInvitationConsume();
  return <main className={styles.invitationPage}><section className={styles.notice}>
    <h1>Prepara tu acceso Staff</h1>
    {form.phase === 'loading' ? <p role="status">Revisando la invitación…</p> : form.phase === 'prepared' ? <>
      <p role="status">Cuenta activada correctamente. Ya puedes iniciar sesión</p><Link href="/acceso?from=staff-activation" prefetch={false}>Iniciar sesión</Link>
    </> : <form className={styles.createForm} onSubmit={event => { event.preventDefault(); void form.submit(); }}>
      {form.error && <p role="alert">{form.error}</p>}
      {['editing', 'saving'].includes(form.phase) && <>
        <label>Nueva contraseña<input type="password" autoComplete="new-password" minLength={8} maxLength={50} required disabled={form.phase === 'saving'} value={form.password} onChange={event => form.setPassword(event.target.value)} /></label>
        <label>Confirmar contraseña<input type="password" autoComplete="new-password" minLength={8} maxLength={50} required disabled={form.phase === 'saving'} value={form.confirm} onChange={event => form.setConfirm(event.target.value)} /></label>
        <Button type="submit" disabled={form.phase === 'saving'}>{form.phase === 'saving' ? 'Preparando…' : 'Establecer contraseña'}</Button>
      </>}
    </form>}
  </section></main>;
}

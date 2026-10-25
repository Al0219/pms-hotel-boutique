'use client';
import { useEffect, useRef, useState } from 'react';
import { passwordExceedsByteLimit } from '@/lib/login-input';
import { StaffAdminWriteError } from '../model/staff-admin-edit';
import { consumeStaffInvitation } from '../service/staff-invitation.service';
import { mapStaffCredentialPrepared } from '../mappers/staff-invitation.mapper';
export function useStaffInvitationConsume() {
  const [token, setToken] = useState<string | null>(null), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [phase, setPhase] = useState<'loading' | 'editing' | 'saving' | 'prepared' | 'invalid' | 'uncertain'>('loading'), [error, setError] = useState('');
  const extracted = useRef<string | null | undefined>(undefined), pending = useRef(false);
  useEffect(() => {
    if (extracted.current === undefined) {
      const params = new URLSearchParams(window.location.hash.slice(1)), raw = params.get('token');
      extracted.current = raw && /^[A-Za-z0-9_-]{43}$/.test(raw) && [...params.keys()].length === 1 ? raw : null;
      window.history.replaceState(null, '', window.location.pathname);
    }
    let canceled = false;
    // Transfer the browser-only fragment after the effect; retain it across StrictMode's
    // setup/cleanup cycle, then discard it after successful consumption.
    queueMicrotask(() => {
      if (canceled) return;
      if (extracted.current) { setToken(extracted.current); setPhase('editing'); }
      else { setPhase('invalid'); setError('El enlace no es válido. Solicita una invitación a tu administrador.'); }
    });
    return () => { canceled = true; };
  }, []);
  async function submit() {
    if (phase !== 'editing' || !token || pending.current) return;
    if (password.length < 8 || password.length > 50 || !password.trim() || passwordExceedsByteLimit(password)) { setError('Usa entre 8 y 50 caracteres y un máximo de 72 bytes UTF-8.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    pending.current = true; setPhase('saving'); setError('');
    try { mapStaffCredentialPrepared(await consumeStaffInvitation(token, password)); extracted.current = null; setToken(null); setPassword(''); setConfirm(''); setPhase('prepared'); }
    catch (failure) {
      if (failure instanceof StaffAdminWriteError && failure.status !== 503) {
        setPhase(failure.status === 409 ? 'invalid' : 'editing');
        setError(failure.status === 409 ? 'El enlace ha caducado, fue utilizado o ya no está disponible. Solicita una nueva invitación.' : 'No se pudo preparar la contraseña. Revisa los datos.');
      } else { setPhase('uncertain'); setPassword(''); setConfirm(''); setError('No se pudo confirmar el resultado. Pide al administrador que compruebe el estado de la cuenta antes de solicitar otra invitación.'); }
    } finally { pending.current = false; }
  }
  return { password, confirm, setPassword, setConfirm, phase, error, submit };
}

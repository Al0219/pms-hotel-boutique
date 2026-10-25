'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRevalidateStaffSession, type StaffSession } from '@/modules/auth';
import type { PropertyScope } from '@/modules/properties';
import { HttpStatusError } from '@/lib/http/errors';
import { StaffAdminWriteError } from '../model/staff-admin-edit';
import type { StaffInvitationInfo } from '../model/staff-invitation';
import { mapStaffInvitation } from '../mappers/staff-invitation.mapper';
import { mapStaffCommandResult } from '../mappers/staff-admin-command.mapper';
import { readStaffInvitation, sendStaffInvitation } from '../service/staff-invitation.service';
import { writeStaffAdmin } from '../service/staff-admin-command.service';
import { staffAdminBaseKey } from './use-staff-admin';

export function useStaffOnboarding(session: StaffSession, scope: PropertyScope, org: string, id: string, changed: (notice: string) => void, enabled = true) {
  const client = useQueryClient(), revalidate = useRevalidateStaffSession();
  const base = staffAdminBaseKey(session), key = [...base, 'write-lock', org, id];
  const [info, setInfo] = useState<StaffInvitationInfo | null>(null), [message, setMessage] = useState('');
  const [phase, setPhase] = useState<'reading' | 'idle' | 'writing' | 'conflict' | 'uncertain' | 'denied'>('reading');
  const mounted = useRef(true), pending = useRef(false);
  async function refresh() {
    if (pending.current) return;
    pending.current = true;
    try {
      const latest = mapStaffInvitation(await readStaffInvitation(id, scope, AbortSignal.timeout(12_000)), org, id);
      if (!mounted.current) return;
      setInfo(latest); client.removeQueries({ queryKey: key, exact: true }); setMessage(''); setPhase('idle');
    } catch (error) {
      if (!mounted.current) return;
      const status = error instanceof HttpStatusError ? error.status : 0;
      setPhase([401, 403, 404].includes(status) ? 'denied' : client.getQueryData(key) ? 'uncertain' : 'conflict');
      setMessage(status === 404 ? 'El usuario no está disponible en este contexto.' : [401, 403].includes(status) ? 'Tu sesión o permisos han cambiado.' : 'No se pudo comprobar el acceso inicial. Revisa la conexión.');
      if ([401, 403].includes(status)) void revalidate();
    } finally { pending.current = false; }
  }
  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => { if (mounted.current && enabled) void refresh(); });
    return () => { mounted.current = false; };
    // A new session/scope remounts the workspace. No focus event may replay a write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  async function submit(kind: 'invite' | 'activate') {
    if (!info || phase !== 'idle' || pending.current || client.getQueryData(key)
      || (kind === 'invite' ? !info.invitationAllowed : !info.activationAllowed)) return;
    pending.current = true; setPhase('writing'); setMessage('');
    client.setQueryDefaults(key, { gcTime: Infinity }); client.setQueryData(key, { pending: true });
    try {
      const raw = kind === 'invite' ? await sendStaffInvitation(id, scope, info.version) : await writeStaffAdmin(id, scope, { status: 'ACTIVE', expectedVersion: info.version });
      mapStaffCommandResult(raw, org, id, info.version);
      if (!mounted.current) return;
      await client.invalidateQueries({ queryKey: base, refetchType: 'none' });
      if (!mounted.current) return;
      pending.current = false; await refresh();
      if (!mounted.current) return;
      const notice = kind === 'invite' ? 'Invitación de recuperación enviada' : 'Usuario reactivado';
      setMessage(notice); changed(notice);
      void client.refetchQueries({ queryKey: base, type: 'active' });
    } catch (error) {
      if (!mounted.current) return;
      const status = error instanceof StaffAdminWriteError ? error.status : 503;
      if (status !== 503) client.removeQueries({ queryKey: key, exact: true });
      setPhase([401, 403, 404].includes(status) ? 'denied' : status === 503 ? 'uncertain' : 'conflict');
      setMessage(status === 503 ? 'No se pudo confirmar el resultado. Comprueba el estado antes de enviar otra operación.'
        : status === 409 ? 'La información o elegibilidad cambió. Actualiza el usuario antes de continuar.'
        : [401, 403].includes(status) ? 'Tu sesión o permisos han cambiado.' : status === 404 ? 'El usuario no está disponible en este contexto.' : 'La solicitud no es válida. Actualiza el usuario.');
      if ([401, 403].includes(status)) void revalidate();
    } finally { pending.current = false; }
  }
  return { info, message, phase, refresh: () => { if (!pending.current) { setPhase('reading'); void refresh(); } }, submit, busy: phase === 'reading' || phase === 'writing' };
}

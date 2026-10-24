'use client';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRevalidateStaffSession, type StaffSession } from '@/modules/auth';
import type { PropertyScope } from '@/modules/properties';
import { normalizePasswordLoginEmail } from '@/lib/login-input';
import type { StaffAdminCreateDTO } from '../dtos/staff-admin-create.dto';
import type { StaffAdminUser } from '../model/staff-admin';
import { StaffAdminWriteError } from '../model/staff-admin-edit';
import { createStaffAdmin } from '../service/staff-admin-create.service';
import { readStaffAdminUsers } from '../service/staff-admin.service';
import { mapStaffAdminDetail, mapStaffAdminPage } from '../mappers/staff-admin.mapper';
import { staffAdminBaseKey, staffAdminReadContext } from './use-staff-admin';

export function useStaffCreate(session: StaffSession, scope: PropertyScope, organizationId: string, created: (user: StaffAdminUser) => void) {
  const client = useQueryClient(), revalidate = useRevalidateStaffSession();
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [message, setMessage] = useState('');
  const [verifiedExisting, setVerifiedExisting] = useState(false);
  const pending = useRef<StaffAdminCreateDTO | null>(null), sending = useRef(false);
  const context = staffAdminReadContext(session, scope, organizationId);
  const complete = (user: StaffAdminUser) => {
    void client.invalidateQueries({ queryKey: staffAdminBaseKey(session) });
    setUncertain(false); created(user);
  };
  async function submit(draft: StaffAdminCreateDTO) {
    if (sending.current || uncertain) return;
    const workEmail = normalizePasswordLoginEmail(draft.workEmail), username = draft.username.trim();
    const authorized = session.memberships.filter(item => item.active).map(item => item.propertyId);
    if (!username || username.length > 80 || /\p{Cc}/u.test(username) || !workEmail) { setMessage('Escribe un usuario de hasta 80 caracteres y un correo válido de hasta 50 caracteres.'); return; }
    if (!['GERENCIA', 'RECEPCION', 'OPERACIONES', 'AUDITOR'].includes(draft.roleCode)
      || draft.propertyIds.some(id => !authorized.includes(id)) || new Set(draft.propertyIds).size !== draft.propertyIds.length
      || (scope.kind === 'PROPERTY' && !draft.propertyIds.includes(scope.propertyIds[0]))
      || (!draft.propertyIds.length && !(session.roleId === 'SUPER_ADMIN' && scope.kind === 'ALL_PROPERTIES'))) {
      setMessage('Selecciona un rol y propiedades autorizadas; conserva la propiedad del contexto actual.'); return;
    }
    const command = { ...draft, username, workEmail }; pending.current = command;
    sending.current = true; setBusy(true); setMessage('');
    try {
      const raw = await createStaffAdmin(scope, command);
      const user = mapStaffAdminDetail({ organizationId, scope, item: raw }, context, raw.id);
      if (user.username !== username || user.workEmail !== workEmail || user.roleCode !== command.roleCode || user.status !== 'SUSPENDED'
        || JSON.stringify([...user.propertyIds].sort()) !== JSON.stringify([...command.propertyIds].sort())) throw new Error('Invalid creation response');
      complete(user);
    } catch (error) {
      if (error instanceof StaffAdminWriteError && error.status !== 503) {
        setMessage(error.status === 409 ? 'El usuario o correo ya está registrado. Revisa los datos.'
          : error.status === 401 ? 'Tu sesión ha caducado.' : error.status === 403 ? 'Ya no tienes permiso para crear esta cuenta.' : 'Revisa los datos del formulario.');
        if ([401, 403].includes(error.status)) void revalidate();
      } else { setUncertain(true); setMessage('No se pudo confirmar el resultado. Comprueba el listado antes de intentar otra alta.'); }
    } finally { sending.current = false; setBusy(false); }
  }
  async function verify() {
    if (sending.current || !pending.current) return;
    sending.current = true; setBusy(true); const command = pending.current;
    try {
      let cursor: string | null = null;
      do {
        const page = mapStaffAdminPage(await readStaffAdminUsers(scope, { username: command.username, roleCode: '', status: '', limit: 100 }, cursor, AbortSignal.timeout(12_000)), context, 100);
        const found = page.users.find(user => user.username === command.username);
        if (found) {
          if (found.workEmail !== command.workEmail || found.roleCode !== command.roleCode || found.status !== 'SUSPENDED'
            || JSON.stringify([...found.propertyIds].sort()) !== JSON.stringify([...command.propertyIds].sort())) {
            setVerifiedExisting(true); setMessage('Ese usuario existe con datos diferentes. Cierra el formulario y revisa el listado; no se enviará otra alta.'); return;
          }
          complete(found); return;
        }
        cursor = page.nextCursor;
      } while (cursor);
      setUncertain(false); setMessage('No aparece un usuario con ese nombre. Revisa los datos antes de volver a crear.');
    } catch { setMessage('No se pudo comprobar el estado. No se enviará otra alta hasta recuperar la conexión y verificarlo.'); }
    finally { sending.current = false; setBusy(false); }
  }
  return { submit, verify, busy, uncertain, verifiedExisting, message };
}

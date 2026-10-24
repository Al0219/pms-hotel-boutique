'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useRevalidateStaffSession, type StaffSession } from '@/modules/auth';
import type { PropertyScope } from '@/modules/properties';
import { normalizePasswordLoginEmail } from '@/lib/login-input';
import { HttpStatusError } from '@/lib/http/errors';
import { mapStaffAdminDetail } from '../mappers/staff-admin.mapper';
import { mapStaffCommandResult } from '../mappers/staff-admin-command.mapper';
import { readStaffAdminUser } from '../service/staff-admin.service';
import { writeStaffAdmin } from '../service/staff-admin-command.service';
import { canEditStaff, staffDraft, staffDraftChanged, validateStaffDraft, StaffAdminWriteError, type StaffEditDraft, type StaffActionGroup, type StaffStatusTarget } from '../model/staff-admin-edit';
import type { StaffAdminPage, StaffAdminUser } from '../model/staff-admin';
import { staffAdminBaseKey, staffAdminReadContext } from './use-staff-admin';

type Phase = 'loading' | 'editing' | 'saving' | 'conflict' | 'uncertain' | 'checking' | 'confirmed' | 'idle';
interface Editor { user: StaffAdminUser; group: StaffActionGroup; draft: StaffEditDraft; phase: Phase; message: string; review?: boolean; confirmed?: boolean; noChange?: boolean; remote?: StaffAdminUser }
export function useStaffInlineEdit(session: StaffSession, scope: PropertyScope, organizationId: string | undefined, onConfirmed: () => void, onAccessLost: () => void) {
  const client = useQueryClient(), revalidate = useRevalidateStaffSession();
  const [state, setState] = useState<Editor | null>(null), [accessLost, setAccessLost] = useState(false), [notice, setNotice] = useState('');
  const current = useRef(state), mounted = useRef(true), read = useRef<AbortController | null>(null), background = useRef<AbortController | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; read.current?.abort(); background.current?.abort(); }; }, []);
  const set = (next: Editor | null) => { current.current = next; if (mounted.current) setState(next); };
  const base = staffAdminBaseKey(session);
  const lockKey = (id: string): QueryKey => [...base, 'write-lock', organizationId, id];
  const relevant = (key: QueryKey) => JSON.stringify(key.slice(0, 4)) === JSON.stringify(base) && key[4] === organizationId && ['users', 'detail'].includes(String(key[7]));
  const allowedToApply = () => mounted.current && !accessLost && !!organizationId;
  async function fresh(id: string) {
    background.current?.abort(); background.current = null;
    read.current?.abort(); read.current = new AbortController();
    return mapStaffAdminDetail(await readStaffAdminUser(id, scope, read.current.signal), staffAdminReadContext(session, scope, organizationId!), id);
  }
  function sync(user: StaffAdminUser) {
    client.setQueryData<StaffAdminUser>([...base, organizationId, scope.kind, [...scope.propertyIds].sort(), 'detail', user.id], previous => previous && previous.version > user.version ? previous : user);
    for (const query of client.getQueryCache().findAll({ predicate: query => relevant(query.queryKey) && query.queryKey[7] === 'users' })) {
      const key = query.queryKey, filters = key[8] as { roleCode: string; status: string };
      const visible = (key[5] !== 'PROPERTY' || user.propertyIds.includes((key[6] as string[])[0]))
        && (!filters.roleCode || filters.roleCode === user.roleCode) && (!filters.status || filters.status === user.status);
      client.setQueryData<StaffAdminPage>(key, old => old ? { ...old, users: old.users.flatMap(item => item.id !== user.id ? [item] : visible ? [item.version > user.version ? item : user] : []) } : old);
    }
  }
  function withdraw(id: string) {
    client.setQueriesData<StaffAdminPage>({ predicate: query => relevant(query.queryKey) && query.queryKey[7] === 'users' }, old => old ? { ...old, users: old.users.filter(item => item.id !== id) } : old);
    client.removeQueries({ predicate: query => relevant(query.queryKey) && query.queryKey[7] === 'detail' && query.queryKey[8] === id });
  }
  async function invalidate() {
    await client.cancelQueries({ predicate: query => relevant(query.queryKey) });
    await client.invalidateQueries({ predicate: query => relevant(query.queryKey), refetchType: 'none' });
  }
  function unauthorized(error: unknown) {
    const status = error instanceof StaffAdminWriteError || error instanceof HttpStatusError ? error.status : 0;
    if (![401, 403].includes(status)) return false;
    if (mounted.current) { setAccessLost(true); onAccessLost(); }
    void client.cancelQueries({ queryKey: ['staff-admin'] });
    client.removeQueries({ queryKey: ['staff-admin'] });
    void revalidate(); // Read/session recovery only; never resubmit the command.
    return true;
  }
  async function begin(user: StaffAdminUser, group: StaffActionGroup, status?: StaffStatusTarget) {
    if (!organizationId || current.current && current.current.phase !== 'idle' || !canEditStaff(user, session, group)) return;
    const editor: Editor = { user, group, draft: { ...staffDraft(user), status }, phase: 'loading', message: '' };
    if (client.getQueryData(lockKey(user.id))) { set({ ...editor, phase: 'uncertain', message: 'Hay un resultado pendiente de comprobar para esta cuenta. Actualiza el usuario antes de modificarlo.' }); return; }
    setNotice(''); set(editor);
    try {
      const latest = await fresh(user.id);
      if (!allowedToApply()) return;
      sync(latest);
      const draft = { ...staffDraft(latest), status };
      const invalid = validateStaffDraft(group, draft, latest, session, scope);
      set({ ...editor, user: latest, draft, phase: 'editing', message: invalid ?? '' });
      return !invalid;
    } catch (error) {
      if (!allowedToApply() || unauthorized(error)) return;
      if (error instanceof HttpStatusError && error.status === 404) { withdraw(user.id); set(null); setNotice('El usuario ya no está disponible en este contexto.'); onConfirmed(); return; }
      set({ ...editor, phase: 'conflict', message: 'No se pudo consultar la versión vigente. Actualiza el usuario antes de editar.' });
    }
  }
  function change(patch: Partial<StaffEditDraft>) {
    const editor = current.current;
    if (editor && ['editing', 'conflict'].includes(editor.phase)) set({ ...editor, draft: { ...editor.draft, ...patch } });
  }
  function cancel() {
    const editor = current.current;
    if (editor && ['editing', 'conflict', 'idle'].includes(editor.phase) && !client.getQueryData(lockKey(editor.user.id))) set(null);
  }
  async function recover() {
    const editor = current.current;
    if (!editor || ['saving', 'checking', 'loading'].includes(editor.phase)) return;
    set({ ...editor, phase: 'checking' });
    try {
      const latest = await fresh(editor.user.id);
      if (!allowedToApply()) return;
      if (editor.confirmed && latest.version < editor.user.version) throw new Error('STALE_READ');
      await invalidate();
      if (!allowedToApply()) return;
      client.removeQueries({ queryKey: lockKey(editor.user.id), exact: true }); sync(latest);
      set({ ...editor, user: latest, remote: undefined, phase: editor.confirmed ? 'idle' : 'editing', review: !editor.confirmed,
        message: '' });
      onConfirmed();
    } catch (error) {
      if (!allowedToApply() || unauthorized(error)) return;
      if (error instanceof HttpStatusError && error.status === 404) {
        withdraw(editor.user.id); client.removeQueries({ queryKey: lockKey(editor.user.id), exact: true });
        set(null); setNotice(editor.confirmed ? 'Guardado. El usuario ya no está disponible en este contexto.' : 'El usuario ya no está disponible en este contexto.'); onConfirmed(); return;
      }
      set({ ...editor, phase: editor.confirmed ? 'uncertain' : editor.phase, message: editor.confirmed ? 'Guardado; no se pudo actualizar la información. Comprueba el estado antes de editar.' : 'No se pudo comprobar el estado. Conservamos tu borrador; no vuelvas a enviar todavía.' });
    }
  }
  async function save() {
    const editor = current.current;
    if (!editor || editor.phase !== 'editing' || client.getQueryData(lockKey(editor.user.id)) || !organizationId) return;
    const invalid = validateStaffDraft(editor.group, editor.draft, editor.user, session, scope);
    if (invalid) { set({ ...editor, message: invalid }); return; }
    if (!staffDraftChanged(editor.group, editor.draft, editor.user)) return;
    background.current?.abort(); background.current = null;
    // Synchronous shared lock prevents rapid duplicate submits and remount replays.
    client.setQueryDefaults(lockKey(editor.user.id), { gcTime: Infinity });
    client.setQueryData(lockKey(editor.user.id), { pending: true });
    set({ ...editor, phase: 'saving', message: '' });
    try {
      const command = editor.group === 'status' ? { status: editor.draft.status!, expectedVersion: editor.user.version } : editor.group === 'email' ? { workEmail: normalizePasswordLoginEmail(editor.draft.email)!, expectedVersion: editor.user.version }
        : { roleCode: editor.group === 'role' ? editor.draft.role : editor.user.roleCode,
          propertyIds: editor.group === 'properties' ? [...editor.draft.properties] : [...editor.user.propertyIds], expectedVersion: editor.user.version };
      const ack = mapStaffCommandResult(await writeStaffAdmin(editor.user.id, scope, command), organizationId, editor.user.id, editor.user.version);
      if (!allowedToApply()) return; // Old-context replies never repopulate caches/UI.
      await invalidate();
      if (!allowedToApply()) return;
      const confirmed = { ...editor, user: { ...editor.user, version: ack.version }, phase: 'confirmed' as const, confirmed: true, noChange: !ack.changed,
        message: ack.changed ? 'Guardado. Comprobando la información…' : 'Sin cambios. Comprobando la información…' };
      set(confirmed);
      await recover(); // Safe GET only; blocked until an authorized current view exists.
    } catch (error) {
      if (!allowedToApply() || unauthorized(error)) return;
      if (error instanceof StaffAdminWriteError && error.status === 404) { withdraw(editor.user.id); client.removeQueries({ queryKey: lockKey(editor.user.id), exact: true }); set(null); setNotice(editor.confirmed ? 'Guardado. El usuario ya no está disponible en este contexto.' : 'El usuario ya no está disponible en este contexto.'); onConfirmed(); return; }
      const known = error instanceof StaffAdminWriteError && error.status !== 503;
      if (known) client.removeQueries({ queryKey: lockKey(editor.user.id), exact: true });
      const code = error instanceof StaffAdminWriteError ? error.code : '';
      set({ ...editor, phase: !known ? 'uncertain' : code === 'STAFF_VERSION_CONFLICT' || code === 'STAFF_STATE_CONFLICT' ? 'conflict' : 'editing',
        message: !known ? 'No se pudo confirmar el resultado. Comprueba el estado antes de volver a guardar.'
          : code === 'STAFF_VERSION_CONFLICT' ? 'La información cambió. Actualiza el usuario para revisar tu borrador.'
          : code === 'STAFF_STATE_CONFLICT' ? 'La cuenta no admite este cambio en su estado actual. Actualiza el usuario.'
          : code === 'STAFF_EMAIL_CONFLICT' ? 'El correo no está disponible. Escribe otro correo.'
          : 'La solicitud no es válida. Revisa los datos antes de guardar.' });
    }
  }
  const observeRead = useEffectEvent((user: StaffAdminUser) => {
    const editor = current.current;
    if (!editor || !['editing', 'conflict'].includes(editor.phase) || user.id !== editor.user.id
      || user.organizationId !== editor.user.organizationId || user.version <= editor.user.version
      || (editor.phase === 'conflict' && editor.remote && editor.remote.version >= user.version)) return;
    // Keep the original version and draft. Only explicit recovery adopts the newer snapshot.
    set({ ...editor, remote: user, phase: 'conflict', message: 'La información cambió. Actualiza el usuario para revisar tu borrador.' });
  });
  const checkTarget = useEffectEvent(async () => {
    const editor = current.current;
    if (!editor || !['editing', 'conflict'].includes(editor.phase) || !organizationId || background.current) return;
    const controller = new AbortController(); background.current = controller;
    try {
      const latest = mapStaffAdminDetail(await readStaffAdminUser(editor.user.id, scope, controller.signal), staffAdminReadContext(session, scope, organizationId), editor.user.id);
      if (controller.signal.aborted || !allowedToApply() || current.current?.user.id !== editor.user.id) return;
      observeRead(latest);
      if (latest.version > editor.user.version) sync(latest);
    } catch (error) {
      if (controller.signal.aborted || !allowedToApply() || current.current?.user.id !== editor.user.id || unauthorized(error)) return;
      if (error instanceof HttpStatusError && error.status === 404) {
        withdraw(editor.user.id); set(null); setNotice('El usuario ya no está disponible en este contexto.'); onConfirmed();
      }
      // A temporary read failure neither cancels the draft nor proves a command result.
    } finally { if (background.current === controller) background.current = null; }
  });
  const observeCache = useEffectEvent((key: QueryKey, data: unknown, manual: boolean | undefined) => {
    const editor = current.current;
    if (!editor || !['editing', 'conflict'].includes(editor.phase) || !relevant(key)) return;
    const target = key[7] === 'detail' ? data as StaffAdminUser | undefined : (data as StaffAdminPage | undefined)?.users.find(user => user.id === editor.user.id);
    if (target) observeRead(target);
    else if (!manual && key[7] === 'users') void checkTarget(); // Missing from a filter is not proof of lost scope.
  });
  useEffect(() => {
    const unsubscribe = client.getQueryCache().subscribe(event => {
      if (event.type === 'updated' && event.action.type === 'success') observeCache(event.query.queryKey, event.query.state.data, event.action.manual);
    });
    const returned = () => { if (document.visibilityState !== 'hidden' && document.hasFocus()) void checkTarget(); };
    window.addEventListener('focus', returned);
    document.addEventListener('visibilitychange', returned);
    return () => { unsubscribe(); window.removeEventListener('focus', returned); document.removeEventListener('visibilitychange', returned); };
  }, [client]);
  /** Finish one deliberate editing session; unchanged values close without HTTP. */
  async function finish(id?: string, group?: StaffActionGroup) {
    const editor = current.current;
    if (!editor || editor.phase !== 'editing' || (id && editor.user.id !== id) || (group && editor.group !== group) || client.getQueryData(lockKey(editor.user.id))) return;
    const invalid = validateStaffDraft(editor.group, editor.draft, editor.user, session, scope);
    if (invalid) { set({ ...editor, message: invalid }); return; }
    if (!staffDraftChanged(editor.group, editor.draft, editor.user)) { cancel(); return; }
    await save();
  }
  const active = !!state && state.phase !== 'idle';
  return { state, active, accessLost, notice, begin, change, cancel, recover, save, finish,
    busy: !!state && ['saving', 'checking', 'loading', 'confirmed'].includes(state.phase),
    validation: state ? validateStaffDraft(state.group, state.draft, state.user, session, scope) : null,
    changed: !!state && staffDraftChanged(state.group, state.draft, state.user),
  };
}
export type StaffInlineEditor = ReturnType<typeof useStaffInlineEdit>;

'use client';
import { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { StaffRowPanelContext } from './staff-row-panel-context';
import { Button, ConfirmDialog } from '@/shared/components';
import type { StaffSession } from '@/modules/auth';
import type { StaffAdminUser } from '../model/staff-admin';
import { staffStatusActions, type StaffStatusTarget } from '../model/staff-admin-edit';
import type { StaffInlineEditor } from '../hooks/use-staff-inline-edit';
import styles from './staff-admin.module.css';

export function StaffStatusActions({ user, session, editor, revealed, reveal, unavailable, activate }: {
  user: StaffAdminUser; session: StaffSession; editor: StaffInlineEditor; revealed: boolean;
  reveal: (show: boolean) => void; unavailable: boolean; activate: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const panel = useContext(StaffRowPanelContext), keyboardReveal = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null), root = useRef<HTMLDivElement>(null), wasActive = useRef(false), pendingFocus = useRef(false), row = useRef<HTMLTableRowElement | null>(null);
  const state = editor.state, active = editor.active && state?.user.id === user.id && state.group === 'status';
  const actions = staffStatusActions(user, session);
  useEffect(() => {
    if (revealed && keyboardReveal.current) { panel?.querySelector<HTMLButtonElement>('button')?.focus(); keyboardReveal.current = false; }
  }, [revealed, panel]);
  useEffect(() => {
    if (root.current) row.current = root.current.closest('tr');
    if (!active && wasActive.current) pendingFocus.current = true;
    if (active) pendingFocus.current = false;
    if (pendingFocus.current && !unavailable) {
      const target = trigger.current ?? row.current?.querySelector<HTMLButtonElement>('[data-staff-expand]');
      if (document.activeElement === document.body || row.current?.contains(document.activeElement)) target?.focus({ preventScroll: true });
      pendingFocus.current = false;
    }
    wasActive.current = active;
  }, [active, unavailable]);
  useEffect(() => {
    if (!revealed) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !row.current?.contains(event.target)) reveal(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [revealed, reveal]);
  if (!actions.length && !active) return null;
  const show = revealed && !editor.active && !unavailable;
  const label = state?.draft.status === 'SUSPENDED' ? 'Suspender' : 'Deshabilitar';
  const cancel = () => { setConfirming(false); editor.cancel(); };
  async function choose(status: StaffStatusTarget) {
    reveal(false); activate();
    if (await editor.begin(user, 'status', status)) setConfirming(true);
  }
  return <div ref={root} className={styles.statusActions} data-staff-row-action
    onKeyDown={event => {
      if (event.key === 'Escape' && revealed) { event.stopPropagation(); reveal(false); trigger.current?.focus(); }
    }}>
    {!active && <button ref={trigger} type="button" className={styles.statusTrigger}
      aria-label={`Opciones de estado de ${user.username}`} title="Opciones de estado"
      aria-expanded={show} aria-controls={show ? `staff-status-${user.id}` : undefined}
      disabled={editor.active || unavailable} onClick={event => { keyboardReveal.current = event.detail === 0; reveal(!revealed); }}>
      <span aria-hidden="true">⋯</span>
    </button>}
    {panel && !active && !editor.active && !unavailable && createPortal(<div id={`staff-status-${user.id}`} role="group" aria-label={`Acciones de estado de ${user.username}`} className={styles.statusChoices}
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); reveal(false); trigger.current?.focus(); } }}>
      {actions.map(status => <button type="button" key={status} className={status === 'SUSPENDED' ? styles.suspendAction : styles.disableAction} onClick={() => void choose(status)}><StaffStatusIcon status={status} /><span>{status === 'SUSPENDED' ? 'Suspender' : 'Deshabilitar'}</span></button>)}
    </div>, panel)}
    {active && state && <div className={styles.statusPending} aria-label={`Cambio de estado de ${user.username}`}>
      {state.message && !editor.busy && <p role="alert">{state.message}</p>}
      {editor.busy && <p role="status">{state.phase === 'saving' ? 'Aplicando cambio de estado…' : 'Comprobando el estado…'}</p>}
      {editor.validation && editor.validation !== state.message && !editor.busy && state.phase === 'editing' && <p role="alert">{editor.validation}</p>}
      {['conflict', 'uncertain'].includes(state.phase) && <Button size="sm" variant="outline" onClick={() => { setConfirming(false); void editor.recover(); }}>Actualizar usuario</Button>}
      {state.phase === 'editing' && !confirming && !editor.validation && <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>{state.draft.status === 'SUSPENDED' ? 'Revisar suspensión' : 'Revisar baja'}</Button>}
      {!editor.busy && state.phase !== 'uncertain' && <Button size="sm" variant="ghost" onClick={cancel}>Cerrar</Button>}
      {confirming && state.phase === 'editing' && !editor.validation && createPortal(<ConfirmDialog
        title={`¿${label} a ${user.username}?`} destructive confirmLabel={label} busyLabel="Aplicando…"
        body={state.draft.status === 'DISABLED'
          ? 'La baja lógica es definitiva: se cerrarán el acceso y las sesiones. Se conservará el historial. No se puede reactivar una cuenta deshabilitada.'
          : 'Se suspenderán el acceso y las sesiones de esta cuenta. La reactivación requerirá credencial verificada y una acción administrativa autorizada.'}
        onCancel={cancel} onConfirm={() => { setConfirming(false); void editor.finish(user.id, 'status'); }} />, document.body)}
    </div>}
  </div>;
}

// Official Lucide SVGs: circle-pause (PauseCircle) and user-x (UserX).
// Source: https://github.com/lucide-icons/lucide/tree/main/icons
// Copyright and permissions: ./staff-status-icons.LICENSE
function StaffStatusIcon({ status }: { status: StaffStatusTarget }) {
  return <svg data-icon={status === 'SUSPENDED' ? 'PauseCircle' : 'UserX'} width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {status === 'SUSPENDED'
      ? <><circle cx="12" cy="12" r="10" /><line x1="10" x2="10" y1="15" y2="9" /><line x1="14" x2="14" y1="15" y2="9" /></>
      : <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="17" x2="22" y1="8" y2="13" /><line x1="22" x2="17" y1="8" y2="13" /></>}
  </svg>;
}

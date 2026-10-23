'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { Button, Input } from '@/shared/components';
import type { StaffSession } from '@/modules/auth';
import type { StaffAdminContext, StaffAdminUser } from '../model/staff-admin';
import { canEditStaff, type StaffEditGroup } from '../model/staff-admin-edit';
import type { StaffInlineEditor } from '../hooks/use-staff-inline-edit';
import styles from './staff-admin.module.css';

const labels = { email: 'correo', role: 'rol', properties: 'propiedades' };
export function StaffInlineGroup({ group, user, session, context, editor, children, activate, unavailable = false }: {
  group: StaffEditGroup; user: StaffAdminUser; session: StaffSession; context: StaffAdminContext;
  editor: StaffInlineEditor; children: ReactNode; activate: () => void; unavailable?: boolean;
}) {
  const state = editor.state, open = state?.user.id === user.id && state.group === group && state.phase !== 'idle';
  const trigger = useRef<HTMLButtonElement>(null), container = useRef<HTMLDivElement>(null), wasOpen = useRef(false);
  const lastField = useRef<HTMLElement | null>(null), recoveryFocus = useRef<HTMLElement | null>(null), previousPhase = useRef(state?.phase);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(blurTimer.current), []);
  const automatic = useRef(false), returnFocus = useRef(true), composing = useRef(false), leftPage = useRef(false), departure = useRef(false);
  useEffect(() => {
    const suspend = () => { leftPage.current = true; departure.current = false; clearTimeout(blurTimer.current); };
    const visibility = () => { if (document.visibilityState === 'hidden') suspend(); };
    const resumeByInteraction = (event: Event) => {
      if (document.visibilityState !== 'hidden') leftPage.current = false;
      departure.current = event.type === 'pointerdown' ? event.target instanceof Node && !!container.current && !container.current.contains(event.target)
        : event instanceof KeyboardEvent && event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey;
    };
    window.addEventListener('blur', suspend);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('pointerdown', resumeByInteraction, true);
    document.addEventListener('keydown', resumeByInteraction, true);
    return () => {
      window.removeEventListener('blur', suspend);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointerdown', resumeByInteraction, true);
      document.removeEventListener('keydown', resumeByInteraction, true);
    };
  }, []);
  useEffect(() => {
    if (open && state?.phase === 'editing') {
      automatic.current = false; // Recovery never submits a retained draft merely by losing focus.
      if (!wasOpen.current || previousPhase.current === 'loading') container.current?.querySelector<HTMLElement>('input, select')?.focus();
      else if (recoveryFocus.current && document.activeElement === document.body && document.hasFocus() && document.visibilityState !== 'hidden') recoveryFocus.current.focus({ preventScroll: true });
      recoveryFocus.current = null;
    }
    if (!open && wasOpen.current && returnFocus.current) trigger.current?.focus({ preventScroll: true });
    wasOpen.current = open; previousPhase.current = state?.phase;
  }, [open, state?.phase]);
  if (!open) return canEditStaff(user, session, group) ? <button ref={trigger} type="button" className={styles.editableValue}
    data-staff-edit-trigger={group} disabled={editor.active || unavailable} aria-label={`Editar ${labels[group]} de ${user.username}`} aria-describedby={`staff-value-${user.id}-${group}`}
    title="Clic, Enter o Espacio para modificar" onClick={event => { if (event.defaultPrevented) return; returnFocus.current = true; activate(); void editor.begin(user, group); }}><span id={`staff-value-${user.id}-${group}`} className={styles.editableContent}>{children}</span></button> : <>{children}</>;
  const locked = editor.busy || state.phase === 'uncertain';
  const fieldId = `staff-edit-${user.id}-${group}`, errorId = `${fieldId}-error`;
  const validation = editor.validation;
  const finish = (explicit: boolean) => {
    if (state.phase !== 'editing' || composing.current || (!explicit && !automatic.current && editor.changed)) return;
    automatic.current = false;
    returnFocus.current = explicit;
    void editor.finish(user.id, group);
  };
  return <div ref={container} className={styles.inlineEditor} data-staff-row-action
    onFocusCapture={event => { departure.current = false; if (event.target.matches('input, select')) lastField.current = event.target; }}
    onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
    onBlur={event => {
      if (document.visibilityState === 'hidden' || leftPage.current || event.currentTarget.closest('[data-staff-session-blocked="true"]')) return;
      const next = event.relatedTarget;
      if (next instanceof Node && event.currentTarget.contains(next)) return;
      // Session checks/programmatic defocus are not a user decision to submit.
      const internalDestination = next instanceof HTMLElement && next !== document.body && document.contains(next);
      if (!departure.current && !internalDestination) return;
      // The existing scope guard must decide about a draft before selection changes.
      if (next instanceof Element && next.closest('#staff-property, [role="dialog"]')) return;
      clearTimeout(blurTimer.current);
      blurTimer.current = setTimeout(() => {
        const active = document.activeElement;
        if (leftPage.current || document.visibilityState === 'hidden' || !document.hasFocus() || container.current?.closest('[data-staff-session-blocked="true"]')) return;
        if (!container.current || container.current.contains(active) || active?.closest('#staff-property, [role="dialog"]')) return;
        finish(false);
      }, 0);
    }}
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || composing.current || event.keyCode === 229) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); automatic.current = false; returnFocus.current = true; editor.cancel();
      } else if (event.key === 'Enter' && (group === 'email' || (group === 'role' && state.review) || (group === 'properties' && (event.ctrlKey || event.metaKey)))) {
        event.preventDefault(); event.stopPropagation(); finish(true);
      } else if (event.key === 'Enter' && group === 'properties') event.preventDefault();
    }}>
    <form aria-label={`Editar ${labels[group]} de ${user.username}`} onSubmit={event => { event.preventDefault(); if (group === 'email' || group === 'role') finish(true); }}>
      {group === 'email' ? <Input id={fieldId} type="email" maxLength={50} label="Correo laboral" autoComplete="off" value={state.draft.email} disabled={locked}
        aria-keyshortcuts="Enter Escape" errorMessage={validation ?? undefined} onChange={event => { automatic.current = true; editor.change({ email: event.target.value }); }} />
        : group === 'role' ? <><label htmlFor={fieldId}>Rol Staff</label><select id={fieldId} value={state.review ? '' : state.draft.role} disabled={locked} aria-keyshortcuts="Enter Escape" aria-invalid={!!validation}
          aria-describedby={validation ? errorId : undefined} onChange={event => {
            automatic.current = false; returnFocus.current = true;
            editor.change({ role: event.target.value });
            void editor.finish(user.id, group); // change updates the hook's canonical ref synchronously.
          }}>{state.review && <option value="" disabled>{context.roles.find(role => role.code === state.draft.role)?.name ?? state.draft.role}</option>}{context.roles.filter(role => role.code !== 'SUPER_ADMIN').map(role => <option key={role.code} value={role.code}>{role.name}</option>)}</select></>
        : <fieldset disabled={locked} aria-keyshortcuts="Control+Enter Meta+Enter Escape" aria-describedby={validation ? errorId : undefined}><legend>Propiedades autorizadas</legend>{session.memberships.filter(property => property.active).map(property => <label key={property.propertyId} className={styles.propertyOption}><input type="checkbox" checked={state.draft.properties.includes(property.propertyId)} onChange={event => {
          automatic.current = true; editor.change({ properties: event.target.checked ? [...state.draft.properties, property.propertyId] : state.draft.properties.filter(id => id !== property.propertyId) });
        }} />{property.name}</label>)}</fieldset>}
      {validation && group !== 'email' && <p id={errorId} role="alert">{validation}</p>}
      {state.message && <p role={state.phase === 'editing' && state.review ? 'status' : 'alert'}>{state.message}</p>}
      {['conflict', 'uncertain'].includes(state.phase) && <Button type="button" size="sm" variant="outline" onClick={() => { recoveryFocus.current = lastField.current; void editor.recover(); }}>Actualizar usuario</Button>}
      {editor.busy && <p role="status">{state.phase === 'loading' ? 'Consultando versión vigente…' : state.phase === 'checking' ? 'Comprobando el estado…' : state.message || 'Guardando…'}</p>}
    </form>
  </div>;
}

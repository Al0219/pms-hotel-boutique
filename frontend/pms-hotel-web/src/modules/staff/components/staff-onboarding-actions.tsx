'use client';
import { useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Modal, ConfirmDialog } from '@/shared/components';
import type { StaffSession } from '@/modules/auth';
import type { PropertyScope } from '@/modules/properties';
import { canEditStaff } from '../model/staff-admin-edit';
import type { StaffAdminUser } from '../model/staff-admin';
import { useStaffOnboarding } from '../hooks/use-staff-onboarding';
import { StaffRowRecoveryPanelContext } from './staff-row-panel-context';
import styles from './staff-admin.module.css';
type Props = { user: StaffAdminUser; session: StaffSession; scope: PropertyScope; disabled: boolean; onChanged: (notice: string) => void; recoveryRevealed?: boolean; revealRecovery?: (show: boolean) => void };
export function StaffOnboardingActions(props: Props) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useContext(StaffRowRecoveryPanelContext);
  if (props.user.status !== 'SUSPENDED' || !canEditStaff(props.user, props.session, 'status')) return null;
  return <span data-staff-row-action><button ref={trigger} type="button" className={styles.onboardingTrigger} disabled={props.disabled} aria-label={`Invitación y activación de ${props.user.username}`} aria-expanded={panel ? !!props.recoveryRevealed : open} aria-controls={panel && props.recoveryRevealed ? `staff-recovery-${props.user.id}` : undefined} onClick={() => panel && props.revealRecovery ? props.revealRecovery(!props.recoveryRevealed) : setOpen(true)}>Invitación / Activación</button>
    {panel && <RecoveryPanel {...props} panel={panel} close={() => { props.revealRecovery?.(false); trigger.current?.focus(); }} />}
    {open && createPortal(<OnboardingDialog {...props} close={() => { setOpen(false); trigger.current?.focus(); }} />, document.body)}</span>;
}
function OnboardingDialog({ user, session, scope, onChanged, close }: Props & { close: () => void }) {
  const action = useStaffOnboarding(session, scope, user.organizationId, user.id, onChanged);
  const [confirm, setConfirm] = useState(false);
  if (confirm && action.phase === 'idle' && action.info?.activationAllowed) return <ConfirmDialog title={`¿Reactivar a ${user.username}?`} body="La contraseña ha sido preparada mediante la invitación. La cuenta obtendrá acceso con su rol y propiedades vigentes." confirmLabel="Reactivar" busyLabel="Reactivando…" onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); void action.submit('activate'); }} />;
  return <Modal title={`Acceso de ${user.username}`} busy={action.busy} onClose={close} footer={<>
      <Button variant="outline" disabled={action.busy} onClick={close}>Cerrar</Button>
      {action.phase !== 'denied' && <Button variant="outline" disabled={action.busy} onClick={() => void action.refresh()}>Actualizar usuario</Button>}
      {action.phase === 'idle' && action.info?.invitationAllowed && <Button onClick={() => void action.submit('invite')}>Enviar invitación de recuperación</Button>}
      {action.phase === 'idle' && action.info?.activationAllowed && <Button onClick={() => setConfirm(true)}>Reactivar</Button>}
    </>}>
      {action.busy && <p role="status">{action.phase === 'writing' ? 'Procesando…' : 'Comprobando requisitos…'}</p>}
      {action.message && <p role={action.phase === 'idle' ? 'status' : 'alert'}>{action.message}</p>}
      {action.info && action.phase === 'idle' && <p>{action.info.credentialPrepared ? 'La contraseña está preparada. La activación requiere membresía y propiedades vigentes.'
        : action.info.invitationAllowed ? 'El enlace se enviará exclusivamente al correo laboral. Al establecer su contraseña mediante el enlace, la cuenta se activará si conserva los requisitos de acceso.'
        : 'No hay una invitación disponible ahora. Revisa el correo si ya fue enviada.'}</p>}
    </Modal>;
}

/** Shares the existing onboarding command coordinator; eligibility is read only on reveal. */
function RecoveryPanel({ user, session, scope, onChanged, recoveryRevealed = false, panel, close }: Props & { panel: HTMLElement; close: () => void }) {
  const action = useStaffOnboarding(session, scope, user.organizationId, user.id, notice => { close(); onChanged(notice); }, recoveryRevealed);
  const [confirm, setConfirm] = useState(false);
  const ready = action.phase === 'idle' && action.info;
  const reactivate = !!(ready && action.info?.activationAllowed);
  const invite = !!(ready && action.info?.invitationAllowed);
  return <>
    {recoveryRevealed && createPortal(<div id={`staff-recovery-${user.id}`} role="group" aria-label={`Recuperación de ${user.username}`} className={styles.statusChoices}
      onKeyDown={event => { if (event.key === 'Escape' && !action.busy) { event.stopPropagation(); close(); } }}>
      {reactivate || invite ? <button type="button" className={styles.recoveryAction} onClick={() => reactivate ? setConfirm(true) : void action.submit('invite')}>
        <RecoveryIcon reactivate={reactivate} /><span>{reactivate ? 'Reactivar' : 'Enviar invitación de recuperación'}</span>
      </button> : <div className={styles.recoveryState}>
        <span role={action.message ? 'alert' : 'status'}>{action.busy ? 'Comprobando…' : action.message || 'No hay acciones disponibles.'}</span>
        {!action.busy && action.phase !== 'denied' && <Button size="sm" variant="ghost" onClick={action.refresh}>Actualizar usuario</Button>}
      </div>}
    </div>, panel)}
    {confirm && reactivate && createPortal(<ConfirmDialog title={`¿Reactivar a ${user.username}?`} body="La cuenta volverá a tener acceso con su rol y propiedades vigentes." confirmLabel="Reactivar" busyLabel="Reactivando…" onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); void action.submit('activate'); }} />, document.body)}
  </>;
}
// Lucide user-round-check and mail, under staff-status-icons.LICENSE.
function RecoveryIcon({ reactivate }: { reactivate: boolean }) {
  return <svg data-icon={reactivate ? 'UserRoundCheck' : 'Mail'} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {reactivate ? <><path d="M2 21a8 8 0 0 1 13.292-6" /><circle cx="10" cy="8" r="5" /><path d="m16 19 2 2 4-4" /></> : <><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.991 5.727a1.94 1.94 0 0 1-2.009 0L2 7" /></>}
  </svg>;
}

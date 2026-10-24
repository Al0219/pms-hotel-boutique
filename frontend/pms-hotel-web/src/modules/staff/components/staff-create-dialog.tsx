'use client';
import { useState } from 'react';
import { Button, Modal } from '@/shared/components';
import type { StaffSession } from '@/modules/auth';
import type { PropertyScope } from '@/modules/properties';
import type { StaffAdminContext, StaffAdminUser } from '../model/staff-admin';
import type { StaffAdminCreateDTO } from '../dtos/staff-admin-create.dto';
import { useStaffCreate } from '../hooks/use-staff-create';
import styles from './staff-admin.module.css';

export function StaffCreateDialog({ session, scope, context, onClose, onCreated }: {
  session: StaffSession; scope: PropertyScope; context: StaffAdminContext; onClose: () => void; onCreated: (user: StaffAdminUser) => void;
}) {
  const [draft, setDraft] = useState<StaffAdminCreateDTO>({ username: '', workEmail: '', roleCode: 'RECEPCION', propertyIds: scope.kind === 'PROPERTY' ? [...scope.propertyIds] : [] });
  const create = useStaffCreate(session, scope, context.organizationId, onCreated);
  const locked = create.busy || create.uncertain;
  const closingBlocked = create.busy || (create.uncertain && !create.verifiedExisting);
  return <Modal title="Crear usuario" busy={closingBlocked} onClose={onClose} footer={<>
    <Button variant="outline" disabled={closingBlocked} onClick={onClose}>Cancelar</Button>
    {create.uncertain ? <Button disabled={create.busy} onClick={() => void create.verify()}>{create.busy ? 'Comprobando…' : 'Comprobar listado'}</Button>
      : <Button type="submit" form="staff-create-form" disabled={create.busy}>{create.busy ? 'Creando…' : 'Crear'}</Button>}
  </>}>
    <form id="staff-create-form" className={styles.createForm} onSubmit={event => { event.preventDefault(); void create.submit(draft); }}>
      <label>Nombre de usuario<input required maxLength={80} autoComplete="off" disabled={locked} value={draft.username} onChange={event => setDraft({ ...draft, username: event.target.value })} /></label>
      <label>Correo laboral<input type="email" required maxLength={50} autoComplete="off" disabled={locked} value={draft.workEmail} onChange={event => setDraft({ ...draft, workEmail: event.target.value })} /></label>
      <label>Rol Staff<select disabled={locked} value={draft.roleCode} onChange={event => setDraft({ ...draft, roleCode: event.target.value as StaffAdminCreateDTO['roleCode'] })}>{context.roles.filter(role => role.code !== 'SUPER_ADMIN').map(role => <option key={role.code} value={role.code}>{role.name}</option>)}</select></label>
      <fieldset disabled={locked}><legend>Propiedades</legend>{session.memberships.filter(property => property.active).map(property => <label key={property.propertyId} className={styles.propertyOption}><input type="checkbox" checked={draft.propertyIds.includes(property.propertyId)} onChange={event => setDraft({ ...draft, propertyIds: event.target.checked ? [...draft.propertyIds, property.propertyId] : draft.propertyIds.filter(id => id !== property.propertyId) })} />{property.name}</label>)}</fieldset>
      <p>La cuenta quedará pendiente de activación y no podrá iniciar sesión.</p>
      {create.message && <p role="alert">{create.message}</p>}
    </form>
  </Modal>;
}

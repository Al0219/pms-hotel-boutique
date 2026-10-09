'use client';
import { useId, useRef, useState } from 'react';
import styles from '@/shared/components/entity-workspace.module.css';
import { useStaffInventoryMutation } from '../hooks/use-staff-inventory-mutation';
import type { RoomTypeCatalogEntry } from '../model/room-catalog';
import { inventoryTextError } from '../model/staff-inventory-command';
import { inventoryErrorMessage } from '../model/inventory-error';

export function StaffInventoryCreate({ resource, propertyId, sessionId, types, onClose, onCreated }: {
  resource: 'room' | 'type'; propertyId: string; sessionId: string; types: RoomTypeCatalogEntry[];
  onClose: () => void; onCreated: () => void;
}) {
  const id = useId(), codeInput = useRef<HTMLInputElement>(null), lock = useRef(false);
  const [code, setCode] = useState(''), [name, setName] = useState(''), [roomTypeId, setRoomTypeId] = useState('');
  const [error, setError] = useState('');
  const mutation = useStaffInventoryMutation(propertyId, sessionId);
  const codeLabel = resource === 'room' ? 'Código de habitación' : 'Código del tipo';
  return <form aria-label={resource === 'room' ? 'Crear habitación' : 'Crear tipo de habitación'} className={styles.filters} noValidate
    onSubmit={async event => {
      event.preventDefault(); if (lock.current) return;
      const invalid = inventoryTextError(code, 64) ?? (resource === 'type' ? inventoryTextError(name, 160) : !types.some(type => type.id === roomTypeId) ? 'Selecciona un tipo de esta propiedad.' : undefined);
      if (invalid) { setError(invalid); codeInput.current?.focus(); return; }
      lock.current = true; setError('');
      try { await mutation.mutateAsync(resource === 'room' ? { kind: 'create-room', code, roomTypeId } : { kind: 'create-type', code, name }); onCreated(); }
      catch (reason) { setError(inventoryErrorMessage(reason)); }
      finally { lock.current = false; }
    }}>
    <div className={styles.toolbar}>
      <label className={styles.field} htmlFor={`${id}-code`}>{codeLabel}<input id={`${id}-code`} ref={codeInput} autoFocus value={code} maxLength={64} disabled={mutation.isPending} aria-invalid={!!inventoryTextError(code, 64) && !!error} onChange={event => setCode(event.target.value)} /></label>
      {resource === 'type' ? <label className={styles.field} htmlFor={`${id}-name`}>Nombre del tipo<input id={`${id}-name`} value={name} maxLength={160} disabled={mutation.isPending} onChange={event => setName(event.target.value)} /></label>
        : <label className={styles.field} htmlFor={`${id}-type`}>Tipo de habitación<select id={`${id}-type`} value={roomTypeId} disabled={mutation.isPending || !types.length} onChange={event => setRoomTypeId(event.target.value)}>
          <option value="" disabled>Selecciona un tipo</option>{types.map(type => <option key={type.id} value={type.id}>{type.name} · {type.code}</option>)}
        </select></label>}
      <button type="submit" className={styles.button} disabled={mutation.isPending || (resource === 'room' && !types.length)}>{mutation.isPending ? 'Guardando…' : 'Guardar'}</button>
      <button type="button" className={styles.button} disabled={mutation.isPending} onClick={onClose}>Cancelar</button>
    </div>
    {resource === 'room' && !types.length && <p role="status">Crea primero un tipo de habitación en la pestaña de tipos.</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </form>;
}

'use client';
import { useRef, useState, type FormEvent } from 'react';
import { Modal } from '@/shared/components';
import type { RoomCatalogChange, RoomCatalogSnapshot } from '../model/room-catalog';
import { catalogFieldError } from '../model/room-catalog';
import styles from './room-catalog.module.css';

export function RoomCatalogEditor({ kind, id, data, busy, error, onSubmit, onClose }: {
  kind: RoomCatalogChange['kind']; id?: string; data: RoomCatalogSnapshot; busy: boolean; error?: string;
  onSubmit: (change: RoomCatalogChange) => void; onClose: () => void;
}) {
  const isType = kind.endsWith('type'), editing = kind.startsWith('edit');
  const selected = isType ? data.types.find(item => item.id === id) : data.rooms.find(item => item.id === id);
  const [code, setCode] = useState(selected?.code ?? '');
  const [name, setName] = useState(selected && 'name' in selected ? selected.name : '');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null), nameInput = useRef<HTMLInputElement>(null), typeInput = useRef<HTMLSelectElement>(null);
  const codeError = catalogFieldError(code, 64), nameError = isType ? catalogFieldError(name, 160) : undefined;
  const typeError = kind === 'create-room' && !data.types.some(item => item.id === roomTypeId) ? 'Selecciona un tipo de esta propiedad.' : undefined;
  const title = `${editing ? 'Editar' : isType ? 'Nuevo' : 'Nueva'} ${isType ? 'tipo de habitación' : 'habitación'}`;
  function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setSubmitted(true);
    if (codeError || nameError || typeError) { (codeError ? codeInput.current : nameError ? nameInput.current : typeInput.current)?.focus(); return; }
    if (kind === 'create-type') onSubmit({ kind, code:code.trim(), name:name.trim() });
    if (kind === 'edit-type' && id) onSubmit({ kind, id, code:code.trim(), name:name.trim() });
    if (kind === 'create-room') onSubmit({ kind, code:code.trim(), roomTypeId });
    if (kind === 'edit-room' && id) onSubmit({ kind, id, code:code.trim() });
  }
  return <Modal title={title} busy={busy} onClose={onClose} initialFocusRef={codeInput}>
    <form className={styles.form} onSubmit={submit} noValidate aria-busy={busy}>
      <label htmlFor="catalog-code">{isType ? 'Código del tipo' : 'Número / código de habitación'}</label>
      <input ref={codeInput} id="catalog-code" value={code} required maxLength={64} disabled={busy} autoComplete="off" aria-invalid={submitted && Boolean(codeError)} aria-describedby={submitted && codeError ? 'catalog-code-error' : undefined} onChange={event => setCode(event.target.value)} placeholder={isType ? 'DLX-KING' : '204'} />
      {submitted && codeError && <small id="catalog-code-error" className={styles.error}>{codeError}</small>}
      {isType && <><label htmlFor="catalog-name">Nombre del tipo</label><input ref={nameInput} id="catalog-name" required maxLength={160} value={name} disabled={busy} aria-invalid={submitted && Boolean(nameError)} aria-describedby={submitted && nameError ? 'catalog-name-error' : undefined} onChange={event => setName(event.target.value)} placeholder="Deluxe King" />{submitted && nameError && <small id="catalog-name-error" className={styles.error}>{nameError}</small>}</>}
      {kind === 'create-room' && <><label htmlFor="catalog-type">Tipo de habitación</label><select ref={typeInput} id="catalog-type" required value={roomTypeId} disabled={busy} aria-invalid={submitted && Boolean(typeError)} aria-describedby={submitted && typeError ? 'catalog-type-error' : undefined} onChange={event => setRoomTypeId(event.target.value)}><option value="">Selecciona un tipo</option>{data.types.map(type => <option key={type.id} value={type.id}>{type.name} · {type.code}</option>)}</select>{submitted && typeError && <small id="catalog-type-error" className={styles.error}>{typeError}</small>}</>}
      {editing && !isType && <p>La edición conserva el tipo de habitación y su identidad física.</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}><button type="button" disabled={busy} onClick={onClose}>Cancelar</button><button className={styles.primary} type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button></div>
    </form>
  </Modal>;
}

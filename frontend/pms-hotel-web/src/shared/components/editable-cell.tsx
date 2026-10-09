'use client';
import { useId, useRef, useState, type ReactNode } from 'react';
import styles from './entity-workspace.module.css';

/** Inline draft only; the saved value always comes from the caller's confirmed Domain. */
export function EditableCell({ value, label, maxLength, onSave, getError, displayValue }: {
  value: string; label: string; maxLength: number; onSave: (value: string) => Promise<unknown>;
  getError: (error: unknown) => string; displayValue?: ReactNode;
}) {
  const id = useId(), trigger = useRef<HTMLButtonElement>(null), lock = useRef(false);
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(false);
  const close = () => { if (lock.current) return; setEditing(false); setError(''); queueMicrotask(() => trigger.current?.focus()); };
  return <div className={styles.editable}>
    <button type="button" ref={trigger} className={styles.cellButton} hidden={editing}
      aria-label={`Editar ${label}`} onClick={() => { setDraft(value); setError(''); setSuccess(false); setEditing(true); }}>
      {displayValue ?? value}<span className={styles.editHint} aria-hidden="true">Editar</span>
    </button>
    {editing && <form className={styles.inlineEditor} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }}
      onSubmit={async event => {
        event.preventDefault(); if (lock.current) return;
        if (!draft.trim() || draft.length > maxLength) { setError(`Introduce un valor de 1 a ${maxLength} caracteres.`); return; }
        lock.current = true; setSaving(true); setError('');
        try { await onSave(draft); setEditing(false); setSuccess(true); queueMicrotask(() => trigger.current?.focus()); }
        catch (reason) { setError(getError(reason)); }
        finally { lock.current = false; setSaving(false); }
      }}>
      <label htmlFor={id}>{label}</label>
      <input id={id} autoFocus value={draft} maxLength={maxLength} disabled={saving} aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined} onChange={event => setDraft(event.target.value)} />
      <div className={styles.actions}>
        <button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" disabled={saving} onClick={close}>Cancelar</button>
      </div>
      <small>Valor actual: {value}</small>
      {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
    </form>}
    {success && <small className={styles.success} role="status">Guardado.</small>}
  </div>;
}

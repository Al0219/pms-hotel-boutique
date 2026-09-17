"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import styles from "./confirm-dialog.module.css";

interface ConfirmDialogProps {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  /** Variante destructiva: el botón de confirmación usa el estilo de riesgo. */
  destructive?: boolean;
  /** Deshabilita acciones y evita el cierre por ESC/backdrop durante el submit. */
  busy?: boolean;
  /** Etiqueta del botón de confirmación mientras sube el submit. */
  busyLabel?: string;
  /** Gating por validación del contenido (p.ej. ningún candidato seleccionado). */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Mientras la variante shared (IMP-WEB-S302) no esté autorizada, este diálogo es
 * la implementación local del módulo stays. No es public API.
 */
export function ConfirmDialog({ title, body, confirmLabel, destructive = false, busy = false, busyLabel = "Confirmando…", confirmDisabled = false, onConfirm, onCancel }: Readonly<ConfirmDialogProps>) {
  const titleId = `confirm-dialog-${useId()}`;
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel();
        }
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={styles.header}>
          <h2 id={titleId}>{title}</h2>
        </header>
        <div className={styles.body}>{body}</div>
        <footer className={styles.actions}>
          <button className={styles.secondaryButton} type="button" onClick={onCancel} disabled={busy}>
            Volver
          </button>
          <button
            ref={confirmRef}
            className={destructive ? styles.confirmButtonDestructive : styles.confirmButtonPrimary}
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
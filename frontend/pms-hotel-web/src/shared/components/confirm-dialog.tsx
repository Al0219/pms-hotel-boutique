"use client";

import { useRef, type ReactNode } from "react";

import { Modal } from "./modal";
import styles from "./confirm-dialog.module.css";

export interface ConfirmDialogProps {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  /** Etiqueta del botón de confirmación mientras sube el submit. */
  busyLabel: string;
  /** Variante destructiva: el botón de confirmación usa el estilo de riesgo. */
  destructive?: boolean;
  /** Deshabilita acciones y evita el cierre por ESC/backdrop durante el submit. */
  busy?: boolean;
  /** Gating por validación del contenido (p.ej. ningún candidato seleccionado). */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación modal genérica sin reglas de dominio. Los módulos la consumen vía
 * `@/shared/components`; no define copy ni validaciones propias del dominio.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busyLabel,
  destructive = false,
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: Readonly<ConfirmDialogProps>) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      title={title}
      busy={busy}
      onClose={onCancel}
      initialFocusRef={confirmRef}
      footer={
        <>
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
        </>
      }
    >
      {body}
    </Modal>
  );
}

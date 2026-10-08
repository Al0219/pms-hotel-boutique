"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./security.module.css";

const links = [
  ["/seguridad/roles", "Roles / Permisos"], ["/seguridad/privacidad", "Privacy / Consent"],
  ["/seguridad/sesiones", "Security / Sessions"], ["/seguridad/mfa", "MFA"],
] as const;
export function SecurityFrame({ title, description, children, dirty = false }: {
  title: string; description: string; children: ReactNode; dirty?: boolean;
}) {
  const pathname = usePathname();
  return <div className={styles.layout} onClickCapture={event => {
    const link = (event.target as HTMLElement).closest("a");
    if (dirty && link && !window.confirm("Hay cambios sin guardar. ¿Salir y descartarlos?")) event.preventDefault();
  }}>
    <aside className={styles.sidebar} aria-label="Navegación de seguridad">
      <strong>Hotel Boutique</strong><small>ADMINISTRACIÓN</small>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/seguridad/roles">Roles / Permisos</Link>
      <Link href="/seguridad/auditoria">Auditoría</Link>
      <p>Private 07 · Seguridad</p>
    </aside>
    <section className={styles.content} aria-labelledby="security-title">
      <header><p className={styles.eyebrow}>SEGURIDAD · PRIVACIDAD · ACCESO</p><h1 id="security-title">{title}</h1><p>{description}</p></header>
      <nav className={styles.tabs} aria-label="Security / Privacy / Access">
        {links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
      </nav>
      <p className={styles.demo}>Demostración local · datos ficticios · sin autenticación ni permisos reales de servidor.</p>
      {children}
    </section>
  </div>;
}
export function DemoLoadState({ pending, error, retry, reset, busy, offline = false }: {
  pending: boolean; error: boolean; retry: () => void; reset: () => void; busy: boolean; offline?: boolean;
}) {
  if (offline) return <p role="status">Sin conexión. La carga continuará al recuperar la conexión.</p>;
  if (pending) return <p role="status">Cargando datos de demostración…</p>;
  if (!error) return null;
  return <section aria-label="Error al cargar">
    <p role="alert">No se pudieron cargar los datos. Comprueba la conexión y la disponibilidad del almacenamiento local.</p>
    <button type="button" disabled={busy} onClick={retry}>Reintentar carga</button>{" "}
    <button type="button" disabled={busy} onClick={() => {
      if (window.confirm("¿Restablecer los datos locales de esta sección? Se perderán sus cambios guardados de demostración.")) reset();
    }}>Restablecer esta demostración</button>
  </section>;
}
export function DemoFeedback({ pending, error, notice, retry, offline = false }: {
  pending: boolean; error: boolean; notice: string; retry: () => void; offline?: boolean;
}) {
  return <div aria-live="polite">
    {pending ? <p role="status">{offline ? "Sin conexión. El guardado está pendiente y continuará al reconectar." : "Guardando…"}</p> : error ? <div role="alert"><p>No se pudo guardar. El último estado confirmado se conserva.</p><button type="button" onClick={retry}>Reintentar operación</button></div> : <p role="status">{notice}</p>}
  </div>;
}

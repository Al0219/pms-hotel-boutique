"use client";
import Link from "next/link";
import { useState } from "react";
import { useSecurity } from "../hooks/use-security";
import type { SecurityAction } from "../model/security";
import { SecurityFrame, DemoLoadState, DemoFeedback } from "./security-frame";
import styles from "./security.module.css";

export function SessionsPage() {
  const { query, mutation } = useSecurity();
  const [notice, setNotice] = useState("");
  const data = query.data;
  const active = data?.sessions.filter(session => session.status === "active") ?? [];
  const closed = data && !active.some(session => session.current);
  function act(action: SecurityAction) {
    setNotice("");
    mutation.mutate(action, { onSuccess: () => setNotice(action.type === "restart" ? "Nueva demostración iniciada." : action.type === "reset" ? "Datos de ejemplo restablecidos." : "Cierre guardado. La sesión Guest permanece independiente.") });
  }
  return <SecurityFrame title="Security / Sessions" description="Revisa las sesiones activas simuladas y su estado de seguridad.">
    <DemoLoadState offline={query.fetchStatus === "paused"} pending={query.isPending} error={query.isError} busy={mutation.isPending} retry={() => { void query.refetch(); }} reset={() => act({ type: "reset" })} />
    {data && <>
      <section className={styles.card}><h2>Estado de seguridad</h2><p>Sesión Staff: <strong>{closed ? "Cerrada" : "Activa"}</strong></p>
        <p>MFA: <strong>{data.mfaEnabled ? "Activada (simulación)" : "Desactivada"}</strong></p><Link href="/seguridad/mfa">Configurar MFA</Link>
      </section>
      {closed && <section className={styles.card}><h2>Sesión de demostración cerrada</h2><p>El cierre permanece al recargar. Inicia otra demostración para gestionar las sesiones de ejemplo.</p>
        <button type="button" disabled={mutation.isPending} onClick={() => act({ type: "restart" })}>Iniciar otra demostración</button></section>}
      <section className={styles.card} aria-labelledby="sessions-title"><h2 id="sessions-title">Sesiones activas ({active.length})</h2>
        {!active.length && <p>No hay sesiones activas.</p>}
        <button type="button" disabled={mutation.isPending || !!closed || !active.some(session => !session.current)}
          onClick={() => { if (window.confirm("¿Cerrar todas las otras sesiones simuladas?")) act({ type: "revoke-others" }); }}>Cerrar las demás sesiones</button>
        {active.map(session => <article key={session.id} className={styles.row}><div><h3>{session.device}</h3>
          {session.current && <span className={styles.badge}>Sesión actual</span>}
          <p>{session.browser} · Activa</p><p className={styles.meta}>Última actividad: <time dateTime={session.lastActive.toISOString()}>{session.lastActive.toLocaleString("es-GT")}</time></p></div>
          <button type="button" disabled={mutation.isPending || !!closed} aria-label={`Cerrar ${session.current ? "sesión actual" : session.device}`}
            onClick={() => { if (window.confirm(session.current ? "¿Cerrar la sesión Staff de esta demostración?" : "¿Cerrar esta sesión simulada?")) act({ type: "revoke", id: session.id }); }}>
            {session.current ? "Cerrar sesión actual" : "Cerrar sesión"}</button>
        </article>)}
      </section>
    </>}
    <DemoFeedback offline={mutation.isPaused} pending={mutation.isPending} error={mutation.isError} notice={notice} retry={() => { if (mutation.variables) act(mutation.variables); }} />
  </SecurityFrame>;
}


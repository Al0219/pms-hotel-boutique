"use client";
import Link from "next/link";
import { useState } from "react";
import { useSecurity } from "../hooks/use-security";
import type { SecurityAction } from "../model/security";
import { SecurityFrame, DemoLoadState, DemoFeedback } from "./security-frame";
import styles from "./security.module.css";

export function MfaPage() {
  const { query, mutation } = useSecurity();
  const [enrolling, setEnrolling] = useState(false);
  const [notice, setNotice] = useState("");
  const closed = query.data && !query.data.sessions.some(session => session.current && session.status === "active");
  function act(action: SecurityAction) {
    setNotice("");
    mutation.mutate(action, { onSuccess: () => { setEnrolling(false); setNotice("Estado de MFA guardado en esta demostración."); } });
  }
  return <SecurityFrame title="Autenticación multifactor" description="Configura y consulta el estado de MFA de la demostración.">
    <DemoLoadState offline={query.fetchStatus === "paused"} pending={query.isPending} error={query.isError} busy={mutation.isPending} retry={() => { void query.refetch(); }} reset={() => act({ type: "reset" })} />
    {query.data && <section className={styles.card}>
      <h2>MFA · {enrolling ? "Configuración pendiente" : query.data.mfaEnabled ? "Activada" : "Desactivada"}</h2>
      <p>Esta simulación no protege una cuenta real. No requiere códigos, semillas ni una aplicación autenticadora.</p>
      {closed ? <p>La sesión Staff de demostración está cerrada. <Link href="/seguridad/sesiones">Ir a sesiones para iniciar otra demostración</Link>.</p> :
        <fieldset className={styles.unbordered} disabled={mutation.isPending}>
          {enrolling ? <>
            <p>Confirma para guardar únicamente el estado de activación de ejemplo.</p>
            <div className={styles.actions}><button type="button" className={styles.primary} onClick={() => act({ type: "mfa", enabled: true })}>Confirmar activación simulada</button>
              <button type="button" onClick={() => { setEnrolling(false); mutation.reset(); setNotice("Configuración cancelada."); }}>Cancelar configuración</button></div>
          </> : query.data.mfaEnabled ?
            <button type="button" onClick={() => { if (window.confirm("¿Desactivar MFA en esta demostración?")) act({ type: "mfa", enabled: false }); }}>Desactivar MFA</button> :
            <button type="button" onClick={() => { setEnrolling(true); mutation.reset(); setNotice(""); }}>Configurar MFA</button>}
        </fieldset>}
      <h3>Recuperación de acceso</h3><p>Referencia informativa: esta demostración no emite códigos de recuperación ni recupera cuentas reales.</p>
    </section>}
    <DemoFeedback offline={mutation.isPaused} pending={mutation.isPending} error={mutation.isError} notice={notice} retry={() => { if (mutation.variables) act(mutation.variables); }} />
  </SecurityFrame>;
}


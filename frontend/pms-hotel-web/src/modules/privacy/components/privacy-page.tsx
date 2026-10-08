"use client";
import { useState } from "react";
import { SecurityFrame, DemoLoadState, DemoFeedback } from "@/modules/security";
import { usePrivacy } from "../hooks/use-privacy";
import type { PrivacyAction } from "../model/privacy";

export function PrivacyPage() {
  const { query, mutation } = usePrivacy();
  const [notice, setNotice] = useState("");
  function act(action: PrivacyAction) {
    setNotice("");
    mutation.mutate(action, { onSuccess: () => setNotice(action.type === "request" ? "Solicitud simulada registrada como pendiente." : action.type === "reset" ? "Datos de ejemplo restablecidos." : "Consentimiento actualizado y guardado.") });
  }
  return <SecurityFrame title="Privacy / Consent" description="Gestiona finalidades y canales de consentimiento de forma independiente.">
    <DemoLoadState offline={query.fetchStatus === "paused"} pending={query.isPending} error={query.isError} busy={mutation.isPending} retry={() => { void query.refetch(); }} reset={() => act({ type: "reset" })} />
    {query.data && <section aria-label="Centro de privacidad">
      <section aria-labelledby="consent-title"><h2 id="consent-title">Consentimientos</h2>
        <p>Datos del huésped de ejemplo. Desactivar SMS conserva la preferencia de Email.</p>
        {!query.data.consents.length && <p>No hay consentimientos registrados.</p>}
        {query.data.consents.map(consent => <fieldset key={consent.id} disabled={mutation.isPending}>
          <legend>{consent.purpose} · {consent.channel}</legend>
          <p>{consent.subject} · Finalidad: {consent.purpose}</p>
          <label><input type="checkbox" role="switch" aria-label={`${consent.purpose} ${consent.channel}`} checked={consent.active}
            onChange={() => act({ type: "consent", id: consent.id, active: !consent.active })} />{consent.active ? "Activo" : "Inactivo"}</label>
          <p>Fuente: {consent.source}<br />Actualizado: <time dateTime={consent.updatedAt.toISOString()}>{consent.updatedAt.toLocaleString("es-GT")}</time><br />Evidencia: {consent.evidenceVersion}</p>
        </fieldset>)}
      </section>
      <section aria-labelledby="dsr-title"><h2 id="dsr-title">Solicitudes de privacidad</h2>
        <p>Registra solicitudes de exportación o anonimización simuladas. No se eliminan datos ni se omiten retenciones legales.</p>
        <fieldset disabled={mutation.isPending}><legend>Nueva solicitud de ejemplo</legend>
          {(["export", "anonymize"] as const).map(kind => <p key={kind}><button type="button"
            disabled={query.data.requests.some(request => request.kind === kind && request.status === "pending")}
            onClick={() => { if (window.confirm("¿Registrar esta solicitud simulada como pendiente?")) act({ type: "request", kind }); }}>
            {kind === "export" ? "Solicitar exportación" : "Solicitar anonimización"}</button></p>)}
        </fieldset>
        {!query.data.requests.length ? <p>No hay solicitudes pendientes.</p> : <ul>{query.data.requests.map(request =>
          <li key={request.id}>{request.kind === "export" ? "Exportación" : "Anonimización"} · Pendiente · <time dateTime={request.createdAt.toISOString()}>{request.createdAt.toLocaleString("es-GT")}</time></li>)}</ul>}
      </section>
    </section>}
    <DemoFeedback offline={mutation.isPaused} pending={mutation.isPending} error={mutation.isError} notice={notice} retry={() => { if (mutation.variables) act(mutation.variables); }} />
  </SecurityFrame>;
}


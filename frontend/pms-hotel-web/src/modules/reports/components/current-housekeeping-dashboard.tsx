"use client";

import type { PropertyScope } from "@/modules/properties";

import { useCurrentHousekeeping } from "../hooks/use-current-housekeeping";
import styles from "./reports-dashboard.module.css";

interface Props {
  sessionId: string;
  scope: PropertyScope;
  propertyNames: Record<string, string>;
  onBack: () => void;
}

export function CurrentHousekeepingDashboard({ sessionId, scope, propertyNames, onBack }: Readonly<Props>) {
  const report = useCurrentHousekeeping(sessionId, scope);
  const scopeLabel = scope.kind === "PROPERTY"
    ? `${propertyNames[scope.propertyIds[0]] ?? scope.propertyIds[0]} (${scope.propertyIds[0]})`
    : "Todas tus propiedades autorizadas";
  return <section className={styles.page} aria-labelledby="housekeeping-title">
    <header className={styles.header}>
      <h1 id="housekeeping-title">Reporte · Situación actual de housekeeping</h1>
      <p>Fotografía actual de habitaciones físicas y su estado de limpieza. No representa actividad histórica ni disponibilidad vendible.</p>
      <p>Sin seguimiento significa que no hay estado housekeeping registrado; no equivale a sucia. DND es un indicador transversal y ya está incluido en los estados de limpieza.</p>
      <p>Propiedad: {scopeLabel}</p>
    </header>
    <button className={styles.backButton} type="button" onClick={onBack}>← Reportes</button>
    <div className={styles.toolbar}><button type="button" onClick={() => void report.refetch()} disabled={report.isFetching}>Actualizar estado actual</button></div>
    {report.isPending && <p role="status">Cargando situación actual…</p>}
    {report.isError && <div role="alert"><p>No se pudo consultar housekeeping. Verifica tu sesión, permiso y conexión.</p>
      <button type="button" onClick={() => void report.refetch()}>Reintentar</button></div>}
    {report.isSuccess && <>
      <p>Consultado: {new Date(report.data.calculatedAt).toLocaleString("es-GT", { timeZone: "UTC", timeZoneName: "short" })}.</p>
      {report.data.rows.length === 0 ? <p>No hay propiedades autorizadas con datos para esta consulta.</p> :
        <div className={styles.tableScroll}><table className={styles.reportTable}>
          <caption>Habitaciones físicas y estados actuales de housekeeping por propiedad</caption>
          <thead><tr><th scope="col">Propiedad</th><th scope="col">Zona horaria</th><th scope="col">Físicas</th>
            <th scope="col">Con seguimiento</th><th scope="col">Sin seguimiento</th><th scope="col">Sucias</th>
            <th scope="col">Limpias</th><th scope="col">Inspeccionadas</th><th scope="col">DND</th></tr></thead>
          <tbody>{report.data.rows.map(row => <tr key={row.propertyId}>
            <th scope="row">{propertyNames[row.propertyId] ?? row.propertyId}</th><td>{row.timezone}</td>
            <td>{row.physicalRooms}</td><td>{row.trackedRooms}</td><td>{row.untrackedRooms}</td>
            <td>{row.dirtyRooms}</td><td>{row.cleanRooms}</td><td>{row.inspectedRooms}</td><td>{row.dndRooms}</td>
          </tr>)}</tbody>
        </table></div>}
    </>}
  </section>;
}

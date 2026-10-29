"use client";

import type { PropertyScope } from "@/modules/properties";

import { useCurrentMaintenance } from "../hooks/use-current-maintenance";
import styles from "./reports-dashboard.module.css";

interface Props {
  sessionId: string;
  scope: PropertyScope;
  propertyNames: Record<string, string>;
  onBack: () => void;
}

export function CurrentMaintenanceDashboard({ sessionId, scope, propertyNames, onBack }: Readonly<Props>) {
  const report = useCurrentMaintenance(sessionId, scope);
  const scopeLabel = scope.kind === "PROPERTY"
    ? `${propertyNames[scope.propertyIds[0]] ?? scope.propertyIds[0]} (${scope.propertyIds[0]})`
    : "Todas tus propiedades autorizadas";
  return <section className={styles.page} aria-labelledby="maintenance-title">
    <header className={styles.header}>
      <h1 id="maintenance-title">Reporte · Mantenimiento actual</h1>
      <p>Fotografía de órdenes abiertas o en progreso. No representa actividad histórica, cumplimiento de SLA ni habitaciones fuera de servicio.</p>
      <p>Urgentes y sin asignar son subconjuntos que pueden solaparse. Las órdenes vinculadas a habitación y las de área común dividen el total sin resolver.</p>
      <p>Propiedad: {scopeLabel}</p>
    </header>
    <button className={styles.backButton} type="button" onClick={onBack}>← Reportes</button>
    <div className={styles.toolbar}><button type="button" onClick={() => void report.refetch()} disabled={report.isFetching}>Actualizar estado actual</button></div>
    {report.isPending && <p role="status">Cargando mantenimiento actual…</p>}
    {report.isError && <div role="alert"><p>No se pudo consultar mantenimiento. Verifica tu sesión, permiso y conexión.</p>
      <button type="button" onClick={() => void report.refetch()}>Reintentar</button></div>}
    {report.isSuccess && <>
      <p>Consultado: {new Date(report.data.calculatedAt).toLocaleString("es-GT", { timeZone: "UTC", timeZoneName: "short" })}.</p>
      {report.data.rows.length === 0 ? <p>No hay propiedades autorizadas con datos para esta consulta.</p> :
        <div className={styles.tableScroll}><table className={styles.reportTable}>
          <caption>Órdenes de mantenimiento sin resolver por propiedad</caption>
          <thead><tr><th scope="col">Propiedad</th><th scope="col">Zona horaria</th><th scope="col">Sin resolver</th>
            <th scope="col">Abiertas</th><th scope="col">En progreso</th><th scope="col">Urgentes</th>
            <th scope="col">Sin asignar</th><th scope="col">Con habitación</th><th scope="col">Área común</th></tr></thead>
          <tbody>{report.data.rows.map(row => <tr key={row.propertyId}>
            <th scope="row">{propertyNames[row.propertyId] ?? row.propertyId}</th><td>{row.timezone}</td>
            <td>{row.unresolvedOrders}</td><td>{row.openOrders}</td><td>{row.inProgressOrders}</td>
            <td>{row.urgentUnresolvedOrders}</td><td>{row.unassignedUnresolvedOrders}</td>
            <td>{row.roomLinkedUnresolvedOrders}</td><td>{row.commonAreaUnresolvedOrders}</td>
          </tr>)}</tbody>
        </table></div>}
    </>}
  </section>;
}

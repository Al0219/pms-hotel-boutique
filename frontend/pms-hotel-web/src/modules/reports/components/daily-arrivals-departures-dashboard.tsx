"use client";

import { useState, type FormEvent } from "react";

import type { PropertyScope } from "@/modules/properties";

import { useDailyArrivalsDepartures } from "../hooks/use-daily-arrivals-departures";
import { validArrivalsDeparturesRange } from "../model/daily-arrivals-departures";
import styles from "./reports-dashboard.module.css";

interface Props {
  sessionId: string;
  scope: PropertyScope;
  propertyNames: Record<string, string>;
  onBack: () => void;
}

export function DailyArrivalsDeparturesDashboard({ sessionId, scope, propertyNames, onBack }: Readonly<Props>) {
  const [from, setFrom] = useState(""), [to, setTo] = useState("");
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null);
  const [validationError, setValidationError] = useState(false);
  const [page, setPage] = useState(0);
  const report = useDailyArrivalsDepartures(sessionId, scope, applied?.from ?? null, applied?.to ?? null);
  const pageSize = 100;
  const rowCount = report.data?.rows.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validArrivalsDeparturesRange(from, to)) { setApplied(null); setPage(0); setValidationError(true); return; }
    setValidationError(false);
    setPage(0);
    setApplied({ from, to });
    if (applied?.from === from && applied.to === to) void report.refetch();
  };
  const scopeLabel = scope.kind === "PROPERTY"
    ? `${propertyNames[scope.propertyIds[0]] ?? scope.propertyIds[0]} (${scope.propertyIds[0]})`
    : "Todas tus propiedades autorizadas";

  return <section className={styles.page} aria-labelledby="arrivals-departures-title">
    <header className={styles.header}>
      <h1 id="arrivals-departures-title">Reporte · Llegadas y salidas pendientes</h1>
      <p>Estancias pendientes según sus fechas programadas y estado actual. Cada habitación reservada se cuenta por separado.</p>
      <p>Las salidas incluyen estancias que aún no han ingresado. Cancelaciones y no-shows quedan excluidos.</p>
      <p>Movimientos realizados e histórico no disponibles: faltan fechas efectivas de check-in y check-out.</p>
      <p>Propiedad: {scopeLabel}</p>
    </header>
    <button className={styles.backButton} type="button" onClick={onBack}>← Reportes</button>
    <form className={styles.toolbar} onSubmit={submit}>
      <label><span>Desde (día local)</span><input type="date" value={from} onChange={event => setFrom(event.target.value)} required /></label>
      <label><span>Hasta (día local)</span><input type="date" value={to} onChange={event => setTo(event.target.value)} required /></label>
      <button type="submit">Consultar reporte</button>
    </form>
    {validationError && <p role="alert">Selecciona un rango válido de hasta 366 días.</p>}
    {!applied && !validationError && <p>Selecciona las fechas para consultar el reporte.</p>}
    {applied && <p>Período consultado: {applied.from} a {applied.to}. Fechas inclusivas y locales a cada propiedad.</p>}
    {report.isPending && report.fetchStatus !== "idle" && <p role="status">Cargando reporte…</p>}
    {report.isError && <div role="alert"><p>No se pudo consultar el reporte. Verifica tu sesión, permiso y conexión.</p>
      <button type="button" onClick={() => void report.refetch()}>Reintentar</button></div>}
    {applied && report.isSuccess && <>
      <p>Calculado: {new Date(report.data.calculatedAt).toLocaleString("es-GT")}.</p>
      {report.data.rows.length === 0 ? <p>No hay filas para las fechas y propiedades seleccionadas.</p> :
        <><p>Mostrando {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, rowCount)} de {rowCount} filas.</p>
        <div className={styles.tableScroll}><table className={styles.reportTable}>
          <caption>Llegadas y salidas pendientes por propiedad y día programado</caption>
          <thead><tr><th scope="col">Propiedad</th><th scope="col">Día local</th><th scope="col">Zona horaria</th><th scope="col">Moneda</th>
            <th scope="col">Llegadas pendientes</th><th scope="col">Salidas pendientes</th></tr></thead>
          <tbody>{report.data.rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(row => <tr key={`${row.propertyId}:${row.date}`}>
            <th scope="row">{propertyNames[row.propertyId] ?? row.propertyId}</th><td>{row.date}</td><td>{row.timezone}</td><td>{row.currency}</td>
            <td>{row.pendingArrivals}</td><td>{row.pendingDepartures}</td>
          </tr>)}</tbody>
        </table></div>
        {pageCount > 1 && <nav className={styles.toolbar} aria-label="Páginas del reporte">
          <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</button>
          <span>Página {currentPage + 1} de {pageCount}</span>
          <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
        </nav>}</>}
    </>}
  </section>;
}

"use client";

import { useState, type FormEvent } from "react";

import type { PropertyScope } from "@/modules/properties";

import { useDailyOnBooks } from "../hooks/use-daily-on-books";
import styles from "./reports-dashboard.module.css";

interface Props {
  sessionId: string;
  scope: PropertyScope;
  propertyNames: Record<string, string>;
  onBack?: () => void;
}

interface AppliedRange { from: string; to: string }

function validRange(from: string, to: string): boolean {
  const first = Date.parse(`${from}T00:00:00.000Z`);
  const last = Date.parse(`${to}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) &&
    Number.isFinite(first) && Number.isFinite(last) && first <= last &&
    new Date(first).toISOString().slice(0, 10) === from && new Date(last).toISOString().slice(0, 10) === to &&
    (last - first) / 86_400_000 < 366;
}

export function DailyOnBooksDashboard({ sessionId, scope, propertyNames, onBack }: Readonly<Props>) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<AppliedRange | null>(null);
  const [validationError, setValidationError] = useState(false);
  const report = useDailyOnBooks(sessionId, scope, applied?.from ?? null, applied?.to ?? null);
  const scopeLabel = scope.kind === "PROPERTY"
    ? `${propertyNames[scope.propertyIds[0]] ?? scope.propertyIds[0]} (${scope.propertyIds[0]})`
    : "Todas tus propiedades autorizadas";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validRange(from, to)) {
      setValidationError(true);
      return;
    }
    setValidationError(false);
    setApplied({ from, to });
    if (applied?.from === from && applied.to === to) void report.refetch();
  };

  const single = report.isSuccess && report.data.rows.length === 1 ? report.data.rows[0] : null;

  return <section className={styles.page} aria-labelledby="on-books-title">
    <header className={styles.header}>
      <h1 id="on-books-title">Reporte · Reservaciones on-books por noche</h1>
      <p>Compromiso actual de habitaciones para cada noche de estancia. No representa ocupación realizada ni datos históricos al cierre.</p>
      <p>Propiedad: {scopeLabel}</p>
    </header>
    {onBack && <button className={styles.backButton} type="button" onClick={onBack}>← Reportes</button>}
    <form className={styles.toolbar} onSubmit={submit}>
      <label><span>Desde (noche local)</span><input type="date" value={from} onChange={event => setFrom(event.target.value)} required /></label>
      <label><span>Hasta (noche local)</span><input type="date" value={to} onChange={event => setTo(event.target.value)} required /></label>
      <button type="submit">Consultar reporte</button>
    </form>
    {validationError && <p role="alert">Selecciona un rango válido de hasta 366 noches.</p>}
    {!applied && !validationError && <p>Selecciona las fechas para consultar el reporte.</p>}
    {applied && <p>Período consultado: {applied.from} a {applied.to}.</p>}
    {report.isPending && report.fetchStatus !== "idle" && <p role="status">Cargando reporte…</p>}
    {report.isError && <div role="alert"><p>No se pudo consultar el reporte. Verifica tu sesión, permiso y conexión.</p>
      <button type="button" onClick={() => void report.refetch()}>Reintentar</button></div>}
    {report.isSuccess && report.data.rows.length === 0 && <p>No hay filas para las fechas y propiedades seleccionadas.</p>}
    {report.isSuccess && report.data.rows.length > 0 && <>
      <p>Calculado: {new Date(report.data.calculatedAt).toLocaleString("es-GT")}.</p>
      {single && <section className={styles.kpiGrid} aria-label={`Resumen para ${single.stayDate}`}>
        <div className={styles.kpiCard}><p className={styles.kpiLabel}>Habitaciones disponibles</p><p className={styles.kpiValue}>{single.availableRooms}</p><p className={styles.kpiHint}>{single.stayDate}</p></div>
        <div className={styles.kpiCard}><p className={styles.kpiLabel}>On-books</p><p className={styles.kpiValue}>{single.onBooksRooms}</p><p className={styles.kpiHint}>habitaciones comprometidas</p></div>
        <div className={styles.kpiCard}><p className={styles.kpiLabel}>Fuera de orden</p><p className={styles.kpiValue}>{single.outOfOrderRooms}</p><p className={styles.kpiHint}>habitaciones físicas</p></div>
        <div className={styles.kpiCard}><p className={styles.kpiLabel}>On-books / disponibles</p><p className={styles.kpiValue}>{single.onBooksPercent === null ? "—" : `${single.onBooksPercent.toFixed(2)}%`}</p><p className={styles.kpiHint}>{single.onBooksPercent === null ? "Sin capacidad disponible" : "estado actual"}</p></div>
      </section>}
      <div className={styles.tableScroll}>
        <table className={styles.reportTable}>
          <caption>Habitaciones on-books por propiedad y noche local</caption>
          <thead><tr><th scope="col">Propiedad</th><th scope="col">Noche local</th><th scope="col">Físicas</th>
            <th scope="col">Fuera de orden</th><th scope="col">Disponibles</th><th scope="col">On-books</th>
            <th scope="col">On-books / disponibles</th></tr></thead>
          <tbody>{report.data.rows.map(row => <tr key={`${row.propertyId}:${row.stayDate}`}>
            <th scope="row">{propertyNames[row.propertyId] ?? row.propertyId}</th><td>{row.stayDate}</td>
            <td>{row.physicalRooms}</td><td>{row.outOfOrderRooms}</td><td>{row.availableRooms}</td>
            <td>{row.onBooksRooms}</td><td>{row.onBooksPercent === null ? "No disponible" : `${row.onBooksPercent.toFixed(2)}%`}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
  </section>;
}

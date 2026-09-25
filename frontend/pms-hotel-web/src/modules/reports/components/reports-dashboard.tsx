"use client";

import { useMemo, useState } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { DataTable } from "@/shared/components";

import { usePropertyReports } from "../hooks/use-property-reports";
import type { PropertyReport } from "../model/property-report";
import { summarizeReports } from "../model/property-report";
import { EMPTY_REPORT_FILTERS, filterReports, type ReportFilters } from "../model/report-filters";
import { buildReportsCsv } from "../model/reports-export";
import { SavedReportsPanel } from "./saved-reports-panel";
import styles from "./reports-dashboard.module.css";

interface ReportsDashboardProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Reports contract. */
  endpoint?: string;
}

function formatMoney(amount: number, currency: string): string {
  if (currency === "GTQ") {
    return `Q${amount.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${amount.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ReportsDashboard({ propertyId, endpoint }: Readonly<ReportsDashboardProps>) {
  const { data: reports, error, isLoading, refetch } = usePropertyReports(propertyId, endpoint);
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS);

  const filtered = useMemo(() => filterReports(reports ?? [], filters), [reports, filters]);
  const summary = useMemo(() => summarizeReports(filtered), [filtered]);

  if (!propertyId) {
    return <main className={styles.page} role="status"><h1>Reports</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar reportes.</p></main>;
  }

  if (!endpoint) {
    return <main className={styles.page} role="status"><h1>Reports</h1><p>La consulta de reportes estará disponible al confirmar el contrato API con Backend.</p></main>;
  }

  if (isLoading) {
    return <main className={styles.page} aria-busy="true"><p>Cargando reportes…</p></main>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudieron consultar los reportes."
      : "No se pudieron cargar los reportes.";

    return <main className={styles.page} role="alert"><p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></main>;
  }

  if (!reports?.length) {
    return <main className={styles.page}><h1>Reports</h1><p>No hay reportes para esta propiedad.</p></main>;
  }

  const currency = filtered[0]?.currency ?? reports[0]?.currency ?? "GTQ";

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Reporting</p>
      <h1>Reports</h1>
      <p>Indicadores por propiedad · property scope {propertyId}.</p>
    </header>
    <div className={styles.toolbar}>
      <label>
        <span>Buscar propiedad</span>
        <input
          type="search"
          placeholder="Nombre de la propiedad…"
          value={filters.query}
          onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
        />
      </label>
      <label>
        <span>Desde</span>
        <input
          type="date"
          value={filters.from ?? ""}
          onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value || null }))}
        />
      </label>
      <label>
        <span>Hasta</span>
        <input
          type="date"
          value={filters.to ?? ""}
          onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value || null }))}
        />
      </label>
      <button
        type="button"
        onClick={() => downloadCsv("reportes.csv", buildReportsCsv(filtered))}
        disabled={filtered.length === 0}
      >
        Exportar CSV
      </button>
    </div>
    {filtered.length === 0 ? (
      <p>Sin resultados con los filtros actuales.</p>
    ) : (
      <>
        <section className={styles.kpiGrid} aria-label="Resumen de reportes">
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Ocupación</p>
            <p className={styles.kpiValue}>{formatPercent(summary.avgOccupancy)}</p>
            <p className={styles.kpiHint}>promedio</p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>ADR</p>
            <p className={styles.kpiValue}>{formatMoney(summary.avgAdr, currency)}</p>
            <p className={styles.kpiHint}>promedio</p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>RevPAR</p>
            <p className={styles.kpiValue}>{formatMoney(summary.avgRevpar, currency)}</p>
            <p className={styles.kpiHint}>promedio</p>
          </div>
          <div className={styles.kpiCard}>
            <p className={styles.kpiLabel}>Ingresos totales</p>
            <p className={styles.kpiValue}>{formatMoney(summary.totalRevenue, currency)}</p>
            <p className={styles.kpiHint}>{summary.propertyCount} {summary.propertyCount === 1 ? "propiedad" : "propiedades"}</p>
          </div>
        </section>
        <DataTable
          label="Desglose de métricas por propiedad"
          minWidth={800}
          rows={filtered}
          getRowKey={(report: PropertyReport) => report.propertyId}
          columns={[
            {
              key: "propertyName",
              header: "Propiedad",
              render: (report: PropertyReport) => <strong className={styles.propertyName}>{report.propertyName}</strong>,
            },
            {
              key: "dateRange",
              header: "Período",
              render: (report: PropertyReport) => (
                <span className={styles.period}>
                  {report.dateRange.startDate.toLocaleDateString("es-GT")} – {report.dateRange.endDate.toLocaleDateString("es-GT")}
                </span>
              ),
            },
            {
              key: "occupancy",
              header: "Ocupación",
              render: (report: PropertyReport) => formatPercent(report.metrics.occupancy),
            },
            {
              key: "adr",
              header: "ADR",
              render: (report: PropertyReport) => formatMoney(report.metrics.adr, report.currency),
            },
            {
              key: "revpar",
              header: "RevPAR",
              render: (report: PropertyReport) => formatMoney(report.metrics.revpar, report.currency),
            },
            {
              key: "totalRevenue",
              header: "Ingresos totales",
              render: (report: PropertyReport) => formatMoney(report.metrics.totalRevenue, report.currency),
            },
            {
              key: "rooms",
              header: "Habitaciones",
              render: (report: PropertyReport) => `${report.metrics.roomsSold} / ${report.metrics.roomsAvailable}`,
            },
          ]}
        />
      </>
    )}
    <SavedReportsPanel current={filters} onApply={setFilters} />
  </main>;
}

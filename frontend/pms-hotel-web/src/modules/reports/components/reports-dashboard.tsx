"use client";

import { useMemo } from "react";

import { HttpNetworkError } from "@/lib/http/errors";
import { DataTable } from "@/shared/components";

import { usePropertyReports } from "../hooks/use-property-reports";
import type { PropertyReport } from "../model/property-report";
import { summarizeReports } from "../model/property-report";
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

export function ReportsDashboard({ propertyId, endpoint }: Readonly<ReportsDashboardProps>) {
  const { data: reports, error, isLoading, refetch } = usePropertyReports(propertyId, endpoint);
  const summary = useMemo(() => summarizeReports(reports ?? []), [reports]);

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

  const currency = reports[0]?.currency ?? "GTQ";

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Reporting</p>
      <h1>Reports</h1>
      <p>Indicadores por propiedad · property scope {propertyId}.</p>
    </header>
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
      rows={reports}
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
  </main>;
}

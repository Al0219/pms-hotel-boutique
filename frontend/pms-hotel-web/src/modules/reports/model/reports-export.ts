import type { PropertyReport } from "./property-report";

function csvCell(value: string | number): string {
  const text = `${value}`;
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toDayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Exportación simulada: CSV del desglose por propiedad con punto y coma. */
export function buildReportsCsv(reports: ReadonlyArray<PropertyReport>): string {
  const header = "propiedad;desde;hasta;ocupacion;adr;revpar;ingresos_totales;habitaciones_vendidas;habitaciones_disponibles;moneda";
  const lines = reports.map((report) =>
    [
      report.propertyName,
      toDayKey(report.dateRange.startDate),
      toDayKey(report.dateRange.endDate),
      report.metrics.occupancy,
      report.metrics.adr,
      report.metrics.revpar,
      report.metrics.totalRevenue,
      report.metrics.roomsSold,
      report.metrics.roomsAvailable,
      report.currency,
    ].map(csvCell).join(";"),
  );
  return [header, ...lines].join("\n");
}

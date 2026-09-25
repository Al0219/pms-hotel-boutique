import type { PropertyReport } from "./property-report";

export interface ReportFilters {
  query: string;
  /** YYYY-MM-DD o null (sin cota inferior). */
  from: string | null;
  /** YYYY-MM-DD o null (sin cota superior). */
  to: string | null;
}

export const EMPTY_REPORT_FILTERS: ReportFilters = { query: "", from: null, to: null };

function toDayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Filtra por nombre de propiedad y solape con el rango [from, to].
 * Rangos abiertos (null) no acotan. Sin filtros devuelve la entrada intacta.
 */
export function filterReports(
  reports: ReadonlyArray<PropertyReport>,
  filters: ReportFilters,
): PropertyReport[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return reports.filter((report) => {
    if (normalizedQuery && !report.propertyName.toLowerCase().includes(normalizedQuery)) {
      return false;
    }

    const startKey = toDayKey(report.dateRange.startDate);
    const endKey = toDayKey(report.dateRange.endDate);

    if (filters.from && endKey < filters.from) {
      return false;
    }
    if (filters.to && startKey > filters.to) {
      return false;
    }
    return true;
  });
}

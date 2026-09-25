import type { ReportFilters } from "./report-filters";

export const REPORT_SCHEDULES = ["NONE", "DAILY", "WEEKLY"] as const;

export type ReportSchedule = (typeof REPORT_SCHEDULES)[number];

export interface SavedReport extends ReportFilters {
  id: string;
  name: string;
  schedule: ReportSchedule;
  createdAt: string;
}

const STORAGE_KEY = "pms.saved-reports.v1";

function readAll(): SavedReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedReport[]) : [];
  } catch {
    return [];
  }
}

function writeAll(reports: SavedReport[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

/** Persistencia frontend de vistas guardadas (filtros + programación visual). */
export function loadSavedReports(): SavedReport[] {
  return readAll();
}

export function saveSavedReport(input: { name: string; filters: ReportFilters; schedule: ReportSchedule }): SavedReport {
  const saved: SavedReport = {
    id: `saved-${Date.now()}`,
    name: input.name.trim(),
    query: input.filters.query,
    from: input.filters.from,
    to: input.filters.to,
    schedule: input.schedule,
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), saved]);
  return saved;
}

export function deleteSavedReport(id: string): SavedReport[] {
  const next = readAll().filter((entry) => entry.id !== id);
  writeAll(next);
  return next;
}

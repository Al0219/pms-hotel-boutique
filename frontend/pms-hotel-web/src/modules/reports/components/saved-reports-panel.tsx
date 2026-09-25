"use client";

import { useState } from "react";

import type { ReportFilters } from "../model/report-filters";
import {
  deleteSavedReport,
  loadSavedReports,
  saveSavedReport,
  type ReportSchedule,
  type SavedReport,
} from "../model/saved-report";

import styles from "./reports-dashboard.module.css";

const SCHEDULE_LABELS: Record<ReportSchedule, string> = {
  NONE: "Sin programación",
  DAILY: "Diaria",
  WEEKLY: "Semanal",
};

interface SavedReportsPanelProps {
  current: ReportFilters;
  onApply: (filters: ReportFilters) => void;
}

export function SavedReportsPanel({ current, onApply }: Readonly<SavedReportsPanelProps>) {
  const [saved, setSaved] = useState<SavedReport[]>(() => loadSavedReports());
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState<ReportSchedule>("NONE");

  const save = () => {
    if (!name.trim()) {
      return;
    }
    saveSavedReport({ name, filters: current, schedule });
    setSaved(loadSavedReports());
    setName("");
  };

  return (
    <section className={styles.savedPanel} aria-labelledby="saved-reports-title">
      <h2 id="saved-reports-title">Vistas guardadas</h2>
      <div className={styles.saveRow}>
        <label>
          <span>Nombre de la vista</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Septiembre" />
        </label>
        <label>
          <span>Programación</span>
          <select value={schedule} onChange={(event) => setSchedule(event.target.value as ReportSchedule)}>
            {(Object.keys(SCHEDULE_LABELS) as ReportSchedule[]).map((value) => (
              <option key={value} value={value}>{SCHEDULE_LABELS[value]}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={save} disabled={!name.trim()}>
          Guardar vista
        </button>
      </div>
      {saved.length === 0 ? (
        <p>Sin vistas guardadas. Guarda los filtros actuales para reutilizarlos.</p>
      ) : (
        <ul className={styles.savedList}>
          {saved.map((entry) => (
            <li key={entry.id}>
              <span><strong>{entry.name}</strong><small>{SCHEDULE_LABELS[entry.schedule]}</small></span>
              <div>
                <button
                  type="button"
                  onClick={() => onApply({ query: entry.query, from: entry.from, to: entry.to })}
                >
                  Aplicar
                </button>
                <button
                  type="button"
                  onClick={() => setSaved(deleteSavedReport(entry.id))}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

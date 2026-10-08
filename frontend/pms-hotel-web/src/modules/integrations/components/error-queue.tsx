"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { HttpNetworkError, HttpStatusError } from "@/lib/http/errors";

import { useIntegrationErrors, useRetryIntegrationError } from "../hooks/use-integration-errors";
import { canRetryError, type IntegrationError, type IntegrationErrorStatus } from "../model/integration-error";

import styles from "./integration-center.module.css";

const STATUS_OPTIONS: ReadonlyArray<{ value: IntegrationErrorStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "RETRYING", label: "Reintentando" },
  { value: "RESOLVED", label: "Resueltos" },
  { value: "FAILED", label: "Fallidos" },
];

const STATUS_LABELS: Record<IntegrationErrorStatus, string> = {
  PENDING: "Pendiente",
  RETRYING: "Reintentando",
  RESOLVED: "Resuelto",
  FAILED: "Fallido",
};

interface ErrorQueueProps {
  /** Must be resolved from the authorized staff session by the app composition layer. */
  propertyId?: string;
  /** Must be supplied only after Backend approves the provisional Error Queue contract. */
  endpoint?: string;
  /** Optional deep link from the Integration Center detail. */
  initialIntegrationId?: string;
}

function newIdempotencyKey(errorId: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${errorId}-${Date.now()}`;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("es-GT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(".", "");
}

function retryErrorMessage(error: unknown): string {
  if (error instanceof HttpNetworkError) {
    return "Sin conexión. No se pudo reintentar.";
  }
  if (error instanceof HttpStatusError && error.status === 409) {
    return "Ya resuelto o en curso: el reintento no duplicó efectos.";
  }
  if (error instanceof HttpStatusError && error.status === 422) {
    return "No reintentable: requiere intervención manual.";
  }
  return "No se pudo reintentar el error.";
}

function ErrorDetail({ entry, onRetry, retryState }: Readonly<{
  entry: IntegrationError;
  onRetry: () => void;
  retryState: { isPending: boolean; isError: boolean; error: unknown };
}>) {
  return (
    <section className={styles.detailCard} aria-labelledby="error-detail-title">
      <h2 id="error-detail-title">{entry.id}</h2>
      <p>{entry.message}</p>
      <dl className={styles.detailGrid}>
        <div><dt>Integración</dt><dd>{entry.integrationProvider}</dd></div>
        <div><dt>Tipo</dt><dd>{entry.kind}</dd></div>
        <div><dt>Estado</dt><dd>{STATUS_LABELS[entry.status]}</dd></div>
        <div><dt>Intentos</dt><dd>{entry.attempts}/{entry.maxAttempts}</dd></div>
        <div><dt>Último intento</dt><dd>{entry.lastAttemptAt ? formatDateTime(entry.lastAttemptAt) : "Nunca"}</dd></div>
      </dl>
      <h3 className={styles.capabilitiesTitle}>Historial</h3>
      {entry.history.length > 0 ? (
        <ol className={styles.historyList}>
          {entry.history.map((event, index) => (
            <li key={`${event.status}-${index}`}>
              <strong>{STATUS_LABELS[event.status]}</strong>
              <span> · {formatDateTime(event.at)}{event.note ? ` · ${event.note}` : ""}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.muted}>Sin intentos registrados.</p>
      )}
      {canRetryError(entry) ? (
        <button type="button" onClick={onRetry} disabled={retryState.isPending}>
          {retryState.isPending ? "Reintentando…" : "Reintentar"}
        </button>
      ) : (
        <p className={styles.muted}>
          {entry.status === "RESOLVED" ? "Resuelto: no admite más reintentos." : "No reintentable: requiere intervención manual."}
        </p>
      )}
      {retryState.isError ? <p role="alert">{retryErrorMessage(retryState.error)}</p> : null}
    </section>
  );
}

export function ErrorQueue({ propertyId, endpoint, initialIntegrationId }: Readonly<ErrorQueueProps>) {
  const { data: errors, error, isLoading, refetch } = useIntegrationErrors(propertyId, endpoint);
  const retryMutation = useRetryIntegrationError(propertyId, endpoint);
  const [statusFilter, setStatusFilter] = useState<IntegrationErrorStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [integrationFilter, setIntegrationFilter] = useState<string>(initialIntegrationId ?? "ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const integrations = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of errors ?? []) {
      if (!map.has(entry.integrationId)) {
        map.set(entry.integrationId, entry.integrationProvider);
      }
    }
    return [...map.entries()];
  }, [errors]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (errors ?? []).filter((entry) => {
      if (statusFilter !== "ALL" && entry.status !== statusFilter) {
        return false;
      }
      if (integrationFilter !== "ALL" && entry.integrationId !== integrationFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return [entry.id, entry.message, entry.kind, entry.integrationProvider]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [errors, statusFilter, integrationFilter, query]);

  if (!propertyId) {
    return <main className={styles.page} role="status"><h1>Cola de errores</h1><p>La sesión debe proporcionar un scope de propiedad autorizado antes de consultar la cola.</p></main>;
  }

  if (!endpoint) {
    return <main className={styles.page} role="status"><h1>Cola de errores</h1><p>La cola de errores estará disponible al confirmar el contrato API con Backend.</p></main>;
  }

  if (isLoading) {
    return <main className={styles.page} aria-busy="true"><h1>Cola de errores</h1><p>Cargando cola de errores…</p></main>;
  }

  if (error) {
    const message = error instanceof HttpNetworkError
      ? "Sin conexión. No se pudo consultar la cola de errores."
      : "No se pudo cargar la cola de errores.";
    return <main className={styles.page} role="alert"><h1>Cola de errores</h1><p>{message}</p><button type="button" onClick={() => void refetch()}>Reintentar</button></main>;
  }

  if (!errors?.length) {
    return <main className={styles.page}><h1>Cola de errores</h1><p>No hay errores registrados para esta propiedad.</p></main>;
  }

  const selected = filtered.find((entry) => entry.id === selectedId) ?? null;
  const pendingCount = errors.filter((entry) => entry.status === "PENDING").length;
  const resolvedCount = errors.filter((entry) => entry.status === "RESOLVED").length;

  return <main className={styles.page}>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Integraciones</p>
      <h1>Cola de errores</h1>
      <p>{pendingCount} pendientes · {resolvedCount} resueltos · reintento idempotente sin duplicar efectos.</p>
      <p><Link className={styles.errorsLink} href="/integraciones">Volver al Integration Center</Link></p>
    </header>
    <div className={styles.filters}>
      <label>
        <span className={styles.filterLabel}>Estado</span>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as IntegrationErrorStatus | "ALL")}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        <span className={styles.filterLabel}>Integración</span>
        <select value={integrationFilter} onChange={(event) => setIntegrationFilter(event.target.value)}>
          <option value="ALL">Todas</option>
          {integrations.map(([id, provider]) => (
            <option key={id} value={id}>{provider}</option>
          ))}
        </select>
      </label>
      <label>
        <span className={styles.filterLabel}>Buscar</span>
        <input
          type="search"
          placeholder="Buscar por código, mensaje o tipo…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
    </div>
    {filtered.length === 0 ? (
      <p>Sin resultados con los filtros actuales.</p>
    ) : (
      <ul className={styles.errorList}>
        {filtered.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className={styles.errorButton}
              aria-pressed={entry.id === selected?.id}
              onClick={() => {
                retryMutation.reset();
                setSelectedId(entry.id);
              }}
            >
              <span><strong>{entry.id}</strong><small>{entry.integrationProvider} · {entry.kind}</small></span>
              <span className={styles.badge}>{STATUS_LABELS[entry.status]}</span>
            </button>
          </li>
        ))}
      </ul>
    )}
    {selected ? (
      <ErrorDetail
        entry={selected}
        onRetry={() => retryMutation.mutate({ errorId: selected.id, idempotencyKey: newIdempotencyKey(selected.id) })}
        retryState={{ isPending: retryMutation.isPending, isError: retryMutation.isError, error: retryMutation.error }}
      />
    ) : null}
  </main>;
}

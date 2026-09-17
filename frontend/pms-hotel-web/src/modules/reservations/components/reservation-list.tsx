"use client";

import { useMemo, useState } from "react";

import type { ReservationListItem, ReservationStatus } from "../model/reservation-summary";

import styles from "./reservation-list.module.css";

const PAGE_SIZE = 5;

const STATUS_OPTIONS: ReadonlyArray<{ value: ReservationStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Todas" },
  { value: "CONFIRMED", label: "Confirmadas" },
  { value: "PENDING", label: "Pendientes" },
  { value: "WAITLIST", label: "Waitlist" },
  { value: "NO_SHOW_PENDING", label: "No-show pendiente" },
  { value: "NO_SHOW", label: "No-show" },
];

const STATUS_LABELS: Record<ReservationStatus, string> = {
  CONFIRMED: "Confirmada",
  PENDING: "Pendiente",
  WAITLIST: "Waitlist",
  NO_SHOW_PENDING: "No-show pendiente",
  NO_SHOW: "No-show",
};

const STATUS_BADGE: Record<ReservationStatus, string> = {
  CONFIRMED: styles.statusConfirmed,
  PENDING: styles.statusPending,
  WAITLIST: styles.statusWaitlist,
  NO_SHOW_PENDING: styles.statusNoShow,
  NO_SHOW: styles.statusNoShow,
};

function formatMoney(amount: number, currency: string): string {
  const symbol = currency.toUpperCase() === "GTQ" ? "Q" : currency;
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("es-GT", { day: "numeric", month: "short" }).replace(".", "");
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function financeLine(item: ReservationListItem): string {
  const { finance } = item;
  const total = `Total ${formatMoney(finance.totalAmount, item.currency)}`;

  switch (finance.financeState) {
    case "ESTIMATED":
      return `Tarifa estimada ${formatMoney(finance.totalAmount, item.currency)}`;
    case "PAID":
      return `${total} · Pagado`;
    case "BALANCE": {
      const pending = finance.paidAmount === null ? 0 : Math.max(finance.totalAmount - finance.paidAmount, 0);
      return `${total} · Pendiente ${formatMoney(pending, item.currency)}`;
    }
    case "DEPOSIT":
      return `${total} · Depósito ${formatMoney(finance.paidAmount ?? 0, item.currency)}`;
    case "NO_CAPTURE":
      return `${total} · Sin captura`;
  }
}

function buildPageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 6) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);
  return pages;
}

interface ReservationListProps {
  reservations: ReadonlyArray<ReservationListItem>;
}

export function ReservationList({ reservations }: Readonly<ReservationListProps>) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reservations.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [item.id, item.guestName, item.sourceLabel, item.roomLabel ?? ""]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [reservations, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <section className={styles.panel} aria-label="Lista de reservas de la propiedad">
      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <span className={styles.visuallyHidden}>Buscar reservas</span>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Buscar por código, huésped, canal, habitación..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className={styles.filterField}>
          <span className={styles.visuallyHidden}>Filtrar por estado</span>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as ReservationStatus | "ALL");
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {pageItems.length === 0 ? (
        <p className={styles.emptyResults}>{filtered.length === 0 ? "Sin resultados con los filtros actuales." : "No hay reservas para esta propiedad."}</p>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Reserva / Huésped</th>
                  <th scope="col">Estadía / Canal</th>
                  <th scope="col">Finanzas / Alerta</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong className={styles.reference}>{item.id}</strong>
                      <span className={styles.guestName}>{item.guestName}</span>
                    </td>
                    <td>
                      <p className={styles.cellLine}>{item.sourceLabel}{item.roomLabel ? ` · ${item.roomLabel}` : ""}</p>
                      {item.sourceReference ? <p className={styles.cellMuted}>{item.sourceReference}</p> : null}
                      <p className={styles.cellMuted}>
                        {formatShortDate(item.stayStart)} → {formatShortDate(item.stayEnd)} · {pluralize(item.nights, "noche", "noches")}
                      </p>
                      <p className={styles.cellMuted}>
                        {pluralize(item.adults, "adulto", "adultos")} · {item.roomCount === null ? "solicitud" : pluralize(item.roomCount, "habitación", "habitaciones")}
                      </p>
                    </td>
                    <td>
                      <p className={styles.finance}>{financeLine(item)}</p>
                      <p className={styles.cellMuted}>{item.alertText ?? "Sin alertas"}</p>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${STATUS_BADGE[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                      {item.statusDetail ? <p className={styles.statusDetail}>{item.statusDetail}</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className={styles.pagination} aria-label="Paginación de reservas">
            <p className={styles.paginationSummary}>{from}–{to} de {filtered.length} reservas</p>
            <div className={styles.pager}>
              <button
                type="button"
                className={styles.pageButton}
                aria-label="Página anterior"
                disabled={safePage === 1}
                onClick={() => setPage(safePage - 1)}
              >
                ‹
              </button>
              {buildPageNumbers(safePage, pageCount).map((entry, index) =>
                entry === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className={styles.pageEllipsis}>…</span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    className={`${styles.pageButton} ${entry === safePage ? styles.pageButtonActive : ""}`}
                    aria-current={entry === safePage ? "page" : undefined}
                    onClick={() => setPage(entry)}
                  >
                    {entry}
                  </button>
                ),
              )}
              <button
                type="button"
                className={styles.pageButton}
                aria-label="Página siguiente"
                disabled={safePage === pageCount}
                onClick={() => setPage(safePage + 1)}
              >
                ›
              </button>
            </div>
          </nav>
        </>
      )}
    </section>
  );
}
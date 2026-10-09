"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EntityDataGrid, StatusBadge, EntityListSurface, EntityPagination, useEntityPagination, EntityFilterField, ENTITY_LIST_TABLE_MIN_WIDTH } from "@/shared/components";

import type { ReservationListItem } from "../model/reservation-summary";
import { emptyReservationFilters, filterStaffReservations } from '../model/reservation-search';

import { operationalStatusOptions, reservationStatusLabels, reservationStatusVariant, visibleReservationStatus, type ReservationVisibleStatus } from '../model/reservation-operational-status';

import styles from "./reservation-list.module.css";
import workspace from "@/shared/components/entity-workspace.module.css";

function formatMoney(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  const symbol = currency.toUpperCase() === "GTQ" ? "Q" : currency;
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

function formatShortDate(date: Date | null): string {
  if (date === null) return "—";
  return date.toLocaleDateString("es-GT", { day: "numeric", month: "short" }).replace(".", "");
}

function pluralize(count: number | null, singular: string, plural: string): string {
  if (count === null) return "—";
  return `${count} ${count === 1 ? singular : plural}`;
}

function financeLine(item: ReservationListItem): string {
  const { finance } = item;
  const total = `Total ${formatMoney(finance.totalAmount, item.currency)}`;

  switch (finance.financeState) {
    case null: return "No disponible";
    case "ESTIMATED":
      return `Tarifa estimada ${formatMoney(finance.totalAmount, item.currency)}`;
    case "PAID":
      return `${total} · Pagado`;
    case "BALANCE": {
      const pending = finance.paidAmount === null ? 0 : Math.max((finance.totalAmount ?? 0) - finance.paidAmount, 0);
      return `${total} · Pendiente ${formatMoney(pending, item.currency)}`;
    }
    case "DEPOSIT":
      return `${total} · Depósito ${formatMoney(finance.paidAmount ?? 0, item.currency)}`;
    case "NO_CAPTURE":
      return `${total} · Sin captura`;
  }
}

function roomSummary(item: ReservationListItem): string {
  if (item.stayRooms) return item.stayRooms.map(s => `${s.roomType} · ${s.room ?? 'Sin asignar'}`).join(', ');
  return item.roomLabel ?? (item.status === 'WAITLIST' ? '' : 'Sin asignar');
}

interface ReservationListProps {
  reservations: ReadonlyArray<ReservationListItem>;
  propertyId?: string;
  /** Usado por el Centro de Reservas para abrir el flujo de conversión de una solicitud WAITLIST. */
  onConvert?: (reservationId: string) => void;
}

export function ReservationList({ reservations, onConvert, propertyId }: Readonly<ReservationListProps>) {
  const statusOptions = [
    { value: 'ALL', label: 'Todas' }, ...operationalStatusOptions,
    ...(reservations.some(item => !item.readOnly) ? [
      { value: 'WAITLIST', label: 'Waitlist' }, { value: 'NO_SHOW_PENDING', label: 'No-show pendiente' },
    ] : []),
  ];
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReservationVisibleStatus | "ALL">("ALL");
  const [arrivalFrom, setArrivalFrom] = useState('');
  const [arrivalTo, setArrivalTo] = useState('');

  const filtered = useMemo(() => {
    return filterStaffReservations(reservations, { query, status: statusFilter, arrivalFrom, arrivalTo });
  }, [reservations, query, statusFilter, arrivalFrom, arrivalTo]);

  const pagination = useEntityPagination(filtered, JSON.stringify([propertyId ?? reservations[0]?.propertyId, query, statusFilter, arrivalFrom, arrivalTo]));
  const pageItems = pagination.rows;
  const hasFilters = Boolean(query || statusFilter !== "ALL" || arrivalFrom || arrivalTo);

  function clearFilters() {
    setQuery(emptyReservationFilters.query);
    setStatusFilter(emptyReservationFilters.status);
    setArrivalFrom('');
    setArrivalTo('');
  }

  return (
    <EntityListSurface label="Lista de reservas de la propiedad" showScrollHint={pageItems.length > 0} filterColumns={4} filters={<>
        <EntityFilterField label="Buscar reservas" search>
          <input
            type="search"
            placeholder="Código, huésped, canal o habitación"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </EntityFilterField>
        <EntityFilterField label="Filtrar por estado">
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as ReservationVisibleStatus | "ALL");
            }}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </EntityFilterField>
        <EntityFilterField label="Llegada desde"><input type="date" value={arrivalFrom} max={arrivalTo || undefined} onChange={event => setArrivalFrom(event.target.value)} /></EntityFilterField>
        <EntityFilterField label="Llegada hasta"><input type="date" value={arrivalTo} min={arrivalFrom || undefined} onChange={event => setArrivalTo(event.target.value)} /></EntityFilterField>
    </>} filterActions={<button className={workspace.button} type="button" onClick={clearFilters} disabled={!hasFilters}>Limpiar filtros</button>}
      filterFeedback={arrivalFrom && arrivalTo && arrivalFrom > arrivalTo ? <p className={styles.filterError} role="alert">La fecha de llegada final debe ser igual o posterior a la inicial.</p> : undefined}

      footer={<EntityPagination label="Paginación de reservas" noun="reservas" pagination={pagination} />}>
      {pageItems.length === 0 ? (
        <div className={styles.emptyResults}><h3>{hasFilters ? 'No encontramos coincidencias' : 'Aún no hay reservas'}</h3><p>{hasFilters ? "Sin resultados con los filtros actuales." : "No hay reservas para esta propiedad."}</p><p>{hasFilters ? 'Prueba otro código o nombre, amplía las fechas o limpia los filtros.' : 'Las reservas de esta propiedad aparecerán aquí.'}</p></div>
      ) : (
          <EntityDataGrid
            label="Reservas de la propiedad"
            minWidth={ENTITY_LIST_TABLE_MIN_WIDTH}
            rows={pageItems}
            getRowKey={(item) => item.id}
            columns={[
              {
                key: "reservation",
                header: "Reserva / Huésped",
                render: (item) => (
                  <>
                    <Link className={`${workspace.reference} ${styles.referenceLink}`} href={`/reservas/${encodeURIComponent(item.id)}`}>
                      {item.confirmationCode ?? item.id}
                    </Link>
                    <span className={styles.guestName}>{item.guestName ?? "Responsable no registrado"}</span>
                  </>
                ),
              },
              {
                key: "stay",
                header: "Estadía / Canal",
                render: (item) => (
                  <>
                    <p className={styles.cellLine}>{item.sourceLabel ?? "Origen no registrado"}{roomSummary(item) ? ` · ${roomSummary(item)}` : ''}</p>
                    {item.sourceReference ? <p className={workspace.cellMuted}>{item.sourceReference}</p> : null}
                    <p className={workspace.cellMuted}>
                      {formatShortDate(item.stayStart)} → {formatShortDate(item.stayEnd)} · {pluralize(item.nights, "noche", "noches")}
                    </p>
                    <p className={workspace.cellMuted}>
                      {item.adults === null ? "" : `${pluralize(item.adults, "adulto", "adultos")} · `} {item.roomCount === null ? "solicitud" : pluralize(item.roomCount, "habitación", "habitaciones")}
                    </p>
                  </>
                ),
              },
              {
                key: "finance",
                header: "Finanzas / Alerta",
                render: (item) => (
                  <>
                    <p className={styles.finance}>{financeLine(item)}</p>
                    <p className={workspace.cellMuted}>{item.readOnly ? "" : item.alertText ?? "Sin alertas"}</p>
                  </>
                ),
              },
              {
                key: "status",
                header: "Estado",
                render: (item) => (
                  <>
                    <StatusBadge size="sm" variant={reservationStatusVariant(visibleReservationStatus(item))}>{reservationStatusLabels[visibleReservationStatus(item)]}</StatusBadge>
                    {item.statusDetail ? <p className={styles.statusDetail}>{item.statusDetail}</p> : null}
                    {item.status === "WAITLIST" && onConvert ? (
                      <button className={styles.convertButton} type="button" onClick={() => onConvert(item.id)}>
                        Convertir a reserva
                      </button>
                    ) : null}
                  </>
                ),
              },
              {
                key: "detail",
                header: "Detalle",
                render: (item) => <Link className={styles.detailLink} href={`/reservas/${encodeURIComponent(item.id)}`} aria-label={`Ver detalle de ${item.id}`}>Ver detalle <span aria-hidden="true">→</span></Link>,
              },
            ]}
          />

      )}
    </EntityListSurface>
  );
}

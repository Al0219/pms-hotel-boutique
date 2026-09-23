"use client";

import React, { useState } from "react";

import type { AvailabilityMatrixQuery, AvailabilityMatrixResult } from "../model/availability-option";

export interface AvailabilityMatrixGridProps {
  matrixResult: AvailabilityMatrixResult;
  isLoading?: boolean;
  onRefresh?: (query: AvailabilityMatrixQuery) => void;
}

export function AvailabilityMatrixGrid({
  matrixResult,
  isLoading = false,
  onRefresh,
}: AvailabilityMatrixGridProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(matrixResult.propertyId);
  const [startDate, setStartDate] = useState(matrixResult.startDate);
  const [endDate, setEndDate] = useState(matrixResult.endDate);
  const [selectedRoomType, setSelectedRoomType] = useState<string>("ALL");

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (onRefresh) {
      onRefresh({
        propertyId: selectedPropertyId,
        startDate,
        endDate,
        roomTypeId: selectedRoomType !== "ALL" ? selectedRoomType : undefined,
      });
    }
  }

  function formatColumnDate(isoDate: string): string {
    const parts = isoDate.split("-");
    if (parts.length !== 3) return isoDate;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0));
    return dateObj.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  }

  function getAtsBadgeStyle(ats: number) {
    if (ats > 2) {
      return { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
    }
    if (ats > 0) {
      return { backgroundColor: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" };
    }
    if (ats === 0) {
      return { backgroundColor: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" };
    }
    return { backgroundColor: "#f3e8ff", color: "#6b21a8", border: "1px solid #e9d5ff" };
  }

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      {/* Header & Filter Controls */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              Matriz de Disponibilidad y ATS (Available to Sell)
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0.2rem 0 0" }}>
              Inventario vendible diario: <code>ATS = Capacidad - Vendidas - OOO - OOS + Overbooking</code>
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#475569" }}>Total Hotel:</span>
            <strong style={{ fontSize: "0.95rem", color: "#0f172a", backgroundColor: "#e2e8f0", padding: "0.2rem 0.6rem", borderRadius: "6px" }}>
              {matrixResult.totalPropertyPhysicalRooms} Habitaciones
            </strong>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label htmlFor="matrix-prop-select" style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#475569", marginBottom: "0.25rem" }}>
              Propiedad
            </label>
            <select
              id="matrix-prop-select"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              style={{ padding: "0.45rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", backgroundColor: "#fff" }}
            >
              <option value="prop_boutique_01">Hotel Boutique San Jerónimo (San Lucas)</option>
              <option value="prop_boutique_02">Cabañas & Spa Vista Verde</option>
            </select>
          </div>

          <div>
            <label htmlFor="matrix-start-date" style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#475569", marginBottom: "0.25rem" }}>
              Fecha Inicio
            </label>
            <input
              id="matrix-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: "0.45rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            />
          </div>

          <div>
            <label htmlFor="matrix-end-date" style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#475569", marginBottom: "0.25rem" }}>
              Fecha Fin
            </label>
            <input
              id="matrix-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: "0.45rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            />
          </div>

          <div>
            <label htmlFor="matrix-room-type-filter" style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#475569", marginBottom: "0.25rem" }}>
              Tipo de Habitación
            </label>
            <select
              id="matrix-room-type-filter"
              value={selectedRoomType}
              onChange={(e) => setSelectedRoomType(e.target.value)}
              style={{ padding: "0.45rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", backgroundColor: "#fff" }}
            >
              <option value="ALL">Todos los tipos</option>
              {matrixResult.matrix.map((rt) => (
                <option key={rt.roomTypeId} value={rt.roomTypeId}>
                  {rt.roomTypeName} ({rt.roomTypeCode})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: isLoading ? "#94a3b8" : "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? "Consultando..." : "Actualizar Matriz"}
          </button>
        </form>
      </div>

      {/* Table Grid */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "center" }}>
          <thead>
            <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
              <th style={{ padding: "0.75rem 1rem", textAlign: "left", minWidth: "220px", color: "#334155", fontWeight: "700" }}>
                Tipo / Métrica
              </th>
              {matrixResult.dates.map((d) => (
                <th key={d} style={{ padding: "0.75rem 0.5rem", minWidth: "85px", color: "#1e293b", fontWeight: "600" }}>
                  {formatColumnDate(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixResult.matrix.map((rt) => (
              <React.Fragment key={rt.roomTypeId}>
                {/* RoomType Section Header */}
                <tr style={{ backgroundColor: "#e2e8f0", borderTop: "2px solid #cbd5e1" }}>
                  <td
                    colSpan={matrixResult.dates.length + 1}
                    style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: "700", color: "#0f172a" }}
                  >
                    <span>{rt.roomTypeName}</span>{" "}
                    <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: "normal" }}>
                      ({rt.roomTypeCode}) — Capacidad Física: {rt.totalPhysicalCapacity} habs.
                    </span>
                  </td>
                </tr>

                {/* Row: Capacidad */}
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.5rem 1rem", textAlign: "left", color: "#64748b", fontWeight: "500" }}>
                    Capacidad Física
                  </td>
                  {rt.dailyAvailability.map((d) => (
                    <td key={d.date} style={{ padding: "0.5rem 0.25rem", color: "#334155" }}>
                      {d.physicalRooms}
                    </td>
                  ))}
                </tr>

                {/* Row: Vendidas */}
                <tr style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafaf9" }}>
                  <td style={{ padding: "0.5rem 1rem", textAlign: "left", color: "#64748b", fontWeight: "500" }}>
                    Vendidas / Ocupadas
                  </td>
                  {rt.dailyAvailability.map((d) => (
                    <td key={d.date} style={{ padding: "0.5rem 0.25rem", color: "#1e293b", fontWeight: "600" }}>
                      {d.soldRooms}
                    </td>
                  ))}
                </tr>

                {/* Row: OOO / OOS */}
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.5rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.8rem" }}>
                    OOO / OOS (Mantenimiento)
                  </td>
                  {rt.dailyAvailability.map((d) => (
                    <td key={d.date} style={{ padding: "0.5rem 0.25rem", color: d.oooRooms + d.oosRooms > 0 ? "#ea580c" : "#94a3b8", fontSize: "0.8rem" }}>
                      {d.oooRooms + d.oosRooms > 0 ? `${d.oooRooms} OOO / ${d.oosRooms} OOS` : "-"}
                    </td>
                  ))}
                </tr>

                {/* Row: ATS */}
                <tr style={{ borderBottom: "2px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                  <td style={{ padding: "0.6rem 1rem", textAlign: "left", color: "#0f172a", fontWeight: "700" }}>
                    ATS (Disponible Venta)
                  </td>
                  {rt.dailyAvailability.map((d) => {
                    const badgeStyle = getAtsBadgeStyle(d.ats);
                    return (
                      <td key={d.date} style={{ padding: "0.4rem 0.25rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "6px",
                            fontWeight: "700",
                            fontSize: "0.85rem",
                            minWidth: "32px",
                            ...badgeStyle,
                          }}
                        >
                          {d.ats}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </React.Fragment>
            ))}

            {/* Total Hotel Summary Rows */}
            <tr style={{ backgroundColor: "#0f172a", color: "#ffffff" }}>
              <td style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: "700" }}>
                Total Hotel ATS
              </td>
              {matrixResult.dailySummaries.map((s) => (
                <td key={s.date} style={{ padding: "0.75rem 0.25rem", fontWeight: "700", fontSize: "0.95rem" }}>
                  {s.totalAts}
                </td>
              ))}
            </tr>
            <tr style={{ backgroundColor: "#1e293b", color: "#94a3b8", fontSize: "0.8rem" }}>
              <td style={{ padding: "0.5rem 1rem", textAlign: "left", fontWeight: "600" }}>
                % Ocupación Promedio
              </td>
              {matrixResult.dailySummaries.map((s) => (
                <td key={s.date} style={{ padding: "0.5rem 0.25rem", fontWeight: "600", color: s.averageOccupancyRate > 80 ? "#4ade80" : "#f1f5f9" }}>
                  {s.averageOccupancyRate}%
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

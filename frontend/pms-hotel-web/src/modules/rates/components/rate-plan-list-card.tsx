"use client";

import { useState } from "react";

import { StatusBadge } from "@/shared/components";
import type { RatePlan, RatePlanStatus } from "../model/rate-plan";

export interface RatePlanListCardProps {
  ratePlans: RatePlan[];
  onSelectRatePlan?: (ratePlan: RatePlan) => void;
  onFilterChange?: (propertyId?: string, status?: RatePlanStatus, search?: string) => void;
}

export function RatePlanListCard({
  ratePlans,
  onSelectRatePlan,
  onFilterChange,
}: RatePlanListCardProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (onFilterChange) {
      onFilterChange(
        undefined,
        statusFilter !== "ALL" ? (statusFilter as RatePlanStatus) : undefined,
        searchQuery.trim() || undefined,
      );
    }
  }

  function getPricingModelLabel(model: string): string {
    switch (model) {
      case "PER_NIGHT":
        return "Por Noche (Estándar)";
      case "PACKAGE":
        return "Paquete / Paquetizado";
      case "DERIVED":
        return "Tarifa Derivada";
      default:
        return model;
    }
  }

  const filteredLocalPlans = ratePlans.filter((rp) => {
    if (statusFilter !== "ALL" && rp.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        rp.name.toLowerCase().includes(q) ||
        rp.code.toLowerCase().includes(q) ||
        (rp.description && rp.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

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
      {/* Card Header & Filters */}
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
              Catálogo de Planes Tarifarios (Rate Plans)
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0.2rem 0 0" }}>
              Gestión comercial de tarifas, políticas de cancelación, alimentos y multiplicadores de precio.
            </p>
          </div>
          <span style={{ fontSize: "0.85rem", color: "#475569", backgroundColor: "#e2e8f0", padding: "0.25rem 0.75rem", borderRadius: "6px", fontWeight: "600" }}>
            {filteredLocalPlans.length} Tarifas
          </span>
        </div>

        {/* Filter bar */}
        <form onSubmit={handleFilterSubmit} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Buscar por nombre, código o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: "1 1 250px",
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              backgroundColor: "#fff",
            }}
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVE">Activas (ACTIVE)</option>
            <option value="INACTIVE">Inactivas (INACTIVE)</option>
            <option value="ARCHIVED">Archivadas (ARCHIVED)</option>
          </select>
        </form>
      </div>

      {/* Grid of Rate Plans */}
      <div style={{ padding: "1.5rem" }}>
        {filteredLocalPlans.length === 0 ? (
          <p style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", margin: "2rem 0" }}>
            No se encontraron planes tarifarios que coincidan con los filtros seleccionados.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
            {filteredLocalPlans.map((rp) => (
              <div
                key={rp.ratePlanId}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "1.25rem",
                  backgroundColor: rp.status === "ACTIVE" ? "#ffffff" : "#f8fafc",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                        {rp.name}
                      </h3>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>
                        Código: <code>{rp.code}</code>
                      </span>
                    </div>
                    <StatusBadge
                      variant={rp.status === "ACTIVE" ? "success" : rp.status === "INACTIVE" ? "neutral" : "warning"}
                      size="sm"
                    >
                      {rp.status === "ACTIVE" ? "Activa" : rp.status === "INACTIVE" ? "Inactiva" : "Archivada"}
                    </StatusBadge>
                  </div>

                  {rp.description && (
                    <p style={{ fontSize: "0.85rem", color: "#475569", margin: "0.5rem 0 0.75rem" }}>
                      {rp.description}
                    </p>
                  )}

                  <div style={{ fontSize: "0.8rem", color: "#334155", display: "grid", gap: "0.35rem", marginBottom: "1rem" }}>
                    <div>
                      <strong>Modelo de Precio: </strong>
                      <span>{getPricingModelLabel(rp.pricingModel)}</span>
                    </div>
                    <div>
                      <strong>Multiplicador Base: </strong>
                      <span style={{ color: "#2563eb", fontWeight: "600" }}>{rp.basePriceMultiplier}x</span>
                    </div>
                    <div>
                      <strong>Cancelación: </strong>
                      <span style={{ color: "#475569" }}>{rp.cancellationPolicy}</span>
                    </div>
                    {rp.mealsIncluded && (
                      <div>
                        <strong>Régimen: </strong>
                        <span style={{ color: "#166534" }}>{rp.mealsIncluded}</span>
                      </div>
                    )}
                    <div>
                      <strong>Habitaciones vinculadas: </strong>
                      <span style={{ color: "#475569" }}>{rp.applicableRoomTypeIds.length} tipo(s)</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectRatePlan && onSelectRatePlan(rp)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    backgroundColor: "#f1f5f9",
                    color: "#1e293b",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontWeight: "600",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  Ver Detalle Comercial
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";

import { StatusBadge } from "@/shared/components";
import type { RatePlan } from "../model/rate-plan";

export interface RatePlanDetailModalProps {
  ratePlan: RatePlan;
  onClose: () => void;
}

export function RatePlanDetailModal({ ratePlan, onClose }: RatePlanDetailModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-rate-plan-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          maxWidth: "550px",
          width: "100%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f8fafc",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 id="modal-rate-plan-title" style={{ fontSize: "1.2rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                {ratePlan.name}
              </h2>
              <StatusBadge
                variant={ratePlan.status === "ACTIVE" ? "success" : ratePlan.status === "INACTIVE" ? "neutral" : "warning"}
                size="sm"
              >
                {ratePlan.status === "ACTIVE" ? "Activa" : ratePlan.status === "INACTIVE" ? "Inactiva" : "Archivada"}
              </StatusBadge>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0.2rem 0 0" }}>
              Código: <code>{ratePlan.code}</code> — ID: <code>{ratePlan.ratePlanId}</code>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              color: "#9ca3af",
              cursor: "pointer",
              padding: "0.25rem",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem" }}>
          {ratePlan.description && (
            <p style={{ fontSize: "0.9rem", color: "#475569", marginBottom: "1.25rem", lineHeight: "1.5" }}>
              {ratePlan.description}
            </p>
          )}

          <div
            style={{
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1.25rem",
              border: "1px solid #e2e8f0",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              fontSize: "0.85rem",
            }}
          >
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Modelo de Fijación:</span>
              <strong style={{ color: "#0f172a" }}>{ratePlan.pricingModel}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Moneda Principal:</span>
              <strong style={{ color: "#0f172a" }}>{ratePlan.currency}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Multiplicador Base:</span>
              <strong style={{ color: "#2563eb" }}>{ratePlan.basePriceMultiplier}x sobre BAR</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Propiedad Asociada:</span>
              <strong style={{ color: "#0f172a" }}>{ratePlan.propertyId}</strong>
            </div>
          </div>

          <div style={{ marginBottom: "1.25rem", fontSize: "0.85rem", lineHeight: "1.6" }}>
            <p style={{ margin: "0.25rem 0" }}>
              <strong>📋 Política de Cancelación: </strong>
              <span style={{ color: "#475569" }}>{ratePlan.cancellationPolicy}</span>
            </p>
            <p style={{ margin: "0.25rem 0" }}>
              <strong>🍳 Régimen de Alimentos: </strong>
              <span style={{ color: ratePlan.mealsIncluded ? "#166534" : "#64748b" }}>
                {ratePlan.mealsIncluded ?? "Ninguno (Solo Alojamiento)"}
              </span>
            </p>
            <p style={{ margin: "0.25rem 0" }}>
              <strong>🚪 Tipos de Habitación Habilitados: </strong>
              <span style={{ color: "#475569" }}>
                {ratePlan.applicableRoomTypeIds.join(", ") || "Ninguno"}
              </span>
            </p>
          </div>

          {/* Architectural Domain Note */}
          <div
            style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              fontSize: "0.8rem",
              color: "#1e40af",
              marginBottom: "1.5rem",
            }}
          >
            ℹ️ <strong>Regla de Dominio:</strong> El Plan Tarifario rige la estrategia comercial y reglas de precio, pero <em>no almacena ni posee inventario físico</em>. La disponibilidad depende estrictamente del tipo de habitación en la matriz ATS.
          </div>

          {/* Footer actions */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.6rem 1.2rem",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

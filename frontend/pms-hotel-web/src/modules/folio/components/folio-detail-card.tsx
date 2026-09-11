"use client";

import React from "react";

import { StatusBadge, type StatusBadgeVariant } from "@/shared/components";

import type { Folio, FolioCharge, FolioStatus } from "../model/folio";

export interface FolioDetailCardProps {
  folio: Folio;
  onApplyPayment?: () => void;
  onSplitCharge?: (charge: FolioCharge) => void;
  onTransferCharge?: (charge: FolioCharge) => void;
}

const FOLIO_STATUS_VARIANT_MAP: Record<FolioStatus, StatusBadgeVariant> = {
  OPEN: "warning",
  SETTLED: "success",
  CLOSED: "neutral",
};

export function FolioDetailCard({
  folio,
  onApplyPayment,
  onSplitCharge,
  onTransferCharge,
}: FolioDetailCardProps) {
  const statusVariant = FOLIO_STATUS_VARIANT_MAP[folio.status] || "neutral";

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "10px",
        border: "1px solid #e5e7eb",
        padding: "1.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "1px solid #f3f4f6",
          paddingBottom: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#111827", margin: 0 }}>
              Folio {folio.folioNumber}
            </h3>
            <StatusBadge variant={statusVariant} size="sm">
              {folio.status}
            </StatusBadge>
            <span style={{ fontSize: "0.75rem", backgroundColor: "#f3f4f6", color: "#4b5563", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
              {folio.type}
            </span>
          </div>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>
            Titular: <strong>{folio.holderName}</strong> | Habitación: <strong>{folio.roomNumber}</strong>
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "0.8rem", color: "#6b7280", display: "block" }}>Balance Pendiente</span>
          <span
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: folio.balance > 0 ? "#b91c1c" : folio.balance === 0 ? "#15803d" : "#1d4ed8",
            }}
          >
            ${folio.balance.toFixed(2)} {folio.currency}
          </span>
        </div>
      </header>

      {/* Resumen financiero */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem", backgroundColor: "#f9fafb", padding: "0.75rem 1rem", borderRadius: "8px" }}>
        <div>
          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Total Cargos</span>
          <p style={{ margin: "2px 0 0", fontWeight: "600", color: "#111827" }}>
            ${folio.totalCharges.toFixed(2)} {folio.currency}
          </p>
        </div>
        <div>
          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Total Pagos / Abonos</span>
          <p style={{ margin: "2px 0 0", fontWeight: "600", color: "#15803d" }}>
            ${folio.totalPayments.toFixed(2)} {folio.currency}
          </p>
        </div>
        <div>
          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Transacciones</span>
          <p style={{ margin: "2px 0 0", fontWeight: "600", color: "#374151" }}>
            {folio.charges.length} cargos / {folio.payments.length} pagos
          </p>
        </div>
      </div>

      {/* Reglas de Routing activas */}
      {folio.routingRules && folio.routingRules.length > 0 && (
        <div style={{ marginBottom: "1.25rem", padding: "0.6rem 0.85rem", backgroundColor: "#eff6ff", borderRadius: "6px", border: "1px solid #bfdbfe", fontSize: "0.8rem", color: "#1e40af" }}>
          <strong>Reglas de Enrutamiento activas: </strong>
          {folio.routingRules.map((r) => `${r.category} (${r.percentage}% hacia ${r.targetFolioId})`).join(", ")}
        </div>
      )}

      {/* Desglose de cargos */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ fontSize: "0.95rem", fontWeight: "600", color: "#1f2937", marginBottom: "0.5rem" }}>
          Cargos y Consumos
        </h4>
        {folio.charges.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "0.85rem", fontStyle: "italic" }}>No hay cargos registrados.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {folio.charges.map((charge) => (
              <div
                key={charge.chargeId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #f3f4f6",
                  backgroundColor: charge.isVoided || charge.isTransferred ? "#fef2f2" : "#ffffff",
                  textDecoration: charge.isVoided || charge.isTransferred ? "line-through" : "none",
                }}
              >
                <div>
                  <span style={{ fontWeight: "600", fontSize: "0.875rem", color: charge.isVoided || charge.isTransferred ? "#9ca3af" : "#111827" }}>
                    {charge.description}
                  </span>
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#6b7280" }}>
                    ({charge.category})
                  </span>
                  {charge.originalSplitChargeId && (
                    <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#7c3aed", fontWeight: "500" }}>
                      [Split de {charge.originalSplitChargeId}]
                    </span>
                  )}
                  {charge.isTransferred && (
                    <StatusBadge variant="info" size="sm" style={{ marginLeft: "0.5rem" }}>
                      Transferido a {charge.transferredToFolioId}
                    </StatusBadge>
                  )}
                  {charge.isVoided && (
                    <StatusBadge variant="error" size="sm" style={{ marginLeft: "0.5rem" }}>
                      Anulado
                    </StatusBadge>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontWeight: "600", fontSize: "0.875rem", color: charge.isVoided || charge.isTransferred ? "#9ca3af" : "#111827" }}>
                    ${charge.amount.toFixed(2)} {charge.currency}
                  </span>
                  {!charge.isVoided && !charge.isTransferred && folio.status === "OPEN" && (
                    <>
                      {onSplitCharge && (
                        <button
                          onClick={() => onSplitCharge(charge)}
                          style={{
                            padding: "0.2rem 0.45rem",
                            backgroundColor: "#f3f4f6",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            color: "#374151",
                            fontWeight: "500",
                          }}
                        >
                          Dividir
                        </button>
                      )}
                      {onTransferCharge && (
                        <button
                          onClick={() => onTransferCharge(charge)}
                          style={{
                            padding: "0.2rem 0.45rem",
                            backgroundColor: "#e0f2fe",
                            border: "1px solid #bae6fd",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            color: "#0369a1",
                            fontWeight: "500",
                          }}
                        >
                          Transferir
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Desglose de pagos */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <h4 style={{ fontSize: "0.95rem", fontWeight: "600", color: "#1f2937", margin: 0 }}>
            Pagos Aplicados
          </h4>
          {onApplyPayment && folio.status === "OPEN" && (
            <button
              onClick={onApplyPayment}
              style={{
                padding: "0.35rem 0.75rem",
                backgroundColor: "#15803d",
                color: "#ffffff",
                border: "none",
                borderRadius: "5px",
                fontSize: "0.8rem",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              + Aplicar Pago
            </button>
          )}
        </div>
        {folio.payments.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "0.85rem", fontStyle: "italic" }}>No se han aplicado pagos.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {folio.payments.map((p) => (
              <div
                key={p.paymentEntryId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #dcfce7",
                  backgroundColor: "#f0fdf4",
                }}
              >
                <div>
                  <span style={{ fontWeight: "600", fontSize: "0.875rem", color: "#166534" }}>
                    Pago vía {p.method}
                  </span>
                  {p.reference && (
                    <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#4b5563" }}>
                      (Ref: {p.reference})
                    </span>
                  )}
                </div>
                <span style={{ fontWeight: "700", fontSize: "0.875rem", color: "#15803d" }}>
                  -${p.amount.toFixed(2)} {p.currency}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

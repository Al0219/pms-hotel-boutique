"use client";

import React, { useState } from "react";

import { StatusBadge, type StatusBadgeVariant } from "@/shared/components";

import type { Payment, PaymentStatus } from "../model/payment";

export interface PaymentListCardProps {
  payments: Payment[];
  onAuthorizeNew?: () => void;
  onCapturePayment?: (payment: Payment) => void;
  onVoidPayment?: (payment: Payment) => void;
  onRefundPayment?: (payment: Payment) => void;
}

const PAYMENT_STATUS_VARIANT_MAP: Record<PaymentStatus, StatusBadgeVariant> = {
  PENDING_GUARANTEE: "warning",
  AUTHORIZED: "info",
  CAPTURED: "success",
  PARTIALLY_CAPTURED: "warning",
  VOIDED: "neutral",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "warning",
  DECLINED: "error",
  FAILED: "error",
};

export function PaymentListCard({
  payments,
  onAuthorizeNew,
  onCapturePayment,
  onVoidPayment,
  onRefundPayment,
}: PaymentListCardProps) {
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const toggleExpand = (paymentId: string) => {
    setExpandedPaymentId((prev) => (prev === paymentId ? null : paymentId));
  };

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
          alignItems: "center",
          borderBottom: "1px solid #f3f4f6",
          paddingBottom: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#111827", margin: 0 }}>
            Historial de Pagos y Transacciones
          </h3>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
            Total registros: {payments.length} | Transacciones financieras seguras sin PAN/CVV
          </p>
        </div>
        {onAuthorizeNew && (
          <button
            onClick={onAuthorizeNew}
            style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            + Nueva Autorización
          </button>
        )}
      </header>

      {payments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280", fontStyle: "italic" }}>
          No hay transacciones de pago registradas.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {payments.map((p) => {
            const variant = PAYMENT_STATUS_VARIANT_MAP[p.status] || "neutral";
            const isExpanded = expandedPaymentId === p.paymentId;

            return (
              <div
                key={p.paymentId}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "1rem",
                  backgroundColor: "#fafafa",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <strong style={{ color: "#111827", fontSize: "0.95rem" }}>{p.paymentId}</strong>
                      <StatusBadge variant={variant} size="sm">
                        {p.status}
                      </StatusBadge>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          backgroundColor: "#e5e7eb",
                          color: "#374151",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "600",
                        }}
                      >
                        {p.method}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      Folio: <strong>{p.folioId}</strong> | Creado: {p.createdAt.toLocaleString()}
                    </div>
                    {p.cardBrand && p.last4 && (
                      <div style={{ fontSize: "0.8rem", color: "#4b5563", marginTop: "0.25rem" }}>
                        💳 {p.cardBrand} terminada en **** {p.last4}
                      </div>
                    )}
                    {p.providerReference && (
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem" }}>
                        Ref. Pasarela: <code style={{ backgroundColor: "#e2e8f0", padding: "1px 4px", borderRadius: "3px" }}>{p.providerReference}</code>
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#111827" }}>
                      ${p.authorizedAmount.toFixed(2)} {p.currency}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#4b5563" }}>
                      Capturado: <strong>${p.capturedAmount.toFixed(2)}</strong> | Reembolsado: <strong>${p.refundedAmount.toFixed(2)}</strong>
                    </div>

                    <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.4rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {p.remainingCapturableAmount > 0 && onCapturePayment && (
                        <button
                          onClick={() => onCapturePayment(p)}
                          style={{
                            padding: "0.25rem 0.6rem",
                            fontSize: "0.75rem",
                            backgroundColor: "#16a34a",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: "500",
                          }}
                        >
                          Capturar (${p.remainingCapturableAmount.toFixed(2)})
                        </button>
                      )}
                      {p.status === "AUTHORIZED" && onVoidPayment && (
                        <button
                          onClick={() => onVoidPayment(p)}
                          style={{
                            padding: "0.25rem 0.6rem",
                            fontSize: "0.75rem",
                            backgroundColor: "#dc2626",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: "500",
                          }}
                        >
                          Anular (Void)
                        </button>
                      )}
                      {p.remainingRefundableAmount > 0 && onRefundPayment && (
                        <button
                          onClick={() => onRefundPayment(p)}
                          style={{
                            padding: "0.25rem 0.6rem",
                            fontSize: "0.75rem",
                            backgroundColor: "#d97706",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: "500",
                          }}
                        >
                          Reembolsar
                        </button>
                      )}
                      {p.auditTrail.length > 0 && (
                        <button
                          onClick={() => toggleExpand(p.paymentId)}
                          style={{
                            padding: "0.25rem 0.6rem",
                            fontSize: "0.75rem",
                            backgroundColor: "#4b5563",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          {isExpanded ? "Ocultar Auditoría" : `Auditoría (${p.auditTrail.length})`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && p.auditTrail.length > 0 && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      paddingTop: "0.75rem",
                      borderTop: "1px dashed #d1d5db",
                      backgroundColor: "#ffffff",
                      padding: "0.5rem",
                      borderRadius: "6px",
                    }}
                  >
                    <div style={{ fontSize: "0.8rem", fontWeight: "600", color: "#374151", marginBottom: "0.4rem" }}>
                      Registro de Auditoría Financiera (Append-Only):
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.75rem", color: "#4b5563" }}>
                      {p.auditTrail.map((entry) => (
                        <li key={entry.auditId} style={{ marginBottom: "0.25rem" }}>
                          <strong>{entry.action}</strong>: ${entry.amount.toFixed(2)} {entry.currency} por {entry.performedBy} ({entry.performedAt.toLocaleString()})
                          {entry.reason && <span> — Motivo: <em>{entry.reason}</em></span>}
                          {entry.providerReference && <span> — Ref: {entry.providerReference}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

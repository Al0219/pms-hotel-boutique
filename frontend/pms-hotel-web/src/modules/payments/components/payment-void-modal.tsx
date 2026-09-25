"use client";

import React, { useState } from "react";

import type { Payment, VoidPaymentRequest } from "../model/payment";

export interface PaymentVoidModalProps {
  payment: Payment;
  onVoid: (paymentId: string, request: VoidPaymentRequest) => Promise<void>;
  onClose: () => void;
}

export function PaymentVoidModal({
  payment,
  onVoid,
  onClose,
}: PaymentVoidModalProps) {
  const [reason, setReason] = useState<string>("Cancelación de reserva antes del check-in");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg("Debe especificar un motivo válido para la anulación.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onVoid(payment.paymentId, {
        reason: reason.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error durante la anulación del pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="void-modal-title"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "460px",
          padding: "1.5rem",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
        }}
      >
        <header style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
          <h2 id="void-modal-title" style={{ margin: 0, fontSize: "1.25rem", color: "#991b1b", fontWeight: "700" }}>
            Anulación de Pago (Void)
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
            Transacción: <strong>{payment.paymentId}</strong> por <strong>${payment.authorizedAmount.toFixed(2)} {payment.currency}</strong>
          </p>
        </header>

        {/* Advertencia de irreversibilidad */}
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            padding: "0.75rem",
            marginBottom: "1rem",
            fontSize: "0.85rem",
            color: "#991b1b",
          }}
        >
          ⚠️ <strong>Advertencia:</strong> Esta acción cancelará la pre-autorización en la pasarela de pagos. Esta operación es <strong>irreversible</strong>.
        </div>

        {errorMsg && (
          <div
            role="alert"
            style={{
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              padding: "0.75rem",
              borderRadius: "6px",
              marginBottom: "1rem",
              fontSize: "0.85rem",
              border: "1px solid #fca5a5",
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="void-reason-input" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#374151", marginBottom: "0.25rem" }}>
              Motivo de la Anulación *
            </label>
            <input
              id="void-reason-input"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
              }}
              required
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                backgroundColor: "#ffffff",
                color: "#374151",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              {isSubmitting ? "Anulando..." : "Confirmar Anulación (Void)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

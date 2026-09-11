"use client";

import React, { useState } from "react";

import type { CapturePaymentRequest, Payment } from "../model/payment";

export interface PaymentCaptureModalProps {
  payment: Payment;
  onCapture: (paymentId: string, request: CapturePaymentRequest) => Promise<void>;
  onClose: () => void;
}

export function PaymentCaptureModal({
  payment,
  onCapture,
  onClose,
}: PaymentCaptureModalProps) {
  const [amount, setAmount] = useState<number>(payment.remainingCapturableAmount);
  const [reason, setReason] = useState<string>("Liquidación por checkout de estancia");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuickTotal = () => {
    setAmount(payment.remainingCapturableAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setErrorMsg("El monto a capturar debe ser mayor a 0.");
      return;
    }
    if (amount > payment.remainingCapturableAmount) {
      setErrorMsg(
        `El monto a capturar ($${amount.toFixed(2)}) no puede exceder el monto remanente ($${payment.remainingCapturableAmount.toFixed(2)}).`,
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onCapture(payment.paymentId, {
        amount,
        currency: payment.currency,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error durante la captura del pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="capture-modal-title"
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
          maxWidth: "480px",
          padding: "1.5rem",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
        }}
      >
        <header style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
          <h2 id="capture-modal-title" style={{ margin: 0, fontSize: "1.25rem", color: "#111827", fontWeight: "700" }}>
            Captura / Liquidación de Pago
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
            Transacción: <strong>{payment.paymentId}</strong> (Folio: {payment.folioId})
          </p>
        </header>

        {/* Resumen de límites autorizados */}
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "6px",
            padding: "0.75rem",
            marginBottom: "1rem",
            fontSize: "0.85rem",
            color: "#166534",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "0.5rem",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", color: "#15803d" }}>Autorizado</div>
            <strong style={{ fontSize: "1rem" }}>${payment.authorizedAmount.toFixed(2)}</strong>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#15803d" }}>Ya Capturado</div>
            <strong style={{ fontSize: "1rem" }}>${payment.capturedAmount.toFixed(2)}</strong>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#15803d" }}>Remanente</div>
            <strong style={{ fontSize: "1rem", color: "#166534" }}>${payment.remainingCapturableAmount.toFixed(2)}</strong>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            style={{
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              padding: "0.75rem",
              borderRadius: "6px",
              marginBottom: "1rem",
              fontSize: "0.85rem",
              border: "1px solid #fecaca",
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <label htmlFor="capture-amount-input" style={{ fontSize: "0.85rem", fontWeight: "600", color: "#374151" }}>
                Monto a Capturar ({payment.currency}) *
              </label>
              <button
                type="button"
                onClick={handleQuickTotal}
                style={{
                  fontSize: "0.75rem",
                  color: "#2563eb",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "600",
                  textDecoration: "underline",
                }}
              >
                Capturar Total (${payment.remainingCapturableAmount.toFixed(2)})
              </button>
            </div>
            <input
              id="capture-amount-input"
              type="number"
              min="0.01"
              max={payment.remainingCapturableAmount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "1rem",
                fontWeight: "600",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="capture-reason-input" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#374151", marginBottom: "0.25rem" }}>
              Motivo o Referencia de Liquidación
            </label>
            <input
              id="capture-reason-input"
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
                backgroundColor: "#16a34a",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              {isSubmitting ? "Capturando..." : "Confirmar Captura"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

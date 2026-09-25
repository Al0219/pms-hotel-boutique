"use client";

import { useEffect, useState } from "react";

import type { Payment, RefundPaymentRequest } from "../model/payment";

export interface PaymentRefundModalProps {
  payment: Payment;
  onRefund: (paymentId: string, request: RefundPaymentRequest) => Promise<void>;
  onClose: () => void;
}

export function PaymentRefundModal({ payment, onRefund, onClose }: PaymentRefundModalProps) {
  const [amount, setAmount] = useState<string>(payment.remainingRefundableAmount.toFixed(2));
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  const maxRefundable = payment.remainingRefundableAmount;
  const numAmount = Number(amount);
  const isTotalRefund = Number.isFinite(numAmount) && Math.abs(numAmount - maxRefundable) < 0.001;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("El monto a reembolsar debe ser mayor a 0.");
      return;
    }

    if (parsedAmount > maxRefundable) {
      setErrorMsg(`El monto no puede exceder el saldo reembolsable ($${maxRefundable.toFixed(2)} ${payment.currency}).`);
      return;
    }

    if (!reason.trim()) {
      setErrorMsg("Debe especificar un motivo para el reembolso.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onRefund(payment.paymentId, {
        amount: parsedAmount,
        reason: reason.trim(),
        currency: payment.currency,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al procesar el reembolso.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-refund-title"
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
          maxWidth: "520px",
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
            backgroundColor: "#faf5ff",
          }}
        >
          <div>
            <h2 id="modal-refund-title" style={{ fontSize: "1.2rem", fontWeight: "600", color: "#581c87", margin: 0 }}>
              Reembolso de Pago
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0.2rem 0 0" }}>
              ID Transacción: <code>{payment.paymentId}</code>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
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
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
          {errorMsg && (
            <div
              role="alert"
              style={{
                backgroundColor: "#fef2f2",
                color: "#991b1b",
                padding: "0.75rem 1rem",
                borderRadius: "6px",
                fontSize: "0.875rem",
                marginBottom: "1rem",
                border: "1px solid #fecaca",
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Payment Summary Box */}
          <div
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1.25rem",
              border: "1px solid #e5e7eb",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              fontSize: "0.875rem",
            }}
          >
            <div>
              <span style={{ color: "#6b7280", display: "block" }}>Método / Tarjeta:</span>
              <strong style={{ color: "#1f2937" }}>
                {payment.cardBrand ? `${payment.cardBrand} •••• ${payment.last4}` : payment.method}
              </strong>
            </div>
            <div>
              <span style={{ color: "#6b7280", display: "block" }}>Total Capturado:</span>
              <strong style={{ color: "#1f2937" }}>
                ${payment.capturedAmount.toFixed(2)} {payment.currency}
              </strong>
            </div>
            <div>
              <span style={{ color: "#6b7280", display: "block" }}>Ya Reembolsado:</span>
              <span style={{ color: "#9333ea", fontWeight: "600" }}>
                ${payment.refundedAmount.toFixed(2)} {payment.currency}
              </span>
            </div>
            <div>
              <span style={{ color: "#6b7280", display: "block" }}>Saldo Reembolsable:</span>
              <strong style={{ color: "#059669", fontSize: "1rem" }}>
                ${maxRefundable.toFixed(2)} {payment.currency}
              </strong>
            </div>
          </div>

          {/* Amount input & presets */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label htmlFor="refund-amount" style={{ fontSize: "0.875rem", fontWeight: "500", color: "#374151" }}>
                Monto a Reembolsar ({payment.currency}) *
              </label>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  type="button"
                  onClick={() => setAmount(maxRefundable.toFixed(2))}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.5rem",
                    backgroundColor: isTotalRefund ? "#7e22ce" : "#f3e8ff",
                    color: isTotalRefund ? "#ffffff" : "#6b21a8",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                >
                  Total (${maxRefundable.toFixed(2)})
                </button>
                {maxRefundable > 1 && (
                  <button
                    type="button"
                    onClick={() => setAmount((maxRefundable / 2).toFixed(2))}
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.2rem 0.5rem",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    50%
                  </button>
                )}
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }}>$</span>
              <input
                id="refund-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={maxRefundable}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={isSubmitting || maxRefundable <= 0}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem 0.6rem 1.75rem",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0.3rem 0 0" }}>
              {isTotalRefund
                ? "Este monto cubrirá el saldo restante y cambiará el estado a REFUNDED."
                : "Se procesará como un reembolso parcial (PARTIALLY_REFUNDED)."}
            </p>
          </div>

          {/* Reason input */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="refund-reason" style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.4rem" }}>
              Motivo del Reembolso *
            </label>
            <textarea
              id="refund-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Inconformidad con el servicio, cargos no reconocidos o salida anticipada..."
              required
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Security note */}
          <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0 0 1.25rem", fontStyle: "italic" }}>
            🔒 <strong>Seguridad Zero PAN/CVV:</strong> El reembolso se ejecutará a través de la pasarela contra la transacción capturada original sin manipular credenciales de tarjeta.
          </p>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "0.6rem 1.2rem",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontWeight: "500",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || maxRefundable <= 0}
              style={{
                padding: "0.6rem 1.2rem",
                backgroundColor: isSubmitting || maxRefundable <= 0 ? "#a855f7" : "#7e22ce",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: isSubmitting || maxRefundable <= 0 ? "not-allowed" : "pointer",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {isSubmitting ? "Procesando Reembolso..." : "Confirmar Reembolso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

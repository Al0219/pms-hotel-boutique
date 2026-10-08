"use client";

import React, { useState } from "react";
import { usePayments } from "../hooks/use-payments";
import { PaymentListCard } from "./payment-list-card";
import { PaymentAuthorizeModal } from "./payment-authorize-modal";
import { PaymentCaptureModal } from "./payment-capture-modal";
import { PaymentVoidModal } from "./payment-void-modal";
import { PaymentRefundModal } from "./payment-refund-modal";
import type { Payment, AuthorizePaymentRequest, CapturePaymentRequest, VoidPaymentRequest, RefundPaymentRequest } from "../model/payment";

export function PaymentsPage() {
  const { payments, totalCount, isLoading, error, loadPayments, authorize, capture, voidPayment, refund } = usePayments({
    propertyId: "prop_boutique_01",
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedCapturePayment, setSelectedCapturePayment] = useState<Payment | null>(null);
  const [selectedVoidPayment, setSelectedVoidPayment] = useState<Payment | null>(null);
  const [selectedRefundPayment, setSelectedRefundPayment] = useState<Payment | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleAuthorizeConfirm = async (req: AuthorizePaymentRequest) => {
    try {
      await authorize(req);
      setFeedback({ type: "success", text: `Pago de $${req.amount.toFixed(2)} ${req.currency} autorizado correctamente.` });
      setIsAuthModalOpen(false);
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Error al autorizar pago" });
    }
  };

  const handleCaptureConfirm = async (paymentId: string, req: CapturePaymentRequest) => {
    try {
      await capture(paymentId, req);
      setFeedback({ type: "success", text: `Captura de pago $${req.amount.toFixed(2)} procesada exitosamente.` });
      setSelectedCapturePayment(null);
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Error al capturar pago" });
    }
  };

  const handleVoidConfirm = async (paymentId: string, req: VoidPaymentRequest) => {
    try {
      await voidPayment(paymentId, req);
      setFeedback({ type: "success", text: "Autorización anulada (Void) exitosamente." });
      setSelectedVoidPayment(null);
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Error al anular pago" });
    }
  };

  const handleRefundConfirm = async (paymentId: string, req: RefundPaymentRequest) => {
    try {
      await refund(paymentId, req);
      setFeedback({ type: "success", text: `Reembolso de $${req.amount.toFixed(2)} registrado correctamente.` });
      setSelectedRefundPayment(null);
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Error al procesar reembolso" });
    }
  };

  return (
    <div style={{ padding: "28px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: 0 }}>
            Centro de Pagos y Transacciones
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: "4px 0 0 0" }}>
            Ciclo de vida completo: Autorización, Captura, Anulación (Void) y Reembolsos (Refunds) con trazabilidad de auditoría.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadPayments({ propertyId: "prop_boutique_01" })}
          style={{
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: "500",
            color: "#374151",
            backgroundColor: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ↻ Refrescar ({totalCount} pagos)
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            backgroundColor: feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${feedback.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            color: feedback.type === "success" ? "#065f46" : "#991b1b",
            fontSize: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{feedback.type === "success" ? "✓" : "⚠"} {feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontWeight: "bold" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading & Error */}
      {isLoading && (
        <div style={{ padding: "48px", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
          <p style={{ color: "#6b7280", margin: 0, fontSize: "15px" }}>Cargando transacciones de pago...</p>
        </div>
      )}

      {error && !isLoading && (
        <div style={{ padding: "24px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#991b1b" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>Error al cargar pagos</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>{error}</p>
        </div>
      )}

      {/* Payment List Card */}
      {!isLoading && (
        <PaymentListCard
          payments={payments}
          onAuthorizeNew={() => setIsAuthModalOpen(true)}
          onCapturePayment={(payment) => setSelectedCapturePayment(payment)}
          onVoidPayment={(payment) => setSelectedVoidPayment(payment)}
          onRefundPayment={(payment) => setSelectedRefundPayment(payment)}
        />
      )}

      {/* Modals */}
      {isAuthModalOpen && (
        <PaymentAuthorizeModal
          onAuthorize={handleAuthorizeConfirm}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {selectedCapturePayment && (
        <PaymentCaptureModal
          payment={selectedCapturePayment}
          onCapture={handleCaptureConfirm}
          onClose={() => setSelectedCapturePayment(null)}
        />
      )}

      {selectedVoidPayment && (
        <PaymentVoidModal
          payment={selectedVoidPayment}
          onVoid={handleVoidConfirm}
          onClose={() => setSelectedVoidPayment(null)}
        />
      )}

      {selectedRefundPayment && (
        <PaymentRefundModal
          payment={selectedRefundPayment}
          onRefund={handleRefundConfirm}
          onClose={() => setSelectedRefundPayment(null)}
        />
      )}
    </div>
  );
}

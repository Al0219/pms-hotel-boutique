"use client";

import React, { useState } from "react";

import type { AuthorizePaymentRequest, PaymentMethod } from "../model/payment";

export interface PaymentAuthorizeModalProps {
  initialFolioId?: string;
  onAuthorize: (request: AuthorizePaymentRequest) => Promise<void>;
  onClose: () => void;
}

export function PaymentAuthorizeModal({
  initialFolioId = "fol_guest_101",
  onAuthorize,
  onClose,
}: PaymentAuthorizeModalProps) {
  const [folioId, setFolioId] = useState(initialFolioId);
  const [method, setMethod] = useState<PaymentMethod>("CREDIT_CARD");
  const [amount, setAmount] = useState<number>(250);
  const [currency, setCurrency] = useState<string>("USD");
  const [cardToken, setCardToken] = useState<string>("tok_visa_valid");
  const [cardHolderName, setCardHolderName] = useState<string>("Huésped Principal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioId.trim()) {
      setErrorMsg("El Folio ID es obligatorio.");
      return;
    }
    if (amount <= 0) {
      setErrorMsg("El monto a autorizar debe ser mayor a 0.");
      return;
    }

    let last4 = "4242";
    let cardBrand = "Visa";
    if (cardToken === "tok_mc_valid") {
      last4 = "5555";
      cardBrand = "MasterCard";
    } else if (cardToken === "tok_declined") {
      last4 = "0000";
      cardBrand = "Visa";
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onAuthorize({
        folioId: folioId.trim(),
        method,
        amount,
        currency,
        cardToken: method === "CREDIT_CARD" || method === "DEBIT_CARD" ? cardToken : undefined,
        cardHolderName: method === "CREDIT_CARD" || method === "DEBIT_CARD" ? cardHolderName.trim() : undefined,
        last4: method === "CREDIT_CARD" || method === "DEBIT_CARD" ? last4 : undefined,
        cardBrand: method === "CREDIT_CARD" || method === "DEBIT_CARD" ? cardBrand : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error durante la autorización");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
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
          <h2 id="modal-title" style={{ margin: 0, fontSize: "1.25rem", color: "#111827", fontWeight: "700" }}>
            Nueva Autorización de Pago
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
            Procesamiento seguro sin almacenamiento de PAN ni CVV.
          </p>
        </header>

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
            <label htmlFor="folio-id-input" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#374151", marginBottom: "0.25rem" }}>
              Folio Destino *
            </label>
            <input
              id="folio-id-input"
              type="text"
              value={folioId}
              onChange={(e) => setFolioId(e.target.value)}
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

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <div>
              <label htmlFor="amount-input" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#374151", marginBottom: "0.25rem" }}>
                Monto *
              </label>
              <input
                id="amount-input"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
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

            <div>
              <label htmlFor="currency-select" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#374151", marginBottom: "0.25rem" }}>
                Moneda
              </label>
              <select
                id="currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontSize: "0.9rem",
                }}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GTQ">GTQ</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="method-select" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#374151", marginBottom: "0.25rem" }}>
              Método de Pago
            </label>
            <select
              id="method-select"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
              }}
            >
              <option value="CREDIT_CARD">Tarjeta de Crédito</option>
              <option value="DEBIT_CARD">Tarjeta de Débito</option>
              <option value="CASH">Efectivo</option>
              <option value="BANK_TRANSFER">Transferencia Bancaria</option>
            </select>
          </div>

          {(method === "CREDIT_CARD" || method === "DEBIT_CARD") && (
            <>
              <div style={{ marginBottom: "1rem" }}>
                <label htmlFor="card-holder-input" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#374151", marginBottom: "0.25rem" }}>
                  Titular de la Tarjeta
                </label>
                <input
                  id="card-holder-input"
                  type="text"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label htmlFor="token-select" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#374151", marginBottom: "0.25rem" }}>
                  Token Simulado de Pasarela
                </label>
                <select
                  id="token-select"
                  value={cardToken}
                  onChange={(e) => setCardToken(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.9rem",
                  }}
                >
                  <option value="tok_visa_valid">Visa aprobada (**** 4242)</option>
                  <option value="tok_mc_valid">MasterCard aprobada (**** 5555)</option>
                  <option value="tok_declined">Tarjeta Declinada (Fondos insuficientes)</option>
                  <option value="tok_error">Error de Pasarela (500)</option>
                </select>
              </div>
            </>
          )}

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
                backgroundColor: "#2563eb",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              {isSubmitting ? "Autorizando..." : "Autorizar Pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

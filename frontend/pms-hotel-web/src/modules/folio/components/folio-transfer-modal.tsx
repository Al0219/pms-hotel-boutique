"use client";

import React, { useState } from "react";

import type { FolioCharge } from "../model/folio";

export interface FolioTransferModalProps {
  charge: FolioCharge;
  targetFolios?: Array<{ folioId: string; label: string }>;
  onTransfer: (targetFolioId: string, reason: string) => void;
  onClose: () => void;
}

export function FolioTransferModal({
  charge,
  targetFolios = [
    { folioId: "fol_company_202", label: "Cuenta Empresa: Corp Tech Solutions (FOL-2026-COMP)" },
    { folioId: "fol_suite_301", label: "Habitación 301: Master Suite (FOL-2026-0092)" },
    { folioId: "fol_master_999", label: "Cuenta Maestra Hotel: Eventos Especiales (FOL-MASTER-01)" },
  ],
  onTransfer,
  onClose,
}: FolioTransferModalProps) {
  const [targetFolioId, setTargetFolioId] = useState(
    targetFolios[0]?.folioId || "fol_company_202",
  );
  const [reason, setReason] = useState("Acuerdo de cobertura corporativa de estancia");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Por favor ingrese un motivo de transferencia");
      return;
    }
    onTransfer(targetFolioId, reason.trim());
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
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
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "10px",
          padding: "1.5rem",
          maxWidth: "480px",
          width: "90%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#111827", margin: 0 }}>
            Transferir Cargo a Otro Folio
          </h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#6b7280" }}
          >
            ✕
          </button>
        </header>

        <div style={{ backgroundColor: "#f9fafb", padding: "0.75rem 1rem", borderRadius: "6px", marginBottom: "1rem", border: "1px solid #e5e7eb" }}>
          <p style={{ margin: "0 0 4px", fontSize: "0.85rem", color: "#6b7280" }}>Cargo a transferir:</p>
          <strong style={{ fontSize: "0.95rem", color: "#111827" }}>{charge.description}</strong>
          <span style={{ float: "right", fontWeight: "700", color: "#111827" }}>
            ${charge.amount.toFixed(2)} {charge.currency}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#374151", marginBottom: "0.3rem" }}>
              Folio o Cuenta Destino:
            </label>
            <select
              value={targetFolioId}
              onChange={(e) => setTargetFolioId(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
            >
              {targetFolios.map((tf) => (
                <option key={tf.folioId} value={tf.folioId}>
                  {tf.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#374151", marginBottom: "0.3rem" }}>
              Motivo de Transferencia (Auditoría):
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "6px", fontFamily: "inherit" }}
              placeholder="Ej. Cargo autorizado para facturación a empresa"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "0.5rem 1rem", backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ padding: "0.5rem 1.2rem", backgroundColor: "#0284c7", color: "#ffffff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
            >
              Confirmar Transferencia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

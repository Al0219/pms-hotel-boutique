"use client";

import React, { useState } from "react";
import { useFolio } from "../hooks/use-folio";
import { FolioDetailCard } from "./folio-detail-card";
import { FolioSplitModal } from "./folio-split-modal";
import { FolioTransferModal } from "./folio-transfer-modal";
import type { FolioCharge, SplitChargePortion } from "../model/folio";

export function FoliosPage() {
  const [selectedFolioId, setSelectedFolioId] = useState<string>("fol_guest_101");
  const { folio, isLoading, error, splitCharge, transferCharge, loadFolio } = useFolio(selectedFolioId);

  const [activeSplitCharge, setActiveSplitCharge] = useState<FolioCharge | null>(null);
  const [activeTransferCharge, setActiveTransferCharge] = useState<FolioCharge | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSplitConfirm = async (portions: SplitChargePortion[]) => {
    if (!activeSplitCharge || !folio) return;
    try {
      await splitCharge({
        folioId: folio.folioId,
        chargeId: activeSplitCharge.chargeId,
        portions,
      });
      setActionFeedback({ type: "success", text: "Cargo dividido exitosamente en múltiples porciones." });
      setActiveSplitCharge(null);
    } catch (err) {
      setActionFeedback({ type: "error", text: err instanceof Error ? err.message : "Error al dividir el cargo" });
    }
  };

  const handleTransferConfirm = async (targetFolioId: string, reason: string) => {
    if (!activeTransferCharge || !folio) return;
    try {
      await transferCharge({
        sourceFolioId: folio.folioId,
        chargeId: activeTransferCharge.chargeId,
        targetFolioId,
        reason,
      });
      setActionFeedback({ type: "success", text: `Cargo transferido exitosamente a ${targetFolioId}.` });
      setActiveTransferCharge(null);
    } catch (err) {
      setActionFeedback({ type: "error", text: err instanceof Error ? err.message : "Error al transferir el cargo" });
    }
  };

  return (
    <div style={{ padding: "28px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: 0 }}>
            Gestión de Folios y Cuentas de Estancia
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: "4px 0 0 0" }}>
            Revisión de cargos, balances, división (split) y ruteo/transferencia a folios corporativos o habitaciones vinculadas.
          </p>
        </div>

        {/* Folio Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label htmlFor="folio-select" style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
            Folio Activo:
          </label>
          <select
            id="folio-select"
            value={selectedFolioId}
            onChange={(e) => {
              setSelectedFolioId(e.target.value);
              setActionFeedback(null);
            }}
            style={{
              padding: "8px 12px",
              fontSize: "13px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              color: "#111827",
            }}
          >
            <option value="fol_guest_101">FOL-2026-0089 (Huésped - Alejandro Méndez)</option>
            <option value="fol_company_202">FOL-2026-COMP (Empresa - Corp Tech Solutions)</option>
            <option value="fol_suite_301">FOL-2026-0092 (Habitación 301 - Master Suite)</option>
          </select>
          <button
            type="button"
            onClick={() => loadFolio(selectedFolioId)}
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
            ↻ Refrescar
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {actionFeedback && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            backgroundColor: actionFeedback.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${actionFeedback.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            color: actionFeedback.type === "success" ? "#065f46" : "#991b1b",
            fontSize: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{actionFeedback.type === "success" ? "✓" : "⚠"} {actionFeedback.text}</span>
          <button
            onClick={() => setActionFeedback(null)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", fontWeight: "bold" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading & Error States */}
      {isLoading && (
        <div style={{ padding: "48px", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
          <p style={{ color: "#6b7280", margin: 0, fontSize: "15px" }}>Cargando detalles del folio...</p>
        </div>
      )}

      {error && !isLoading && (
        <div style={{ padding: "24px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#991b1b" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>Error al cargar el Folio</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>{error}</p>
        </div>
      )}

      {/* Folio Detail Card */}
      {folio && !isLoading && (
        <FolioDetailCard
          folio={folio}
          onSplitCharge={(charge) => setActiveSplitCharge(charge)}
          onTransferCharge={(charge) => setActiveTransferCharge(charge)}
        />
      )}

      {/* Split Modal */}
      {activeSplitCharge && (
        <FolioSplitModal
          charge={activeSplitCharge}
          onSplit={handleSplitConfirm}
          onClose={() => setActiveSplitCharge(null)}
        />
      )}

      {/* Transfer Modal */}
      {activeTransferCharge && (
        <FolioTransferModal
          charge={activeTransferCharge}
          onTransfer={handleTransferConfirm}
          onClose={() => setActiveTransferCharge(null)}
        />
      )}
    </div>
  );
}

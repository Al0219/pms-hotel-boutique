"use client";

import React, { useState } from "react";

import type { FolioCharge, SplitChargePortion } from "../model/folio";

export interface FolioSplitModalProps {
  charge: FolioCharge;
  targetFolios?: Array<{ folioId: string; label: string }>;
  onSplit: (portions: SplitChargePortion[]) => void;
  onClose: () => void;
}

export function FolioSplitModal({
  charge,
  targetFolios = [
    { folioId: "fol_guest_101", label: "Folio Huésped (Actual)" },
    { folioId: "fol_company_202", label: "Folio Empresa (Master)" },
  ],
  onSplit,
  onClose,
}: FolioSplitModalProps) {
  const [splitMode, setSplitMode] = useState<"percentage" | "amount">("percentage");
  const [percentA, setPercentA] = useState(50);
  const [amountA, setAmountA] = useState(charge.amount / 2);
  const [targetFolioIdB, setTargetFolioIdB] = useState(
    targetFolios[1]?.folioId || "fol_company_202",
  );

  const calculatedAmountA = splitMode === "percentage"
    ? Math.round((charge.amount * percentA) / 100 * 100) / 100
    : amountA;

  const calculatedAmountB = Math.round((charge.amount - calculatedAmountA) * 100) / 100;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (calculatedAmountA <= 0 || calculatedAmountB <= 0) {
      alert("Los montos divididos deben ser mayores a 0");
      return;
    }

    const portions: SplitChargePortion[] = [
      {
        targetFolioId: targetFolios[0]?.folioId || "fol_guest_101",
        amount: calculatedAmountA,
        description: `${charge.description} (División 1)`,
      },
      {
        targetFolioId: targetFolioIdB,
        amount: calculatedAmountB,
        description: `${charge.description} (División 2)`,
      },
    ];

    onSplit(portions);
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
            Dividir Cargo (Split)
          </h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#6b7280" }}
          >
            ✕
          </button>
        </header>

        <div style={{ backgroundColor: "#f9fafb", padding: "0.75rem 1rem", borderRadius: "6px", marginBottom: "1rem", border: "1px solid #e5e7eb" }}>
          <p style={{ margin: "0 0 4px", fontSize: "0.85rem", color: "#6b7280" }}>Cargo a dividir:</p>
          <strong style={{ fontSize: "0.95rem", color: "#111827" }}>{charge.description}</strong>
          <span style={{ float: "right", fontWeight: "700", color: "#111827" }}>
            ${charge.amount.toFixed(2)} {charge.currency}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#374151", marginBottom: "0.4rem" }}>
              Modo de división:
            </label>
            <div style={{ display: "flex", gap: "1rem" }}>
              <label style={{ fontSize: "0.85rem", cursor: "pointer", color: "#111827" }}>
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === "percentage"}
                  onChange={() => setSplitMode("percentage")}
                  style={{ marginRight: "4px" }}
                />
                Por Porcentaje (%)
              </label>
              <label style={{ fontSize: "0.85rem", cursor: "pointer", color: "#111827" }}>
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === "amount"}
                  onChange={() => setSplitMode("amount")}
                  style={{ marginRight: "4px" }}
                />
                Por Monto Fijo ($)
              </label>
            </div>
          </div>

          {splitMode === "percentage" ? (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#374151", marginBottom: "0.3rem" }}>
                Porcentaje para Folio Origen: <strong>{percentA}%</strong> (${calculatedAmountA.toFixed(2)})
              </label>
              <input
                type="range"
                min={1}
                max={99}
                value={percentA}
                onChange={(e) => setPercentA(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          ) : (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#374151", marginBottom: "0.3rem" }}>
                Monto para Folio Origen ($):
              </label>
              <input
                type="number"
                step="0.01"
                min={0.01}
                max={charge.amount - 0.01}
                value={amountA}
                onChange={(e) => setAmountA(Number(e.target.value))}
                style={{ width: "100%", padding: "0.4rem 0.6rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
              />
            </div>
          )}

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#374151", marginBottom: "0.3rem" }}>
              Folio Destino de la 2da Porción (${calculatedAmountB.toFixed(2)}):
            </label>
            <select
              value={targetFolioIdB}
              onChange={(e) => setTargetFolioIdB(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
            >
              {targetFolios.map((tf) => (
                <option key={tf.folioId} value={tf.folioId}>
                  {tf.label}
                </option>
              ))}
            </select>
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
              style={{ padding: "0.5rem 1.2rem", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
            >
              Confirmar División
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

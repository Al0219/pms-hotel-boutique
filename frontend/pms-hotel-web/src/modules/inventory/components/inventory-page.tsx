"use client";

import React from "react";
import { useSellLimits } from "../hooks/use-sell-limits";
import { SellLimitsManager } from "./sell-limits-manager";

export function InventoryPage() {
  const { sellLimits, isLoading, error, loadSellLimits, updateLimit } = useSellLimits(
    "prop_boutique_01",
    "2026-10-01",
    "2026-10-07"
  );

  return (
    <div style={{ padding: "28px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: 0 }}>
          Control de Inventario y Overbooking
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "4px 0 0 0" }}>
          Configuración de límites máximos de venta (Sell Limits) y márgenes de sobreventa comercial sin alterar la capacidad física real.
        </p>
      </div>

      {error && (
        <div style={{ padding: "16px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      <SellLimitsManager
        items={sellLimits}
        propertyId="prop_boutique_01"
        isLoading={isLoading}
        onUpdateLimit={async (params) => {
          await updateLimit(params);
          return true;
        }}
        onRefresh={() => loadSellLimits("prop_boutique_01", "2026-10-01", "2026-10-07")}
      />
    </div>
  );
}

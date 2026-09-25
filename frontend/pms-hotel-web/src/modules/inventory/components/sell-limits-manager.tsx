"use client";

import { useState } from "react";

import { StatusBadge } from "@/shared/components";
import {
  SellLimit,
  UpdateSellLimitParams,
  calculateSellableATS,
} from "../model/sell-limit";

export interface SellLimitsManagerProps {
  items: SellLimit[];
  propertyId: string;
  canEdit?: boolean;
  onUpdateLimit?: (params: UpdateSellLimitParams) => Promise<boolean>;
  onRefresh?: () => void;
  isLoading?: boolean;
}

interface EditingItemState {
  item: SellLimit;
  overbookingLimit: number;
  sellLimit: number | null;
}

export function SellLimitsManager({
  items,
  propertyId,
  canEdit = true,
  onUpdateLimit,
  onRefresh,
  isLoading = false,
}: SellLimitsManagerProps) {
  const [selectedRoomType, setSelectedRoomType] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("");
  const [editingItem, setEditingItem] = useState<EditingItemState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uniqueRoomTypes = Array.from(new Set(items.map((i) => i.roomTypeId)));

  const filteredItems = items.filter((item) => {
    if (selectedRoomType !== "ALL" && item.roomTypeId !== selectedRoomType) return false;
    if (filterDate && !item.date.includes(filterDate)) return false;
    return true;
  });

  function handleOpenEdit(item: SellLimit) {
    if (!canEdit) return;
    setEditingItem({
      item,
      overbookingLimit: item.overbookingLimit,
      sellLimit: item.sellLimit,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function handleConfirmUpdate() {
    if (!editingItem) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (onUpdateLimit) {
        const ok = await onUpdateLimit({
          propertyId,
          roomTypeId: editingItem.item.roomTypeId,
          date: editingItem.item.date,
          overbookingLimit: editingItem.overbookingLimit,
          sellLimit: editingItem.sellLimit,
        });

        if (ok) {
          setSuccessMessage(
            `Ajuste de capacidad guardado para ${editingItem.item.roomTypeName} (${editingItem.item.date}).`,
          );
          setEditingItem(null);
          if (onRefresh) onRefresh();
        } else {
          setErrorMessage("No se pudo guardar el ajuste en el servidor.");
        }
      } else {
        setSuccessMessage("Ajuste simulado correctamente.");
        setEditingItem(null);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error al actualizar límite.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 }}>
              Gestión de Sell Limits y Overbooking
            </h2>
            <StatusBadge variant="info">Inventario & Capacidad</StatusBadge>
            {!canEdit && <StatusBadge variant="warning">Solo Lectura</StatusBadge>}
          </div>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0 0" }}>
            Ajusta márgenes de sobreventa comercial o topes máximos de venta sin alterar la capacidad física real.
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            style={{
              padding: "8px 12px",
              fontSize: "13px",
              color: "#374151",
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            {isLoading ? "Cargando..." : "↻ Refrescar"}
          </button>
        )}
      </div>

      {/* Permission Warning if Read-only */}
      {!canEdit && (
        <div
          role="note"
          style={{
            padding: "10px 24px",
            backgroundColor: "#fffbeb",
            borderBottom: "1px solid #fef3c7",
            color: "#92400e",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>🔒</span>
          <span>
            <strong>Modo Solo Lectura:</strong> Se requiere el permiso <code>inventory:overbooking:manage</code> para modificar límites de venta y sobreventa.
          </span>
        </div>
      )}

      {/* Messages */}
      {successMessage && (
        <div
          role="status"
          style={{
            padding: "12px 24px",
            backgroundColor: "#ecfdf5",
            borderBottom: "1px solid #a7f3d0",
            color: "#065f46",
            fontSize: "13px",
          }}
        >
          ✓ {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: "12px 24px",
            backgroundColor: "#fef2f2",
            borderBottom: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: "13px",
          }}
        >
          ⚠ {errorMessage}
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          padding: "14px 24px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <label style={{ fontSize: "12px", fontWeight: "500", color: "#4b5563", marginRight: "6px" }}>
            Tipo de Habitación:
          </label>
          <select
            value={selectedRoomType}
            onChange={(e) => setSelectedRoomType(e.target.value)}
            style={{
              padding: "6px 10px",
              fontSize: "13px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
            }}
          >
            <option value="ALL">Todas las habitaciones</option>
            {uniqueRoomTypes.map((rt) => (
              <option key={rt} value={rt}>
                {rt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: "500", color: "#4b5563", marginRight: "6px" }}>
            Filtrar Fecha:
          </label>
          <input
            type="text"
            placeholder="YYYY-MM-DD"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{
              padding: "6px 10px",
              fontSize: "13px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              width: "140px",
            }}
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563" }}>
              <th style={{ padding: "12px 16px", fontWeight: "600" }}>Fecha</th>
              <th style={{ padding: "12px 16px", fontWeight: "600" }}>Habitación</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>Capacidad Física</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>OOO / OOS</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>Ocupadas / Vendidas</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>Overbooking (+)</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>Sell Limit Max</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>ATS Vendible Final</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                  No hay registros de capacidad para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const base = Math.max(
                  0,
                  item.physicalRoomsCount - item.oooRoomsCount - item.oosRoomsCount - item.soldRoomsCount,
                );

                return (
                  <tr key={`${item.roomTypeId}_${item.date}`} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "500", color: "#111827" }}>
                      {item.date}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#111827" }}>
                      <div style={{ fontWeight: "600" }}>{item.roomTypeName}</div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>{item.roomTypeId}</div>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#2563eb" }}>
                      <span
                        title="Inventario físico fijo"
                        style={{
                          backgroundColor: "#eff6ff",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          border: "1px solid #bfdbfe",
                        }}
                      >
                        {item.physicalRoomsCount}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#dc2626" }}>
                      {item.oooRoomsCount + item.oosRoomsCount > 0 ? (
                        <span style={{ backgroundColor: "#fee2e2", padding: "2px 6px", borderRadius: "4px" }}>
                          -{item.oooRoomsCount + item.oosRoomsCount} ({item.oooRoomsCount} OOO / {item.oosRoomsCount} OOS)
                        </span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#4b5563" }}>
                      {item.soldRoomsCount}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {item.overbookingLimit > 0 ? (
                        <span
                          style={{
                            fontWeight: "600",
                            color: "#059669",
                            backgroundColor: "#ecfdf5",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            border: "1px solid #a7f3d0",
                          }}
                        >
                          +{item.overbookingLimit}
                        </span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {item.sellLimit !== null ? (
                        <span
                          style={{
                            fontWeight: "600",
                            color: "#7c3aed",
                            backgroundColor: "#f5f3ff",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            border: "1px solid #ddd6fe",
                          }}
                        >
                          Tope: {item.sellLimit}
                        </span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>Sin tope</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          minWidth: "32px",
                          fontWeight: "700",
                          fontSize: "14px",
                          color: item.calculatedATS > 0 ? "#065f46" : "#991b1b",
                          backgroundColor: item.calculatedATS > 0 ? "#d1fae5" : "#fee2e2",
                          padding: "4px 10px",
                          borderRadius: "6px",
                        }}
                      >
                        {item.calculatedATS}
                      </span>
                      <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
                        (Base: {base})
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button
                        type="button"
                        aria-label={`Editar límite para ${item.roomTypeId} ${item.date}`}
                        disabled={!canEdit}
                        onClick={() => handleOpenEdit(item)}
                        style={{
                          padding: "5px 12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          borderRadius: "4px",
                          border: "1px solid #d1d5db",
                          backgroundColor: canEdit ? "#ffffff" : "#f3f4f6",
                          color: canEdit ? "#1f2937" : "#9ca3af",
                          cursor: canEdit ? "pointer" : "not-allowed",
                        }}
                      >
                        Ajustar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer domain rules reminder */}
      <div
        style={{
          padding: "14px 24px",
          backgroundColor: "#f9fafb",
          borderTop: "1px solid #e5e7eb",
          fontSize: "12px",
          color: "#4b5563",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <strong>Regla de Dominio:</strong> El inventario físico es inmutable. El margen de overbooking y el límite de venta
          únicamente recalculan el ATS comercial vendible.
        </div>
        <div style={{ color: "#6b7280" }}>
          Propiedad: <code>{propertyId}</code>
        </div>
      </div>

      {/* Edit Modal */}
      {editingItem && (
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
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                Ajustar Capacidad Vendible
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                style={{ background: "transparent", border: "none", fontSize: "18px", cursor: "pointer", color: "#6b7280" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#f3f4f6", borderRadius: "8px" }}>
                <div style={{ fontWeight: "600", color: "#111827" }}>{editingItem.item.roomTypeName}</div>
                <div style={{ fontSize: "12px", color: "#4b5563", marginTop: "2px" }}>
                  Fecha: <strong>{editingItem.item.date}</strong> | Capacidad Física:{" "}
                  <strong>{editingItem.item.physicalRoomsCount} habitaciones</strong>
                </div>
              </div>

              {/* Overbooking Input */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                  Margen de Sobreventa / Overbooking (+ Habitaciones):
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  aria-label="Margen de Overbooking"
                  value={editingItem.overbookingLimit}
                  onChange={(e) =>
                    setEditingItem((prev) =>
                      prev
                        ? {
                            ...prev,
                            overbookingLimit: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }
                        : null,
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "14px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                  }}
                />
                <span style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px", display: "block" }}>
                  Permite vender por encima de la capacidad física previendo no-shows y cancelaciones.
                </span>
              </div>

              {/* Sell Limit Input */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
                  Tope Máximo de Venta (Sell Limit Manual):
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="Sin límite manual (vacío)"
                  aria-label="Sell Limit"
                  value={editingItem.sellLimit ?? ""}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setEditingItem((prev) =>
                      prev
                        ? {
                            ...prev,
                            sellLimit: val === "" ? null : Math.max(0, parseInt(val, 10) || 0),
                          }
                        : null,
                    );
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "14px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                  }}
                />
                <span style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px", display: "block" }}>
                  Restringe el inventario comercializable a un máximo específico. Dejar vacío si no aplica.
                </span>
              </div>

              {/* Calculated ATS Preview */}
              {(() => {
                const newAts = calculateSellableATS(
                  editingItem.item.physicalRoomsCount,
                  editingItem.item.oooRoomsCount,
                  editingItem.item.oosRoomsCount,
                  editingItem.item.soldRoomsCount,
                  editingItem.overbookingLimit,
                  editingItem.sellLimit,
                );

                return (
                  <div
                    style={{
                      padding: "12px 16px",
                      backgroundColor: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "12px", color: "#065f46" }}>ATS Vendible Resultante:</div>
                      <div style={{ fontSize: "18px", fontWeight: "700", color: "#065f46" }}>
                        {newAts} habitaciones
                      </div>
                    </div>
                    {editingItem.overbookingLimit > 0 && (
                      <div style={{ fontSize: "11px", color: "#92400e", backgroundColor: "#fef3c7", padding: "4px 8px", borderRadius: "4px" }}>
                        ⚠ Sobreventa activa (+{editingItem.overbookingLimit})
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                disabled={isSubmitting}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
                  color: "#374151",
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdate}
                disabled={isSubmitting}
                style={{
                  padding: "8px 18px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#ffffff",
                  backgroundColor: "#2563eb",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {isSubmitting ? "Guardando..." : "Confirmar y Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

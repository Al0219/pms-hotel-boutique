"use client";

import { useState } from "react";

import { StatusBadge } from "@/shared/components";
import type {
  RateRestriction,
  RateRestrictionUpdateItem,
} from "../model/rate-restriction";

export interface RateRestrictionsGridProps {
  restrictions: RateRestriction[];
  propertyId: string;
  onApplyChanges?: (changes: RateRestrictionUpdateItem[]) => Promise<boolean>;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function RateRestrictionsGrid({
  restrictions,
  propertyId,
  onApplyChanges,
  onRefresh,
  isLoading = false,
}: RateRestrictionsGridProps) {
  // Pending staged edits keyed by `ratePlanId_roomTypeId_date`
  const [stagedChanges, setStagedChanges] = useState<Record<string, RateRestrictionUpdateItem>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [filterRatePlan, setFilterRatePlan] = useState<string>("ALL");
  const [filterRoomType, setFilterRoomType] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("");

  function getKey(ratePlanId: string, roomTypeId: string, date: string): string {
    return `${ratePlanId}_${roomTypeId}_${date}`;
  }

  function getEffectiveValue<T>(
    item: RateRestriction,
    field: keyof RateRestrictionUpdateItem,
    defaultValue: T,
  ): T {
    const key = getKey(item.ratePlanId, item.roomTypeId, item.date);
    const staged = stagedChanges[key];
    if (staged && staged[field] !== undefined) {
      return staged[field] as unknown as T;
    }
    return (item[field as keyof RateRestriction] as unknown as T) ?? defaultValue;
  }

  function handleFieldChange(
    item: RateRestriction,
    field: "closedToArrival" | "closedToDeparture" | "minLengthOfStay" | "stopSell",
    value: boolean | number,
  ) {
    const key = getKey(item.ratePlanId, item.roomTypeId, item.date);
    const existingStaged = stagedChanges[key] || {
      ratePlanId: item.ratePlanId,
      roomTypeId: item.roomTypeId,
      date: item.date,
    };

    const updated = {
      ...existingStaged,
      [field]: value,
    };

    setStagedChanges((prev) => ({
      ...prev,
      [key]: updated,
    }));
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleDiscardChanges() {
    setStagedChanges({});
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function handleConfirmApply() {
    const changesList = Object.values(stagedChanges);
    if (changesList.length === 0) {
      setIsPreviewOpen(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (onApplyChanges) {
        const ok = await onApplyChanges(changesList);
        if (ok) {
          setStagedChanges({});
          setIsPreviewOpen(false);
          setSuccessMessage(`Se aplicaron ${changesList.length} restricciones con éxito.`);
          if (onRefresh) onRefresh();
        } else {
          setErrorMessage("Error al aplicar cambios en el servidor. Las modificaciones no confirmadas se mantienen para revisión.");
        }
      } else {
        // Mock fallback
        setStagedChanges({});
        setIsPreviewOpen(false);
        setSuccessMessage("Cambios aplicados en modo simulado.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado al aplicar restricciones.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const stagedCount = Object.keys(stagedChanges).length;

  const filteredRestrictions = restrictions.filter((r) => {
    if (filterRatePlan !== "ALL" && r.ratePlanId !== filterRatePlan) return false;
    if (filterRoomType !== "ALL" && r.roomTypeId !== filterRoomType) return false;
    if (filterDate && !r.date.includes(filterDate)) return false;
    return true;
  });

  const uniqueRatePlans = Array.from(new Set(restrictions.map((r) => r.ratePlanId)));
  const uniqueRoomTypes = Array.from(new Set(restrictions.map((r) => r.roomTypeId)));

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
              Gestión de Restricciones Tarifarias
            </h2>
            <StatusBadge variant="info">Revenue & Commercial</StatusBadge>
          </div>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0 0" }}>
            Control de llegada (CTA), salida (CTD), estadía mínima (MinLOS) y paro de ventas (Stop Sell).
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {stagedCount > 0 && (
            <>
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={isSubmitting}
                style={{
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#dc2626",
                  backgroundColor: "#fee2e2",
                  border: "1px solid #fca5a5",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Descartar ({stagedCount})
              </button>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                disabled={isSubmitting}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#ffffff",
                  backgroundColor: "#2563eb",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                }}
              >
                Previsualizar y Aplicar ({stagedCount})
              </button>
            </>
          )}

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
      </div>

      {/* Notifications */}
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

      {/* Filter Controls */}
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
            Plan Tarifario:
          </label>
          <select
            value={filterRatePlan}
            onChange={(e) => setFilterRatePlan(e.target.value)}
            style={{
              padding: "6px 10px",
              fontSize: "13px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
            }}
          >
            <option value="ALL">Todos los planes</option>
            {uniqueRatePlans.map((rp) => (
              <option key={rp} value={rp}>
                {rp}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: "500", color: "#4b5563", marginRight: "6px" }}>
            Habitación:
          </label>
          <select
            value={filterRoomType}
            onChange={(e) => setFilterRoomType(e.target.value)}
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

      {/* Grid Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563" }}>
              <th style={{ padding: "12px 16px", fontWeight: "600" }}>Fecha</th>
              <th style={{ padding: "12px 16px", fontWeight: "600" }}>Tarifa (Rate Plan)</th>
              <th style={{ padding: "12px 16px", fontWeight: "600" }}>Tipo Habitación</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>CTA (Cerrar Llegada)</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>CTD (Cerrar Salida)</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>MinLOS (Noches)</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>Stop Sell</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>Estado Edición</th>
            </tr>
          </thead>
          <tbody>
            {filteredRestrictions.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                  No se encontraron restricciones con los filtros actuales.
                </td>
              </tr>
            ) : (
              filteredRestrictions.map((item) => {
                const key = getKey(item.ratePlanId, item.roomTypeId, item.date);
                const isStaged = Boolean(stagedChanges[key]);
                const cta = getEffectiveValue<boolean>(item, "closedToArrival", false);
                const ctd = getEffectiveValue<boolean>(item, "closedToDeparture", false);
                const minLos = getEffectiveValue<number>(item, "minLengthOfStay", 1);
                const stopSell = getEffectiveValue<boolean>(item, "stopSell", false);

                return (
                  <tr
                    key={key}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      backgroundColor: isStaged ? "#eff6ff" : "transparent",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: "500", color: "#111827" }}>
                      {item.date}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#374151" }}>
                      <span
                        style={{
                          backgroundColor: "#f3f4f6",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontFamily: "monospace",
                          fontSize: "12px",
                        }}
                      >
                        {item.ratePlanId}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#374151" }}>
                      <span
                        style={{
                          backgroundColor: "#f3f4f6",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontFamily: "monospace",
                          fontSize: "12px",
                        }}
                      >
                        {item.roomTypeId}
                      </span>
                    </td>

                    {/* CTA Toggle */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button
                        type="button"
                        aria-label={`Toggle CTA for ${item.ratePlanId} ${item.roomTypeId} ${item.date}`}
                        onClick={() => handleFieldChange(item, "closedToArrival", !cta)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: "600",
                          borderRadius: "4px",
                          border: cta ? "1px solid #f59e0b" : "1px solid #d1d5db",
                          backgroundColor: cta ? "#fef3c7" : "#f9fafb",
                          color: cta ? "#92400e" : "#6b7280",
                          cursor: "pointer",
                        }}
                      >
                        {cta ? "CTA ACTIVO" : "Abierto"}
                      </button>
                    </td>

                    {/* CTD Toggle */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button
                        type="button"
                        aria-label={`Toggle CTD for ${item.ratePlanId} ${item.roomTypeId} ${item.date}`}
                        onClick={() => handleFieldChange(item, "closedToDeparture", !ctd)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: "600",
                          borderRadius: "4px",
                          border: ctd ? "1px solid #3b82f6" : "1px solid #d1d5db",
                          backgroundColor: ctd ? "#dbeafe" : "#f9fafb",
                          color: ctd ? "#1e40af" : "#6b7280",
                          cursor: "pointer",
                        }}
                      >
                        {ctd ? "CTD ACTIVO" : "Abierto"}
                      </button>
                    </td>

                    {/* MinLOS Input */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        aria-label={`MinLOS for ${item.ratePlanId} ${item.roomTypeId} ${item.date}`}
                        value={minLos}
                        onChange={(e) =>
                          handleFieldChange(
                            item,
                            "minLengthOfStay",
                            Math.max(1, parseInt(e.target.value, 10) || 1),
                          )
                        }
                        style={{
                          width: "56px",
                          padding: "4px 6px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: "600",
                          borderRadius: "4px",
                          border: minLos > 1 ? "1px solid #8b5cf6" : "1px solid #d1d5db",
                          backgroundColor: minLos > 1 ? "#f5f3ff" : "#ffffff",
                          color: minLos > 1 ? "#6d28d9" : "#374151",
                        }}
                      />
                    </td>

                    {/* Stop Sell Toggle */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button
                        type="button"
                        aria-label={`Toggle StopSell for ${item.ratePlanId} ${item.roomTypeId} ${item.date}`}
                        onClick={() => handleFieldChange(item, "stopSell", !stopSell)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: "600",
                          borderRadius: "4px",
                          border: stopSell ? "1px solid #ef4444" : "1px solid #d1d5db",
                          backgroundColor: stopSell ? "#fee2e2" : "#f9fafb",
                          color: stopSell ? "#b91c1c" : "#6b7280",
                          cursor: "pointer",
                        }}
                      >
                        {stopSell ? "STOP SELL" : "Venta Activa"}
                      </button>
                    </td>

                    {/* Staged State */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {isStaged ? (
                        <StatusBadge variant="warning">Editado (Pendiente)</StatusBadge>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#9ca3af" }}>Confirmado</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Domain Rule Reminder Footer */}
      <div
        style={{
          padding: "16px 24px",
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
          <strong>Regla de Dominio:</strong> Las restricciones tarifarias (CTA, CTD, MinLOS, Stop Sell) regulan las
          condiciones comerciales sin eliminar inventario físico ni alterar el estado de ama de llaves de las habitaciones.
        </div>
        <div style={{ color: "#6b7280" }}>
          Propiedad activa: <code>{propertyId}</code>
        </div>
      </div>

      {/* Preview & Apply Modal */}
      {isPreviewOpen && (
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
              maxWidth: "600px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
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
                Previsualizar Cambios de Restricciones
              </h3>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              <p style={{ fontSize: "13px", color: "#4b5563", marginTop: 0 }}>
                Estás a punto de aplicar las siguientes {stagedCount} modificaciones de restricción tarifaria.
                Los cambios se confirmarán directamente en el servidor sin mutación optimista no autorizada:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {Object.values(stagedChanges).map((change) => (
                  <div
                    key={`${change.ratePlanId}_${change.roomTypeId}_${change.date}`}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "6px",
                      border: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
                      {change.date} — {change.ratePlanId} ({change.roomTypeId})
                    </div>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "12px" }}>
                      {change.closedToArrival !== undefined && (
                        <span>
                          CTA: <strong>{change.closedToArrival ? "Cerrado (ACTIVO)" : "Abierto"}</strong>
                        </span>
                      )}
                      {change.closedToDeparture !== undefined && (
                        <span>
                          CTD: <strong>{change.closedToDeparture ? "Cerrado (ACTIVO)" : "Abierto"}</strong>
                        </span>
                      )}
                      {change.minLengthOfStay !== undefined && (
                        <span>
                          MinLOS: <strong>{change.minLengthOfStay} noches</strong>
                        </span>
                      )}
                      {change.stopSell !== undefined && (
                        <span>
                          StopSell: <strong>{change.stopSell ? "DETENIDO (StopSell)" : "Venta Activa"}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
                onClick={() => setIsPreviewOpen(false)}
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
                onClick={handleConfirmApply}
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
                {isSubmitting ? "Aplicando en Servidor..." : "Confirmar y Aplicar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchAvailabilityMatrixDto } from "../service/availability-matrix.service";
import { mapAvailabilityMatrixQueryToDto, mapAvailabilityMatrixResponseToDomain } from "../mappers/availability-matrix.mapper";
import { AvailabilityMatrixGrid } from "./availability-matrix-grid";
import type { AvailabilityMatrixQuery, AvailabilityMatrixResult } from "../model/availability-option";

export function AvailabilityPage() {
  const [matrixResult, setMatrixResult] = useState<AvailabilityMatrixResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatrix = useCallback(async (query: AvailabilityMatrixQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const dtoQuery = mapAvailabilityMatrixQueryToDto(query);
      const resDto = await fetchAvailabilityMatrixDto(dtoQuery);
      const domainResult = mapAvailabilityMatrixResponseToDomain(resDto);
      setMatrixResult(domainResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la matriz de disponibilidad");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const fetchInitial = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dtoQuery = mapAvailabilityMatrixQueryToDto({
          propertyId: "prop_boutique_01",
          startDate: "2026-10-01",
          endDate: "2026-10-07",
        });
        const resDto = await fetchAvailabilityMatrixDto(dtoQuery);
        if (!isCancelled) {
          setMatrixResult(mapAvailabilityMatrixResponseToDomain(resDto));
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar la matriz de disponibilidad");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchInitial();
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: "28px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: 0 }}>
          Matriz de Disponibilidad ATS Comercial
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "4px 0 0 0" }}>
          Visualización diaria de capacidad física, habitaciones vendidas, fuera de servicio (OOO/OOS) y disponibilidad comercial vendible.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: "16px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* Matrix Grid */}
      {matrixResult ? (
        <AvailabilityMatrixGrid
          matrixResult={matrixResult}
          isLoading={isLoading}
          onRefresh={(query) => loadMatrix(query)}
        />
      ) : (
        isLoading && (
          <div style={{ padding: "48px", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
            <p style={{ color: "#6b7280", margin: 0 }}>Cargando matriz de disponibilidad...</p>
          </div>
        )
      )}
    </div>
  );
}

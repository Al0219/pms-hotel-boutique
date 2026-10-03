"use client";

import React, { useState, useEffect } from "react";
import { useRateRestrictions } from "../hooks/use-rate-restrictions";
import { fetchRatePlansDto } from "../service/rate-plan.service";
import { mapRatePlanListResponseDtoToDomain } from "../mappers/rate-plan.mapper";
import { RatePlanListCard } from "./rate-plan-list-card";
import { RatePlanDetailModal } from "./rate-plan-detail-modal";
import { RateRestrictionsGrid } from "./rate-restrictions-grid";
import type { RatePlan } from "../model/rate-plan";

export function RatesPage() {
  const [activeTab, setActiveTab] = useState<"restrictions" | "plans">("restrictions");
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [selectedRatePlan, setSelectedRatePlan] = useState<RatePlan | null>(null);

  const {
    restrictions,
    isLoading: isRestrictionsLoading,
    error: restrictionsError,
    loadRestrictions,
    updateBatch,
  } = useRateRestrictions({
    propertyId: "prop_boutique_01",
    startDate: "2026-10-01",
    endDate: "2026-10-07",
  });

  useEffect(() => {
    let isCancelled = false;
    const fetchInitialPlans = async () => {
      try {
        const resDto = await fetchRatePlansDto();
        if (!isCancelled) {
          const domainResult = mapRatePlanListResponseDtoToDomain(resDto);
          setRatePlans(domainResult.ratePlans);
        }
      } catch {
        // Handled silently
      }
    };

    void fetchInitialPlans();
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: "28px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: 0 }}>
            Planes Tarifarios y Restricciones de Venta
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: "4px 0 0 0" }}>
            Control de condiciones comerciales (MinLOS, StopSell, CTA, CTD) y catálogo de tarifas configuradas.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "8px", backgroundColor: "#f3f4f6", padding: "4px", borderRadius: "8px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("restrictions")}
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: "600",
              borderRadius: "6px",
              border: "none",
              backgroundColor: activeTab === "restrictions" ? "#ffffff" : "transparent",
              color: activeTab === "restrictions" ? "#111827" : "#6b7280",
              boxShadow: activeTab === "restrictions" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              cursor: "pointer",
            }}
          >
            Matriz de Restricciones
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("plans")}
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: "600",
              borderRadius: "6px",
              border: "none",
              backgroundColor: activeTab === "plans" ? "#ffffff" : "transparent",
              color: activeTab === "plans" ? "#111827" : "#6b7280",
              boxShadow: activeTab === "plans" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              cursor: "pointer",
            }}
          >
            Planes Tarifarios ({ratePlans.length})
          </button>
        </div>
      </div>

      {/* Restrictions Tab */}
      {activeTab === "restrictions" && (
        <>
          {restrictionsError && (
            <div style={{ padding: "16px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", marginBottom: "20px" }}>
              {restrictionsError}
            </div>
          )}
          <RateRestrictionsGrid
            restrictions={restrictions}
            propertyId="prop_boutique_01"
            isLoading={isRestrictionsLoading}
            onApplyChanges={async (changes) => {
              const res = await updateBatch({ propertyId: "prop_boutique_01", restrictions: changes });
              return res.success;
            }}
            onRefresh={() =>
              loadRestrictions({
                propertyId: "prop_boutique_01",
                startDate: "2026-10-01",
                endDate: "2026-10-07",
              })
            }
          />
        </>
      )}

      {/* Plans Tab */}
      {activeTab === "plans" && (
        <RatePlanListCard
          ratePlans={ratePlans}
          onSelectRatePlan={(rp) => setSelectedRatePlan(rp)}
        />
      )}

      {/* Rate Plan Detail Modal */}
      {selectedRatePlan && (
        <RatePlanDetailModal
          ratePlan={selectedRatePlan}
          onClose={() => setSelectedRatePlan(null)}
        />
      )}
    </div>
  );
}

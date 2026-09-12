import React from 'react';
import { RevenueKpiSummary } from '../model/revenue-kpi';

interface KpiCardsProps {
  summary: RevenueKpiSummary;
  currency: string;
}

export function KpiCards({ summary, currency }: KpiCardsProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
        <h3 className="text-sm font-medium text-gray-500">Occupancy</h3>
        <p className="text-2xl font-bold text-gray-900 mt-1">{formatPercent(summary.occupancyPercent)}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
        <h3 className="text-sm font-medium text-gray-500">ADR</h3>
        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.adr)}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
        <h3 className="text-sm font-medium text-gray-500">RevPAR</h3>
        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.revPar)}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
        <h3 className="text-sm font-medium text-gray-500">Pickup</h3>
        <p className="text-2xl font-bold text-green-600 mt-1">+{summary.pickup}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
        <h3 className="text-sm font-medium text-gray-500">Pace</h3>
        <p className="text-2xl font-bold text-blue-600 mt-1">{formatPercent(summary.pace)}</p>
      </div>
    </div>
  );
}

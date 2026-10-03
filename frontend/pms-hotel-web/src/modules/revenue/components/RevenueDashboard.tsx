"use client";

import React, { useState } from 'react';
import { useRevenueKpis } from '../hooks/use-revenue-kpis';
import { KpiCards } from './KpiCards';
import { KpiCharts } from './KpiCharts';

interface RevenueDashboardProps {
  propertyId: string;
}

export function RevenueDashboard({ propertyId }: RevenueDashboardProps) {
  // Default dates for the demo (in a real app, these would be controlled by a date picker)
  const [startDate] = useState("2023-10-01");
  const [endDate] = useState("2023-10-07");

  const { kpis: data, isLoading: loading, error } = useRevenueKpis({
    propertyId,
    startDate,
    endDate,
  });

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-80 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-red-200">
        <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Revenue Data</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revenue Dashboard</h2>
          <p className="text-sm text-gray-500">Property: {data.propertyId} | Dates: {startDate} to {endDate}</p>
        </div>
      </div>

      <KpiCards summary={data.summary} currency={data.currency} />
      <KpiCharts data={data.daily} />
    </div>
  );
}

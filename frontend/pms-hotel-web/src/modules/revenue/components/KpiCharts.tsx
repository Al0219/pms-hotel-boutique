"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { RevenueKpiDaily } from '../model/revenue-kpi';

interface KpiChartsProps {
  data: RevenueKpiDaily[];
}

export function KpiCharts({ data }: KpiChartsProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-100 mt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Performance Trends</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="occupancyPercent"
              name="Occupancy (%)"
              stroke="#3b82f6"
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="adr"
              name="ADR"
              stroke="#10b981"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="revPar"
              name="RevPAR"
              stroke="#f59e0b"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

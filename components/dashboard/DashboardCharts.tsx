'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { name: 'Lun', km: 4000, comb: 2400 },
  { name: 'Mar', km: 3000, comb: 1398 },
  { name: 'Mié', km: 2000, comb: 9800 },
  { name: 'Jue', km: 2780, comb: 3908 },
  { name: 'Vie', km: 1890, comb: 4800 },
  { name: 'Sáb', km: 2390, comb: 3800 },
  { name: 'Dom', km: 3490, comb: 4300 },
];

export function DashboardCharts() {
  return (
    <div className="flex flex-col p-6 rounded-2xl bg-card border border-border shadow-sm h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Rendimiento Semanal (Kilometraje vs Combustible)
        </h3>
        <p className="text-sm text-muted-foreground">
          Comparativa de distancia recorrida y gasto de combustible de la flota activa.
        </p>
      </div>

      <div className="h-[300px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E2793D" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#E2793D" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorComb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              stroke="#8A8A8D" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              dy={10} 
            />
            <YAxis 
              stroke="#8A8A8D" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              dx={-10} 
            />
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" vertical={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181B',
                borderColor: '#2A2A2E',
                borderRadius: '8px',
                color: '#F5F0EB',
              }}
              itemStyle={{ color: '#F5F0EB' }}
            />
            <Area
              type="monotone"
              dataKey="km"
              stroke="#E2793D"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorKm)"
            />
            <Area
              type="monotone"
              dataKey="comb"
              stroke="#2DD4BF"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorComb)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

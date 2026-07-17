'use client';

import React from 'react';
import { Truck, AlertTriangle, Fuel, Clock } from 'lucide-react';

const kpis = [
  {
    title: 'Camiones Activos',
    value: '142',
    change: '+4 vs ayer',
    trend: 'positive',
    icon: Truck,
  },
  {
    title: 'Alertas Críticas',
    value: '3',
    change: '-2 vs ayer',
    trend: 'positive',
    icon: AlertTriangle,
  },
  {
    title: 'Eficiencia Combustible',
    value: '4.8 km/l',
    change: '+0.2 km/l',
    trend: 'positive',
    icon: Fuel,
  },
  {
    title: 'Entregas a Tiempo',
    value: '94%',
    change: '-1% vs ayer',
    trend: 'negative',
    icon: Clock,
  },
];

export function DashboardStats() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        const isPositive = kpi.trend === 'positive';
        
        return (
          <div
            key={i}
            className="flex flex-col p-6 rounded-2xl bg-card border border-border shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.title}
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {kpi.value}
              </span>
            </div>
            <p
              className={`mt-2 text-xs font-medium ${
                isPositive ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {kpi.change}
            </p>
          </div>
        );
      })}
    </div>
  );
}

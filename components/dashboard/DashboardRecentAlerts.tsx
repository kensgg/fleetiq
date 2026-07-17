'use client';

import React from 'react';
import { AlertCircle, Wrench, ShieldAlert } from 'lucide-react';

const alerts = [
  {
    id: 1,
    truck: 'TRK-102',
    type: 'critical',
    message: 'Exceso de velocidad en tramo federal (110 km/h)',
    time: 'Hace 5 min',
    icon: ShieldAlert,
  },
  {
    id: 2,
    truck: 'TRK-084',
    type: 'warning',
    message: 'Mantenimiento preventivo sugerido (Frenos)',
    time: 'Hace 45 min',
    icon: Wrench,
  },
  {
    id: 3,
    truck: 'TRK-291',
    type: 'info',
    message: 'Desvío de ruta detectado',
    time: 'Hace 2 horas',
    icon: AlertCircle,
  },
];

export function DashboardRecentAlerts() {
  return (
    <div className="flex flex-col p-6 rounded-2xl bg-card border border-border shadow-sm h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Alertas Recientes
        </h3>
        <p className="text-sm text-muted-foreground">
          Eventos que requieren atención operativa.
        </p>
      </div>

      <div className="mt-2 flex flex-col gap-4">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          const iconColor = 
            alert.type === 'critical' ? 'text-rose-500 bg-rose-500/10' :
            alert.type === 'warning' ? 'text-amber-500 bg-amber-500/10' :
            'text-blue-500 bg-blue-500/10';

          return (
            <div 
              key={alert.id}
              className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {alert.truck}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {alert.time}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {alert.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      <button className="mt-auto pt-4 text-sm font-medium text-primary hover:text-primary/80 transition-colors text-center w-full">
        Ver todas las alertas →
      </button>
    </div>
  );
}

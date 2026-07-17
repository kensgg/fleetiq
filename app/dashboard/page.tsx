import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { DashboardMap } from '@/components/dashboard/DashboardMap';
import { DashboardRecentAlerts } from '@/components/dashboard/DashboardRecentAlerts';

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard Operativo
        </h1>
        <p className="text-muted-foreground mt-2">
          Vista general de tu operación: KPIs, estado de flota, rutas activas y alertas recientes.
        </p>
      </div>

      {/* Row 1: KPIs */}
      <DashboardStats />

      {/* Row 2: Charts and Alerts */}
      <div className="grid gap-6 md:grid-cols-7">
        <div className="md:col-span-4">
          <DashboardCharts />
        </div>
        <div className="md:col-span-3">
          <DashboardRecentAlerts />
        </div>
      </div>

      {/* Row 3: Map */}
      <div className="w-full">
        <DashboardMap />
      </div>
    </div>
  );
}

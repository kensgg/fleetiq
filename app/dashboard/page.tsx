import { LayoutDashboard } from 'lucide-react';
import { PlaceholderPage } from '@/components/dashboard/PlaceholderPage';

export default function DashboardPage() {
  return (
    <PlaceholderPage
      icon={LayoutDashboard}
      title="Dashboard"
      description="Vista general de tu operación: KPIs, estado de flota, rutas activas y alertas recientes."
    />
  );
}

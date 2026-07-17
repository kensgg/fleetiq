import { BarChart3 } from 'lucide-react';
import { PlaceholderPage } from '@/components/dashboard/PlaceholderPage';

export default function ReportesPage() {
  return (
    <PlaceholderPage
      icon={BarChart3}
      title="Reportes"
      description="Genera reportes operativos: combustible, kilómetros recorridos, costos de mantenimiento y eficiencia de rutas."
    />
  );
}

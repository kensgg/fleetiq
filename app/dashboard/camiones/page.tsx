import { Truck } from 'lucide-react';
import { PlaceholderPage } from '@/components/dashboard/PlaceholderPage';

export default function CamionesPage() {
  return (
    <PlaceholderPage
      icon={Truck}
      title="Camiones"
      description="Gestiona tu flota: registro de unidades, documentos, mantenimientos y asignaciones de conductores."
    />
  );
}

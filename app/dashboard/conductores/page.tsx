import { Users } from 'lucide-react';
import { PlaceholderPage } from '@/components/dashboard/PlaceholderPage';

export default function ConductoresPage() {
  return (
    <PlaceholderPage
      icon={Users}
      title="Conductores"
      description="Administra los conductores de tu flota: licencias, asignaciones a unidades e historial de viajes."
    />
  );
}

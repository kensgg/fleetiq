import { Settings } from 'lucide-react';
import { PlaceholderPage } from '@/components/dashboard/PlaceholderPage';

export default function ConfiguracionPage() {
  return (
    <PlaceholderPage
      icon={Settings}
      title="Configuración"
      description="Ajustes del sistema: integraciones, webhooks, preferencias de notificación y configuración de la sede."
    />
  );
}

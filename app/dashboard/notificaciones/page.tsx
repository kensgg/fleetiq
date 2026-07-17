import { Bell } from 'lucide-react';
import { PlaceholderPage } from '@/components/dashboard/PlaceholderPage';

export default function NotificacionesPage() {
  return (
    <PlaceholderPage
      icon={Bell}
      title="Notificaciones"
      description="Centro de alertas: documentos por vencer, mantenimientos programados, incidencias en ruta y más."
    />
  );
}

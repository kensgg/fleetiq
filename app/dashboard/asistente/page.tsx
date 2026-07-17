import { Bot } from 'lucide-react';
import { PlaceholderPage } from '@/components/dashboard/PlaceholderPage';

export default function AsistentePage() {
  return (
    <PlaceholderPage
      icon={Bot}
      title="Asistente IA"
      description="Consulta datos de tu flota en lenguaje natural: estado de unidades, rutas, conductores y más."
    />
  );
}

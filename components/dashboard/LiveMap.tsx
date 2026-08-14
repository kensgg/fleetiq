'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToString } from 'react-dom/server';
import { Truck } from 'lucide-react';

// Datos mock de rutas (Origen -> Destino)
const mockRoutes = [
  {
    id: 'U-001',
    estado: 'en_ruta',
    origen: [19.4326, -99.1332], // CDMX
    destino: [25.6866, -100.3161], // Monterrey
    progreso: 0.6, // 60% del camino
    color: '#3b82f6', // primary (blue)
  },
  {
    id: 'U-002',
    estado: 'en_ruta',
    origen: [20.6596, -103.3496], // GDL
    destino: [21.1619, -86.8515], // Cancun (largo viaje)
    progreso: 0.3,
    color: '#3b82f6',
  },
  {
    id: 'U-003',
    estado: 'en_ruta',
    origen: [25.6866, -100.3161], // Monterrey
    destino: [31.7333, -106.4833], // Cd Juarez
    progreso: 0.8,
    color: '#3b82f6',
  },
  {
    id: 'U-004',
    estado: 'disponible',
    origen: [19.0414, -98.2063], // Puebla
    destino: [19.0414, -98.2063], // Estático
    progreso: 1.0,
    color: '#14b8a6', // teal
  }
];

// Helper para interpolar posición actual basada en progreso
const getInterpolatedPosition = (start: number[], end: number[], progress: number): [number, number] => {
  const lat = start[0] + (end[0] - start[0]) * progress;
  const lng = start[1] + (end[1] - start[1]) * progress;
  return [lat, lng];
};

export default function LiveMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Si no hay contenedor, o ya existe el mapa, no hacer nada inicial
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Inicializar mapa
    const map = L.map(mapContainerRef.current, {
      center: [23.6345, -102.5528], // Centro de MX
      zoom: 5,
      zoomControl: false, // Lo movemos si queremos, o lo dejamos así
      scrollWheelZoom: false,
    });
    
    // Guardar instancia
    mapInstanceRef.current = map;

    // Añadir capa base moderna (Light)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap & CartoDB',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Añadir control de zoom abajo a la derecha
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Iterar sobre las rutas para dibujar líneas y marcadores
    mockRoutes.forEach((route) => {
      // 1. Dibujar línea de la ruta (trayecto esperado)
      if (route.origen[0] !== route.destino[0] || route.origen[1] !== route.destino[1]) {
        L.polyline([route.origen as [number, number], route.destino as [number, number]], {
          color: route.color,
          weight: 3,
          opacity: 0.4,
          dashArray: '5, 10', // Línea punteada
          lineCap: 'round'
        }).addTo(map);
      }

      // 2. Calcular ubicación actual
      const currentPos = getInterpolatedPosition(route.origen, route.destino, route.progreso);

      // 3. Crear icono personalizado HTML (Mismo estilo que antes)
      const iconHtml = renderToString(
        <div className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-white shadow-lg backdrop-blur-sm transition-transform" 
             style={{ backgroundColor: route.estado === 'en_ruta' ? 'rgba(59, 130, 246, 0.9)' : 'rgba(20, 184, 166, 0.9)', color: 'white' }}>
          <Truck className="w-5 h-5" />
        </div>
      );

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-icon-native',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -25],
      });

      // 4. Añadir marcador
      const marker = L.marker(currentPos, { icon: customIcon }).addTo(map);

      // 5. Añadir Popup
      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; text-align: center;">
          <h4 style="margin: 0; font-size: 14px; font-weight: bold; color: #1e293b;">Unidad: ${route.id}</h4>
          <p style="margin: 4px 0 0; font-size: 11px; color: #64748b; text-transform: uppercase;">
            ${route.estado === 'en_ruta' ? 'En ruta (' + Math.round(route.progreso*100) + '%)' : 'Disponible'}
          </p>
        </div>
      `);
    });

    // Crear un ResizeObserver para reajustar el mapa automáticamente si el contenedor cambia de tamaño (ej. al abrir en un Modal)
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    
    resizeObserver.observe(mapContainerRef.current);

    // Cleanup AL DESMONTAR para evitar el error de react strict mode
    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative group">
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      {/* Overlay gradiente inferior para transición suave con el contenido */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
    </div>
  );
}

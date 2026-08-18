'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToString } from 'react-dom/server';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import type { GeoJsonLineString } from '@/lib/services/osrm';

interface RouteMapProps {
  origen?: { lat: number; lng: number } | null;
  destino?: { lat: number; lng: number } | null;
  puntosIntermedios?: { lat: number; lng: number; nombre?: string }[];
  geometria?: GeoJsonLineString | null;
  isLoading?: boolean;
  className?: string;
  errorMsg?: string | null;
}

export default function RouteMap({
  origen,
  destino,
  puntosIntermedios = [],
  geometria,
  isLoading = false,
  className = '',
  errorMsg = null,
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Inicializar mapa
    const map = L.map(mapContainerRef.current, {
      center: [23.6345, -102.5528], // Centro de MX
      zoom: 5,
      zoomControl: false,
    });
    
    mapInstanceRef.current = map;
    routeLayerRef.current = L.layerGroup().addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap & CartoDB',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        routeLayerRef.current = null;
      }
    };
  }, []);

  // Actualizar marcadores y ruta cuando cambian los props
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;
    
    const layerGroup = routeLayerRef.current;
    layerGroup.clearLayers(); // Limpiar capas anteriores

    const bounds = L.latLngBounds([]);

    // Dibujar ruta (GeoJSON)
    if (geometria && geometria.coordinates && geometria.coordinates.length > 0) {
      const routeLine = L.geoJSON(geometria, {
        style: {
          color: '#3b82f6', // primary blue
          weight: 6,
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round',
        }
      });
      routeLine.addTo(layerGroup);
      
      // Si la geometría es válida, ajustar los límites a la ruta misma en lugar de a los marcadores
      const routeBounds = routeLine.getBounds();
      if (routeBounds.isValid()) {
        bounds.extend(routeBounds);
      }
    }

    // Helper para añadir marcadores
    const addMarker = (
      latLng: L.LatLngExpression, 
      color: string, 
      iconElement: React.ReactElement, 
      label: string, 
      isWaypoint = false
    ) => {
      const iconHtml = renderToString(
        <div className={`w-8 h-8 flex items-center justify-center rounded-full border-2 border-white shadow-md text-white`} 
             style={{ backgroundColor: color }}>
          {iconElement}
        </div>
      );

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-icon-native',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker(latLng, { icon: customIcon }).addTo(layerGroup);
      marker.bindPopup(`<div style="font-family: sans-serif; font-weight: bold;">${label}</div>`);
      
      // Solo extender los límites del mapa si no estamos usando la geometría completa
      if (!geometria || geometria.coordinates.length === 0) {
        bounds.extend(latLng);
      }
    };

    // Añadir origen
    if (origen?.lat && origen?.lng) {
      addMarker([origen.lat, origen.lng], '#22c55e', <Navigation className="w-4 h-4" style={{ transform: 'rotate(45deg)' }} />, 'Origen');
    }

    // Añadir paradas intermedias
    puntosIntermedios.forEach((punto, index) => {
      if (punto.lat && punto.lng) {
        addMarker(
          [punto.lat, punto.lng], 
          '#f59e0b', // amber
          <span className="font-bold text-xs">{index + 1}</span>, 
          punto.nombre || `Parada ${index + 1}`,
          true
        );
      }
    });

    // Añadir destino
    if (destino?.lat && destino?.lng) {
      addMarker([destino.lat, destino.lng], '#ef4444', <MapPin className="w-4 h-4" />, 'Destino');
    }

    // Ajustar vista
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [origen, destino, puntosIntermedios, geometria]);

  return (
    <div className={`relative w-full h-full min-h-[300px] rounded-xl overflow-hidden border border-border bg-muted/20 ${className}`}>
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Calculando ruta...</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-destructive/90 text-destructive-foreground rounded-lg shadow-lg text-sm max-w-[90%] text-center backdrop-blur-md border border-destructive">
          {errorMsg}
        </div>
      )}
    </div>
  );
}

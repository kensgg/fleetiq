'use client';

import React from 'react';
import { MapPin } from 'lucide-react';

export function DashboardMap() {
  return (
    <div className="flex flex-col p-6 rounded-2xl bg-card border border-border shadow-sm h-full relative overflow-hidden">
      <div className="mb-4 relative z-10">
        <h3 className="text-lg font-semibold text-foreground">
          Monitor de Rutas en Vivo
        </h3>
        <p className="text-sm text-muted-foreground">
          Visualización de unidades en tránsito (Simulado).
        </p>
      </div>

      {/* Aesthetic Map Container */}
      <div className="flex-1 min-h-[300px] mt-2 relative rounded-xl overflow-hidden bg-[#0A0A0A] border border-border flex items-center justify-center">
        {/* Gradients and grids to simulate a radar/map aesthetic */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, #E2793D 0%, transparent 60%),
                              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 40px 40px, 40px 40px'
          }}
        />

        {/* Pulsing Dots (Trucks) */}
        <div className="absolute top-[30%] left-[40%] flex flex-col items-center">
          <div className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-background"></span>
          </div>
          <span className="mt-1 text-[10px] font-mono text-muted-foreground bg-background/80 px-1 rounded">TRK-102</span>
        </div>

        <div className="absolute top-[60%] left-[25%] flex flex-col items-center">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-400 border border-background"></span>
          </div>
          <span className="mt-1 text-[10px] font-mono text-muted-foreground bg-background/80 px-1 rounded">TRK-084</span>
        </div>

        <div className="absolute top-[45%] left-[70%] flex flex-col items-center">
          <div className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-background"></span>
          </div>
          <span className="mt-1 text-[10px] font-mono text-muted-foreground bg-background/80 px-1 rounded">TRK-291</span>
        </div>

        <div className="absolute top-[20%] left-[65%] flex flex-col items-center">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" style={{ animationDelay: '0.5s' }}></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-400 border border-background"></span>
          </div>
          <span className="mt-1 text-[10px] font-mono text-muted-foreground bg-background/80 px-1 rounded">TRK-111</span>
        </div>

        {/* Floating badge */}
        <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm border border-border px-3 py-1.5 rounded-lg flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">142 Unidades Activas</span>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onActionClick?: () => void;
}

/**
 * Componente reutilizable para estados vacíos en listados y tablas de FleetIQ.
 * Sigue el patrón estético del directorio de usuarios de la sede.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onActionClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center p-8 md:p-12 border border-dashed border-border/50 rounded-2xl bg-card/20 max-w-md mx-auto">
      {/* Icon Wrapper */}
      <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center mb-4 text-muted-foreground">
        <Icon className="w-6 h-6" />
      </div>
      
      {/* Text Info */}
      <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
        {description}
      </p>

      {/* Optional CTA Button */}
      {actionLabel && onActionClick && (
        <Button
          onClick={onActionClick}
          className="mt-5 h-9 rounded-xl shadow-lg shadow-primary/10 font-medium px-4"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Reusable "coming soon" placeholder page for modules without UI yet.
 */
export function PlaceholderPage({ icon: Icon, title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Icon badge */}
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-primary" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">
        {title}
      </h1>

      {/* Subtitle */}
      <p className="text-sm text-muted-foreground max-w-sm mb-8">
        {description}
      </p>

      {/* Coming soon badge */}
      <span className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
        Próximamente
      </span>
    </div>
  );
}

import React from 'react';
import { Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
  /** Size variant */
  size?: LogoSize;
  /** Whether to show the "FleetIQ" wordmark text */
  showText?: boolean;
  /** Additional className for the wrapper */
  className?: string;
}

const sizeConfig: Record<LogoSize, { badge: string; icon: string; text: string }> = {
  sm: { badge: 'w-7 h-7 rounded-md', icon: 'w-3.5 h-3.5', text: 'text-sm' },
  md: { badge: 'w-9 h-9 rounded-lg', icon: 'w-[18px] h-[18px]', text: 'text-lg' },
  lg: { badge: 'w-11 h-11 rounded-xl', icon: 'w-5 h-5', text: 'text-xl' },
};

/**
 * FleetIQ Logo component — orange badge with truck icon + wordmark.
 * Reuses the exact pattern from the Login/Register pages.
 */
export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const s = sizeConfig[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'flex items-center justify-center shrink-0 bg-primary',
          s.badge,
        )}
      >
        <Truck className={cn('text-primary-foreground', s.icon)} />
      </div>
      {showText && (
        <span
          className={cn(
            'font-bold tracking-tight text-foreground',
            s.text,
          )}
        >
          Fleet<span className="text-primary">IQ</span>
        </span>
      )}
    </div>
  );
}

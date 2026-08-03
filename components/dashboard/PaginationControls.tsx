'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  disabled?: boolean;
}

/**
 * Componente unificado para los controles de paginación de tablas.
 */
export function PaginationControls({
  page,
  perPage,
  total,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const startRange = (page - 1) * perPage + 1;
  const endRange = Math.min(page * perPage, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border/50 bg-card/10">
      {/* Texto informativo */}
      <span className="text-xs text-muted-foreground">
        Mostrando <span className="font-semibold text-foreground">{startRange}</span> a{' '}
        <span className="font-semibold text-foreground">{endRange}</span> de{' '}
        <span className="font-semibold text-foreground">{total}</span> registros
      </span>

      {/* Controles de página */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || disabled}
          className="w-8 h-8 rounded-lg border-border/50 hover:border-primary/50 text-muted-foreground hover:text-foreground"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Indicador numérico simple */}
        <span className="text-xs font-medium px-3 py-1 bg-muted/40 rounded-lg border border-border/30">
          Pág. <span className="text-foreground">{page}</span> de {totalPages}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || disabled}
          className="w-8 h-8 rounded-lg border-border/50 hover:border-primary/50 text-muted-foreground hover:text-foreground"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

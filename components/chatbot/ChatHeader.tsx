import { X, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  onClose: () => void;
}

export default function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-card-foreground flex items-center gap-2">
            FleetIQ Assistant
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            En línea
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors"
        aria-label="Cerrar chat"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

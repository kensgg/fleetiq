import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  id: string;
  role: 'user' | 'gemini';
  text: string;
}

export default function ChatMessage({ role, text }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex w-full gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0',
          isUser
            ? 'bg-secondary text-secondary-foreground'
            : 'bg-primary/10 text-primary'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={cn(
          'px-4 py-3 rounded-2xl max-w-[80%] text-sm shadow-sm whitespace-pre-wrap',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-card text-card-foreground border border-border rounded-tl-sm'
        )}
      >
        {text}
      </div>
    </div>
  );
}

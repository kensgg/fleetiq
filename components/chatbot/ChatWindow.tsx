import { useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'gemini';
  text: string;
}

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (text: string) => void;
}

export default function ChatWindow({
  isOpen,
  onClose,
  messages,
  isLoading,
  error,
  onSendMessage,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  return (
    <div
      className={cn(
        'fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-120px)] glass-panel rounded-2xl flex flex-col overflow-hidden transition-all duration-300 z-50 origin-bottom-right',
        isOpen
          ? 'scale-100 opacity-100 translate-y-0'
          : 'scale-95 opacity-0 pointer-events-none translate-y-8'
      )}
    >
      <ChatHeader onClose={onClose} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Bot className="w-8 h-8" />
            </div>
            <p className="text-sm px-4">
              ¡Hola! Soy Gemini AI. ¿En qué puedo ayudarte?
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} id={msg.id} role={msg.role} text={msg.text} />
        ))}

        {isLoading && (
          <div className="flex w-full gap-3 flex-row">
            <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 bg-primary/10 text-primary">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-card text-card-foreground border border-border rounded-tl-sm text-sm shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-center text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={onSendMessage} isLoading={isLoading} />
    </div>
  );
}

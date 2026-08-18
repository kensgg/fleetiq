'use client';

import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChatWindow from './ChatWindow';

interface Message {
  id: string;
  role: 'user' | 'gemini';
  text: string;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'gemini',
      text: '¡Hola! Soy Gemini AI. ¿En qué puedo ayudarte?',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleWidget = () => setIsOpen(!isOpen);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error desconocido al contactar Gemini');
      }

      const geminiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'gemini',
        text: data.response,
      };

      setMessages((prev) => [...prev, geminiMessage]);
    } catch (err: any) {
      setError(
        err.message || 'No se pudo obtener una respuesta de Gemini. Intenta nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={toggleWidget}
        className={cn(
          "fixed bottom-6 right-6 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-300 z-50",
          isOpen ? "scale-90 opacity-0 pointer-events-none" : "scale-100 opacity-100 hover:scale-105 active:scale-95"
        )}
        aria-label="Abrir Chatbot"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <ChatWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSendMessage={handleSendMessage}
      />
    </>
  );
}

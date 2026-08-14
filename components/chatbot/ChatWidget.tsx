'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando hay mensajes nuevos
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const onChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue;
    setInputValue('');
    
    const newMessages = [...messages, { id: Date.now().toString(), role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Agregamos un mensaje vacío del asistente que iremos llenando con el stream
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error('Error en la respuesta de red');
      if (!res.body) throw new Error('Cuerpo de respuesta vacío');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // El formato de Vercel AI SDK toDataStreamResponse() emite líneas
        // donde los textos empiezan con '0:'
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const textChunk = JSON.parse(line.slice(2));
              setMessages(prev => prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: m.content + textChunk }
                  : m
              ));
            } catch (err) {
              console.error('Error parseando chunk de texto', err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Lo siento, ocurrió un error procesando tu solicitud.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 p-4 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-all duration-300 z-50 flex items-center justify-center",
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Ventana del Chat */}
      <div
        className={cn(
          "fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 z-50 border border-slate-200 dark:border-slate-800",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 pointer-events-none translate-y-8"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">FleetIQ Assistant</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Impulsado por Gemini</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center">
                <Bot className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-sm px-4">
                Hola, soy el asistente de FleetIQ. ¿En qué te puedo ayudar con la gestión de tu flota hoy?
              </p>
            </div>
          )}
          
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-3",
                m.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                m.role === 'user' 
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300" 
                  : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
              )}>
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={cn(
                  "px-4 py-3 rounded-2xl max-w-[80%] text-sm",
                  m.role === 'user'
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm"
                )}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 flex-row">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form onSubmit={onChatSubmit} className="relative flex items-center">
            <input
              className="w-full pl-4 pr-12 py-3 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-900 dark:text-white transition-all"
              value={inputValue}
              placeholder="Escribe tu pregunta..."
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

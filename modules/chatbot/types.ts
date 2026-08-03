export interface ChatbotConversacion {
  id: string; // uuid
  usuario_id: string; // uuid references profiles.id
  created_at: string; // timestamptz
}

export interface ChatbotMensaje {
  id: string; // uuid
  conversacion_id: string; // uuid references chatbot_conversaciones.id
  rol: 'usuario' | 'asistente'; // text check (rol in ('usuario', 'asistente'))
  contenido: string; // text
  created_at: string; // timestamptz
}

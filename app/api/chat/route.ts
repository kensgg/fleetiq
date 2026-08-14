import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Permitir streaming responses de hasta 30 segundos
export const maxDuration = 30;

// Inicializar cliente de supabase para tools
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const result = await streamText({
      model: google('gemini-flash-latest'),
      system: `Eres el asistente inteligente de FleetIQ, un sistema de gestión de flotas. 
      Ayudas a los administradores, gerentes y conductores a gestionar su flota, mantenimientos, rutas e incidencias.
      Eres amigable, profesional y vas directo al grano. Responde en español (o en el idioma que te hable el usuario).
      Si te preguntan por camiones o vehículos, puedes usar las herramientas para buscar información real en la base de datos.
      No inventes datos de la flota; si no los sabes, usa las herramientas o di que no tienes la información disponible.`,
      messages,
      tools: {
        buscarCamiones: tool({
          description: 'Busca camiones en la base de datos de FleetIQ por marca, modelo o placas. Útil cuando el usuario pregunta cuántos camiones hay o datos de un vehículo específico.',
          parameters: z.object({
            busqueda: z.string().describe('Término de búsqueda, puede ser marca, modelo o vacío para traer todos.'),
          }),
          execute: async ({ busqueda }) => {
            // Si no hay keys de supabase, retornamos un mock
            if (!supabaseUrl || !supabaseKey) {
              return [
                { id: '1', numero_unidad: 'U-001', marca: 'Kenworth', modelo: 'T680', placas: 'XX-123-Y', estado: 'disponible' },
                { id: '2', numero_unidad: 'U-002', marca: 'Volvo', modelo: 'VNL', placas: 'ZZ-999-W', estado: 'en_ruta' }
              ];
            }
            
            let query = supabase.from('camiones').select('*').limit(5);
            if (busqueda && busqueda.trim() !== '') {
              query = query.or(`marca.ilike.%${busqueda}%,modelo.ilike.%${busqueda}%,placas.ilike.%${busqueda}%`);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            return data;
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error detallado en /api/chat:", error);
    return new Response(JSON.stringify({ error: "Error procesando la solicitud." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

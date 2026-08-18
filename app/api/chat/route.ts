import { NextResponse } from "next/server";
import { consultar_camiones, consultar_rutas_activas } from "./tools";

const systemInstruction = "Eres el asistente virtual con inteligencia artificial de FleetIQ, una plataforma SaaS especializada en la gestión de flotillas de transporte. Tu función es ayudar a los administradores, gerentes de operaciones, supervisores y conductores a resolver dudas sobre la plataforma. El sistema maneja información sobre camiones (disponibilidad, mantenimiento, documentos), conductores, rutas (origen, destino, incidencias) y reportes de eficiencia y combustible. Tienes acceso a herramientas para consultar la base de datos en tiempo real. Úsalas de forma obligatoria cuando el usuario pregunte sobre datos de camiones o rutas. Responde de manera profesional, clara y concisa. Si te devuelven un error de autenticación u otro fallo en la base de datos, repórtalo amablemente.";

const toolsDeclaration = [
  {
    function_declarations: [
      {
        name: "consultar_camiones",
        description: "Obtiene la lista de camiones registrados en la base de datos junto con su estado (disponible, en_ruta, mantenimiento, fuera_servicio) y detalles básicos.",
      },
      {
        name: "consultar_rutas_activas",
        description: "Obtiene la lista de rutas que están actualmente en curso o pendientes.",
      }
    ]
  }
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Historial de mensajes inválido" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key de Gemini no configurada en el servidor" },
        { status: 500 }
      );
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    // Ignoramos el primer mensaje del cliente si es el mensaje de bienvenida de Gemini 
    // porque Gemini no permite un primer mensaje con rol 'model' en el historial si es strict, 
    // pero para mantener coherencia lo mapeamos.
    let contents: any[] = messages.map((msg: any) => ({
      role: msg.role === "gemini" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    // Si el primer mensaje es del modelo (saludo), lo filtramos si causa problemas, 
    // pero dejémoslo. Gemini a veces requiere que el historial comience con 'user'.
    if (contents.length > 0 && contents[0].role === 'model') {
      contents = contents.slice(1);
    }

    // Primera llamada a Gemini
    const payload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      tools: toolsDeclaration,
      contents,
    };

    let response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json({ error: "Error en la API de Gemini" }, { status: response.status });
    }

    let data = await response.json();
    let candidate = data?.candidates?.[0];

    // Verificar si el modelo solicitó llamar a una función
    const functionCall = candidate?.content?.parts?.find((part: any) => part.functionCall)?.functionCall;

    if (functionCall) {
      const functionName = functionCall.name;
      let functionResult = null;

      // Ejecutar la herramienta correspondiente
      if (functionName === "consultar_camiones") {
        functionResult = await consultar_camiones();
      } else if (functionName === "consultar_rutas_activas") {
        functionResult = await consultar_rutas_activas();
      } else {
        functionResult = { error: "Función desconocida" };
      }

      // Añadir la solicitud del modelo y la respuesta de la función al historial
      // Asegurarse de que candidate.content.role sea 'model'
      const modelContent = candidate.content;
      modelContent.role = "model";
      
      contents.push(modelContent); 

      // Añadimos el resultado de la función con rol 'user'
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: functionName,
              response: {
                name: functionName,
                content: functionResult
              }
            }
          }
        ]
      });

      // Segunda llamada a Gemini enviando el resultado
      const secondPayload = {
        system_instruction: { parts: [{ text: systemInstruction }] },
        tools: toolsDeclaration,
        contents,
      };

      response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(secondPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Second Gemini API error:", errText);
        return NextResponse.json({ error: "Error procesando el resultado de la base de datos" }, { status: response.status });
      }

      data = await response.json();
      candidate = data?.candidates?.[0];
    }

    // Retornar la respuesta final
    const generatedText = candidate?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return NextResponse.json(
        { error: "La API devolvió una respuesta vacía o inesperada." },
        { status: 500 }
      );
    }

    return NextResponse.json({ response: generatedText });
  } catch (error) {
    console.error("Error en /api/chat:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar el mensaje." },
      { status: 500 }
    );
  }
}

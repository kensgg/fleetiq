import { createClient } from '@/lib/supabase/server';

export async function consultar_camiones() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('camiones')
      .select('numero_unidad, marca, modelo, placas, estado')
      .limit(20);
      
    if (error) throw error;
    
    return { 
      exito: true, 
      datos: data || [] 
    };
  } catch (error: any) {
    console.error("Error consultando camiones:", error);
    return { 
      exito: false, 
      error: error.message || "Error al consultar la base de datos" 
    };
  }
}

export async function consultar_rutas_activas() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('rutas')
      .select('id, origen, destino, estado, fecha_estimada, camion_id')
      .in('estado', ['pendiente', 'en_curso'])
      .limit(20);

    if (error) throw error;
    
    return { 
      exito: true, 
      datos: data || [] 
    };
  } catch (error: any) {
    console.error("Error consultando rutas:", error);
    return { 
      exito: false, 
      error: error.message || "Error al consultar la base de datos" 
    };
  }
}

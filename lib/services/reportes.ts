import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { generarPdf, type PdfReportData } from '@/lib/services/reportes-pdf';
import { generarXlsx, type XlsxReportData } from '@/lib/services/reportes-xlsx';
import type { TipoReporte, FormatoReporte } from '@/lib/validations/reportes';

// ─────────────────────────────────────────────────────────────
// FleetIQ — Servicio de Generación de Reportes (RF-19, RF-20, RF-21)
// ─────────────────────────────────────────────────────────────
//
// Este servicio es el punto de entrada reutilizable para la
// generación de reportes. Está diseñado para ser invocado desde:
//   1. Los endpoints REST de /api/reportes (uso principal).
//   2. El chatbot IA del módulo 7 (RF-22 a RF-24) en el futuro.
//
// Para invocar desde el chatbot, simplemente importar y llamar:
//   import { generarReporte } from '@/lib/services/reportes';
//   const resultado = await generarReporte({ tipo, formato, filtros, sedeId, userId });
// ─────────────────────────────────────────────────────────────

/** Nombre del bucket de Supabase Storage para reportes. */
const STORAGE_BUCKET = 'reportes';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export interface ReporteFiltros {
  fecha_desde?: string;
  fecha_hasta?: string;
  camion_id?: string;
  conductor_id?: string;
  ruta_id?: string;
}

export interface GenerarReporteParams {
  tipo: TipoReporte;
  formato: FormatoReporte;
  filtros: ReporteFiltros;
  sedeId: string;
  userId: string;
}

export interface ReporteGenerado {
  id: string;
  sede_id: string;
  tipo: string;
  filtros: ReporteFiltros;
  formato: string;
  generado_por: string;
  archivo_url: string | null;
  created_at: string;
}

interface DatosReporte {
  titulo: string;
  subtitulo: string;
  columnas: { header: string; key: string; width: number }[];
  filas: Record<string, unknown>[];
  filtrosAplicados: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────
// Títulos legibles por tipo de reporte
// ─────────────────────────────────────────────────────────────

const TITULOS_REPORTE: Record<TipoReporte, string> = {
  combustible: 'Reporte de Consumo de Combustible',
  km_recorridos: 'Reporte de Kilómetros Recorridos',
  mantenimiento: 'Reporte de Costos de Mantenimiento',
  eficiencia_rutas: 'Reporte de Eficiencia de Rutas',
};

// ─────────────────────────────────────────────────────────────
// Helpers de filtros
// ─────────────────────────────────────────────────────────────

function buildFiltrosLabel(filtros: ReporteFiltros): Record<string, string> {
  const labels: Record<string, string> = {};

  if (filtros.fecha_desde) labels['Fecha desde'] = filtros.fecha_desde;
  if (filtros.fecha_hasta) labels['Fecha hasta'] = filtros.fecha_hasta;
  if (filtros.camion_id) labels['Camión ID'] = filtros.camion_id;
  if (filtros.conductor_id) labels['Conductor ID'] = filtros.conductor_id;
  if (filtros.ruta_id) labels['Ruta ID'] = filtros.ruta_id;

  return labels;
}

// ─────────────────────────────────────────────────────────────
// Agregadores de datos por tipo de reporte
// ─────────────────────────────────────────────────────────────

/**
 * RF-19: Reporte de combustible.
 * ⚠️ No existe tabla de registros de combustible.
 * Se genera un reporte con estructura vacía y nota informativa.
 */
async function agregarDatosCombustible(
  _sedeId: string,
  _filtros: ReporteFiltros,
): Promise<DatosReporte> {
  return {
    titulo: TITULOS_REPORTE.combustible,
    subtitulo: 'Datos no disponibles — Se requiere tabla registros_combustible',
    columnas: [
      { header: 'Unidad', key: 'unidad', width: 15 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Litros', key: 'litros', width: 12 },
      { header: 'Costo', key: 'costo', width: 12 },
      { header: 'Km Odómetro', key: 'km', width: 15 },
      { header: 'Rendimiento (km/L)', key: 'rendimiento', width: 18 },
    ],
    filas: [],
    filtrosAplicados: {
      ...buildFiltrosLabel(_filtros),
      'NOTA': 'No existe tabla de registros de combustible. Este reporte se activará cuando se implemente el tracking de combustible.',
    },
  };
}

/**
 * RF-19: Reporte de kilómetros recorridos.
 * Aproximación basada en mantenimientos.kilometraje.
 */
async function agregarDatosKmRecorridos(
  sedeId: string,
  filtros: ReporteFiltros,
): Promise<DatosReporte> {
  const supabase = createAdminClient();

  let query = supabase
    .from('mantenimientos')
    .select(`
      id,
      fecha,
      kilometraje,
      tipo,
      camion_id,
      camiones!inner (
        sede_id,
        numero_unidad,
        marca,
        modelo
      )
    `)
    .eq('camiones.sede_id', sedeId)
    .not('kilometraje', 'is', null)
    .order('fecha', { ascending: true });

  if (filtros.fecha_desde) query = query.gte('fecha', filtros.fecha_desde);
  if (filtros.fecha_hasta) query = query.lte('fecha', filtros.fecha_hasta);
  if (filtros.camion_id) query = query.eq('camion_id', filtros.camion_id);

  const { data, error } = await query;

  if (error) {
    console.error('[FleetIQ Reportes] Error km_recorridos:', error.message);
  }

  const filas = (data ?? []).map((m) => {
    const camion = m.camiones as unknown as {
      numero_unidad: string;
      marca: string;
      modelo: string;
    };

    return {
      unidad: camion.numero_unidad,
      camion: `${camion.marca} ${camion.modelo}`,
      fecha: m.fecha,
      tipo_mantenimiento: m.tipo,
      kilometraje: m.kilometraje?.toLocaleString() ?? '—',
    };
  });

  return {
    titulo: TITULOS_REPORTE.km_recorridos,
    subtitulo: `Kilometraje reportado en mantenimientos — ${filas.length} registros`,
    columnas: [
      { header: 'Unidad', key: 'unidad', width: 12 },
      { header: 'Camión', key: 'camion', width: 22 },
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Tipo Mant.', key: 'tipo_mantenimiento', width: 18 },
      { header: 'Kilometraje', key: 'kilometraje', width: 14 },
    ],
    filas,
    filtrosAplicados: buildFiltrosLabel(filtros),
  };
}

/**
 * RF-19: Reporte de costos de mantenimiento.
 */
async function agregarDatosMantenimiento(
  sedeId: string,
  filtros: ReporteFiltros,
): Promise<DatosReporte> {
  const supabase = createAdminClient();

  let query = supabase
    .from('mantenimientos')
    .select(`
      id,
      fecha,
      tipo,
      costo,
      proveedor,
      kilometraje,
      camion_id,
      camiones!inner (
        sede_id,
        numero_unidad,
        marca,
        modelo
      )
    `)
    .eq('camiones.sede_id', sedeId)
    .order('fecha', { ascending: false });

  if (filtros.fecha_desde) query = query.gte('fecha', filtros.fecha_desde);
  if (filtros.fecha_hasta) query = query.lte('fecha', filtros.fecha_hasta);
  if (filtros.camion_id) query = query.eq('camion_id', filtros.camion_id);

  const { data, error } = await query;

  if (error) {
    console.error('[FleetIQ Reportes] Error mantenimiento:', error.message);
  }

  const registros = data ?? [];
  const costoTotal = registros.reduce(
    (sum, m) => sum + (typeof m.costo === 'number' ? m.costo : parseFloat(m.costo) || 0),
    0,
  );

  const filas = registros.map((m) => {
    const camion = m.camiones as unknown as {
      numero_unidad: string;
      marca: string;
      modelo: string;
    };

    return {
      unidad: camion.numero_unidad,
      camion: `${camion.marca} ${camion.modelo}`,
      fecha: m.fecha,
      tipo: m.tipo,
      proveedor: m.proveedor ?? '—',
      costo: `$${(typeof m.costo === 'number' ? m.costo : parseFloat(m.costo) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      kilometraje: m.kilometraje?.toLocaleString() ?? '—',
    };
  });

  return {
    titulo: TITULOS_REPORTE.mantenimiento,
    subtitulo: `${filas.length} registros — Costo total: $${costoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
    columnas: [
      { header: 'Unidad', key: 'unidad', width: 10 },
      { header: 'Camión', key: 'camion', width: 20 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Tipo', key: 'tipo', width: 16 },
      { header: 'Proveedor', key: 'proveedor', width: 18 },
      { header: 'Costo', key: 'costo', width: 14 },
      { header: 'Km', key: 'kilometraje', width: 12 },
    ],
    filas,
    filtrosAplicados: buildFiltrosLabel(filtros),
  };
}

/**
 * RF-19: Reporte de eficiencia de rutas.
 */
async function agregarDatosEficienciaRutas(
  sedeId: string,
  filtros: ReporteFiltros,
): Promise<DatosReporte> {
  const supabase = createAdminClient();

  let query = supabase
    .from('rutas')
    .select(`
      id,
      origen,
      destino,
      estado,
      fecha_estimada,
      created_at,
      camiones!inner (
        sede_id,
        numero_unidad
      ),
      conductores (
        nombre_completo
      )
    `)
    .eq('camiones.sede_id', sedeId)
    .order('created_at', { ascending: false });

  if (filtros.fecha_desde) query = query.gte('created_at', `${filtros.fecha_desde}T00:00:00Z`);
  if (filtros.fecha_hasta) query = query.lte('created_at', `${filtros.fecha_hasta}T23:59:59Z`);
  if (filtros.camion_id) query = query.eq('camion_id', filtros.camion_id);
  if (filtros.conductor_id) query = query.eq('conductor_id', filtros.conductor_id);
  if (filtros.ruta_id) query = query.eq('id', filtros.ruta_id);

  const { data, error } = await query;

  if (error) {
    console.error('[FleetIQ Reportes] Error eficiencia_rutas:', error.message);
  }

  const registros = data ?? [];
  const completadas = registros.filter((r) => r.estado === 'completada').length;
  const canceladas = registros.filter((r) => r.estado === 'cancelada').length;
  const total = registros.length;
  const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;

  const ESTADO_LABELS: Record<string, string> = {
    pendiente: 'Pendiente',
    en_curso: 'En Curso',
    completada: 'Completada',
    cancelada: 'Cancelada',
  };

  const filas = registros.map((r) => {
    const camion = r.camiones as unknown as { numero_unidad: string };
    const conductor = r.conductores as unknown as { nombre_completo: string } | null;

    return {
      unidad: camion.numero_unidad,
      conductor: conductor?.nombre_completo ?? '—',
      origen: r.origen,
      destino: r.destino,
      estado: ESTADO_LABELS[r.estado] ?? r.estado,
      fecha_estimada: r.fecha_estimada
        ? new Date(r.fecha_estimada).toLocaleDateString('es-MX')
        : '—',
      creada: new Date(r.created_at).toLocaleDateString('es-MX'),
    };
  });

  return {
    titulo: TITULOS_REPORTE.eficiencia_rutas,
    subtitulo: `${total} rutas — ${completadas} completadas (${porcentaje}%), ${canceladas} canceladas`,
    columnas: [
      { header: 'Unidad', key: 'unidad', width: 10 },
      { header: 'Conductor', key: 'conductor', width: 22 },
      { header: 'Origen', key: 'origen', width: 18 },
      { header: 'Destino', key: 'destino', width: 18 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Fecha Est.', key: 'fecha_estimada', width: 12 },
      { header: 'Creada', key: 'creada', width: 12 },
    ],
    filas,
    filtrosAplicados: {
      ...buildFiltrosLabel(filtros),
      'Eficiencia': `${porcentaje}% (${completadas}/${total})`,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Función principal reutilizable
// ─────────────────────────────────────────────────────────────

/**
 * Genera un reporte completo: agrega datos, genera el archivo
 * en el formato solicitado, lo sube a Storage, y registra en DB.
 *
 * Esta función es el punto de entrada reutilizable para generar
 * reportes desde cualquier parte de la aplicación (endpoints REST,
 * chatbot IA del módulo 7, etc.).
 *
 * @param params - Tipo, formato, filtros, sede y usuario.
 * @returns El registro `reportes_generados` con la URL del archivo.
 */
export async function generarReporte(
  params: GenerarReporteParams,
): Promise<ReporteGenerado> {
  const { tipo, formato, filtros, sedeId, userId } = params;
  const fechaGeneracion = new Date().toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    dateStyle: 'long',
    timeStyle: 'short',
  });

  // 1. Agregar datos según tipo
  let datos: DatosReporte;

  switch (tipo) {
    case 'combustible':
      datos = await agregarDatosCombustible(sedeId, filtros);
      break;
    case 'km_recorridos':
      datos = await agregarDatosKmRecorridos(sedeId, filtros);
      break;
    case 'mantenimiento':
      datos = await agregarDatosMantenimiento(sedeId, filtros);
      break;
    case 'eficiencia_rutas':
      datos = await agregarDatosEficienciaRutas(sedeId, filtros);
      break;
    default:
      throw new Error(`Tipo de reporte no soportado: ${tipo}`);
  }

  // 2. Generar archivo según formato
  const reportData = {
    ...datos,
    fechaGeneracion,
  };

  let buffer: Buffer;
  let contentType: string;
  let extension: string;

  if (formato === 'xlsx') {
    buffer = await generarXlsx(reportData as XlsxReportData);
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    extension = 'xlsx';
  } else {
    buffer = await generarPdf(reportData as PdfReportData);
    contentType = 'application/pdf';
    extension = 'pdf';
  }

  // 3. Subir a Supabase Storage
  const supabase = createAdminClient();
  const timestamp = Date.now();
  const fileName = `${sedeId}/${tipo}_${timestamp}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, buffer, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });

  let archivoUrl: string | null = null;

  if (uploadError) {
    // Si falla el upload, loguear pero no abortar — el reporte se registra sin URL
    console.error(
      '[FleetIQ Reportes] Error al subir archivo a Storage:',
      uploadError.message,
      '— El reporte se registrará sin archivo adjunto.',
    );
  } else {
    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    archivoUrl = urlData.publicUrl;
  }

  // 4. Registrar en tabla reportes_generados
  const { data: registro, error: insertError } = await supabase
    .from('reportes_generados')
    .insert({
      sede_id: sedeId,
      tipo,
      filtros,
      formato,
      generado_por: userId,
      archivo_url: archivoUrl,
    })
    .select('*')
    .single();

  if (insertError || !registro) {
    throw new Error(
      `Error al registrar el reporte en la base de datos: ${insertError?.message}`,
    );
  }

  return registro as ReporteGenerado;
}

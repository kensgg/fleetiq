import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailService } from '@/lib/services/email';

// ─────────────────────────────────────────────────────────────
// FleetIQ — Servicio de Generación de Notificaciones
// ─────────────────────────────────────────────────────────────
//
// Contiene la lógica de negocio para generar notificaciones
// automáticas. Usa `createAdminClient()` porque el cron job
// no tiene sesión de usuario y necesita bypass de RLS.
//
// PUNTO DE EXTENSIÓN n8n:
// Cuando se active la integración con n8n, estos checks podrían
// disparar un webhook que ejecute un workflow más complejo
// (e.g., notificación + creación automática de orden de servicio).
// Ver: integrations/n8n/config.ts
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Constantes configurables — Umbrales
// ─────────────────────────────────────────────────────────────

/** Días antes del vencimiento en los que se generan alertas. */
const UMBRALES_VENCIMIENTO_DIAS = [30, 15, 5] as const;

/** Prioridad de la alerta según los días restantes. */
const PRIORIDAD_POR_DIAS: Record<number, 'alta' | 'media' | 'baja'> = {
  30: 'baja',
  15: 'media',
  5: 'alta',
};

/** Intervalo de kilómetros entre mantenimientos programados. */
const INTERVALO_KM_MANTENIMIENTO = 10_000;

/** Intervalo de días entre mantenimientos programados. */
const INTERVALO_DIAS_MANTENIMIENTO = 90;

/** Ventana de deduplicación en horas (evita notificaciones repetidas). */
const DEDUP_HORAS = 24;

// ─────────────────────────────────────────────────────────────
// Labels legibles para tipos de documento
// ─────────────────────────────────────────────────────────────

const TIPO_DOC_LABELS: Record<string, string> = {
  tarjeta_circulacion: 'Tarjeta de Circulación',
  seguro: 'Seguro',
  verificacion: 'Verificación',
  permiso_sct: 'Permiso SCT',
};

// ─────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────

interface NotificacionGenerada {
  usuario_id: string;
  titulo: string;
  mensaje: string;
  prioridad: 'alta' | 'media' | 'baja';
  entidad_tipo: string;
  entidad_id: string;
}

interface CronResult {
  documentos: { revisados: number; notificaciones_creadas: number };
  mantenimientos: { camiones_revisados: number; notificaciones_creadas: number };
  emails_intentados: number;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Calcula la diferencia en días entre dos fechas (ignora horas).
 */
function diffDias(fechaFutura: string, ahora: Date): number {
  const fecha = new Date(fechaFutura);
  const diffMs = fecha.getTime() - ahora.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Obtiene los usuarios destinatarios de una sede (admin, gerente, supervisor).
 */
async function getDestinatariosSede(
  supabase: ReturnType<typeof createAdminClient>,
  sedeId: string,
): Promise<{ id: string; nombre_completo: string }[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, nombre_completo')
    .eq('sede_id', sedeId)
    .eq('estado', true)
    .in('rol', ['administrador', 'gerente_operaciones', 'supervisor']);

  return data ?? [];
}

/**
 * Verifica si ya existe una notificación reciente (deduplicación).
 */
async function existeNotificacionReciente(
  supabase: ReturnType<typeof createAdminClient>,
  entidadTipo: string,
  entidadId: string,
  prioridad: string,
  horasAtras: number,
): Promise<boolean> {
  const desde = new Date();
  desde.setHours(desde.getHours() - horasAtras);

  const { data } = await supabase
    .from('notificaciones')
    .select('id')
    .eq('entidad_tipo', entidadTipo)
    .eq('entidad_id', entidadId)
    .eq('prioridad', prioridad)
    .gte('created_at', desde.toISOString())
    .limit(1)
    .maybeSingle();

  return data !== null;
}

/**
 * Inserta notificaciones en lote y envía emails (placeholder).
 */
async function insertarNotificaciones(
  supabase: ReturnType<typeof createAdminClient>,
  notificaciones: NotificacionGenerada[],
): Promise<{ insertadas: number; emailsIntentados: number }> {
  if (notificaciones.length === 0) {
    return { insertadas: 0, emailsIntentados: 0 };
  }

  const { data, error } = await supabase
    .from('notificaciones')
    .insert(
      notificaciones.map((n) => ({
        usuario_id: n.usuario_id,
        titulo: n.titulo,
        mensaje: n.mensaje,
        prioridad: n.prioridad,
        entidad_tipo: n.entidad_tipo,
        entidad_id: n.entidad_id,
        leida: false,
        enviado_por_correo: false,
      })),
    )
    .select('id, usuario_id, titulo, mensaje');

  if (error) {
    console.error('[FleetIQ Cron] Error al insertar notificaciones:', error.message);
    return { insertadas: 0, emailsIntentados: 0 };
  }

  // Intentar envío de email para cada notificación (placeholder por ahora)
  const emailService = getEmailService();
  let emailsIntentados = 0;

  if (data) {
    for (const notif of data) {
      await emailService.send({
        to: `user-${notif.usuario_id}@fleetiq.local`, // Placeholder: se resolverá con email real del profile
        subject: notif.titulo,
        textBody: notif.mensaje,
      });
      emailsIntentados++;
    }
  }

  return { insertadas: data?.length ?? 0, emailsIntentados };
}

// ─────────────────────────────────────────────────────────────
// RF-16: Check de vencimiento de documentos
// ─────────────────────────────────────────────────────────────

/**
 * Revisa los documentos de todos los camiones y genera
 * notificaciones cuando estén próximos a vencer.
 *
 * Umbrales: 30, 15 y 5 días antes de `fecha_vencimiento`.
 * Prioridad: 30d → baja, 15d → media, ≤5d → alta.
 */
export async function checkDocumentosVencimiento(): Promise<{
  revisados: number;
  notificaciones_creadas: number;
}> {
  const supabase = createAdminClient();
  const ahora = new Date();

  // Obtener todos los documentos con fecha de vencimiento futura o recién pasada
  const maxDias = Math.max(...UMBRALES_VENCIMIENTO_DIAS);
  const limiteInferior = new Date(ahora);
  limiteInferior.setDate(limiteInferior.getDate() - 1); // incluir vencidos de hoy

  const limiteSuperior = new Date(ahora);
  limiteSuperior.setDate(limiteSuperior.getDate() + maxDias + 1);

  const { data: documentos, error } = await supabase
    .from('documentos_camion')
    .select(`
      id,
      tipo_documento,
      fecha_vencimiento,
      camion_id,
      camiones!inner (
        id,
        sede_id,
        numero_unidad,
        marca,
        modelo
      )
    `)
    .not('fecha_vencimiento', 'is', null)
    .gte('fecha_vencimiento', limiteInferior.toISOString().split('T')[0])
    .lte('fecha_vencimiento', limiteSuperior.toISOString().split('T')[0]);

  if (error || !documentos) {
    console.error('[FleetIQ Cron] Error al consultar documentos:', error?.message);
    return { revisados: 0, notificaciones_creadas: 0 };
  }

  const notificaciones: NotificacionGenerada[] = [];

  for (const doc of documentos) {
    const diasRestantes = diffDias(doc.fecha_vencimiento!, ahora);
    const camion = doc.camiones as unknown as {
      id: string;
      sede_id: string;
      numero_unidad: string;
      marca: string;
      modelo: string;
    };

    // Determinar en qué umbral cae
    let umbralAplicable: number | null = null;
    for (const umbral of UMBRALES_VENCIMIENTO_DIAS) {
      if (diasRestantes <= umbral) {
        umbralAplicable = umbral;
        break; // El primero que cumple es el de mayor prioridad
      }
    }

    if (umbralAplicable === null) continue;

    const prioridad = PRIORIDAD_POR_DIAS[umbralAplicable];
    const tipoDocLabel = TIPO_DOC_LABELS[doc.tipo_documento] ?? doc.tipo_documento;

    // Deduplicación
    const yaExiste = await existeNotificacionReciente(
      supabase,
      'documento',
      doc.id,
      prioridad,
      DEDUP_HORAS,
    );

    if (yaExiste) continue;

    // Obtener destinatarios de la sede
    const destinatarios = await getDestinatariosSede(supabase, camion.sede_id);

    const diasTexto = diasRestantes <= 0
      ? 'VENCIDO'
      : diasRestantes === 1
        ? '1 día'
        : `${diasRestantes} días`;

    for (const dest of destinatarios) {
      notificaciones.push({
        usuario_id: dest.id,
        titulo: diasRestantes <= 0
          ? `⚠️ Documento vencido: ${tipoDocLabel}`
          : `📋 Documento por vencer: ${tipoDocLabel}`,
        mensaje:
          diasRestantes <= 0
            ? `El documento "${tipoDocLabel}" del camión ${camion.numero_unidad} (${camion.marca} ${camion.modelo}) está VENCIDO. Acción inmediata requerida.`
            : `El documento "${tipoDocLabel}" del camión ${camion.numero_unidad} (${camion.marca} ${camion.modelo}) vence en ${diasTexto}. Fecha de vencimiento: ${doc.fecha_vencimiento}.`,
        prioridad,
        entidad_tipo: 'documento',
        entidad_id: doc.id,
      });
    }
  }

  const { insertadas, emailsIntentados } = await insertarNotificaciones(supabase, notificaciones);

  console.log(
    `[FleetIQ Cron] Documentos: ${documentos.length} revisados, ` +
    `${insertadas} notificaciones creadas, ${emailsIntentados} emails intentados.`,
  );

  return { revisados: documentos.length, notificaciones_creadas: insertadas };
}

// ─────────────────────────────────────────────────────────────
// RF-17: Check de mantenimiento programado
// ─────────────────────────────────────────────────────────────

/**
 * Revisa todos los camiones activos y genera alertas cuando
 * se supere el intervalo de kilómetros o días desde el último
 * mantenimiento.
 *
 * Umbrales:
 * - Cada 10,000 km desde el último mantenimiento registrado.
 * - Cada 90 días desde el último mantenimiento registrado.
 */
export async function checkMantenimientoProgramado(): Promise<{
  camiones_revisados: number;
  notificaciones_creadas: number;
}> {
  const supabase = createAdminClient();
  const ahora = new Date();

  // Obtener todos los camiones activos (no fuera_servicio)
  const { data: camiones, error: camionesError } = await supabase
    .from('camiones')
    .select('id, sede_id, numero_unidad, marca, modelo, estado')
    .neq('estado', 'fuera_servicio');

  if (camionesError || !camiones) {
    console.error('[FleetIQ Cron] Error al consultar camiones:', camionesError?.message);
    return { camiones_revisados: 0, notificaciones_creadas: 0 };
  }

  const notificaciones: NotificacionGenerada[] = [];

  for (const camion of camiones) {
    // Obtener el último mantenimiento del camión
    const { data: ultimoMant } = await supabase
      .from('mantenimientos')
      .select('id, fecha, kilometraje')
      .eq('camion_id', camion.id)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    let necesitaAlertaKm = false;
    let necesitaAlertaTiempo = false;
    let detalleKm = '';
    let detalleTiempo = '';

    if (!ultimoMant) {
      // Nunca ha tenido mantenimiento — alertar
      necesitaAlertaTiempo = true;
      detalleTiempo = 'No se ha registrado ningún mantenimiento para esta unidad.';
    } else {
      // Check por kilometraje
      if (ultimoMant.kilometraje !== null) {
        // No tenemos km actual del camión en la tabla, pero sí el del último mant.
        // La alerta es informativa: recomendar revisión si pasó el intervalo.
        // En una versión futura con telemetría, se compararía km actual vs último mant.
        detalleKm = `Último mantenimiento registrado a ${ultimoMant.kilometraje.toLocaleString()} km. ` +
          `Se recomienda mantenimiento cada ${INTERVALO_KM_MANTENIMIENTO.toLocaleString()} km.`;
      }

      // Check por tiempo
      const diasDesdeUltimoMant = diffDias(ahora.toISOString(), new Date(ultimoMant.fecha)) * -1;
      // diffDias calcula futuro - ahora, pero aquí mant.fecha es pasada, así que invertimos

      const diasTranscurridos = Math.floor(
        (ahora.getTime() - new Date(ultimoMant.fecha).getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diasTranscurridos >= INTERVALO_DIAS_MANTENIMIENTO) {
        necesitaAlertaTiempo = true;
        detalleTiempo = `Han pasado ${diasTranscurridos} días desde el último mantenimiento ` +
          `(${ultimoMant.fecha}). El intervalo recomendado es cada ${INTERVALO_DIAS_MANTENIMIENTO} días.`;
      }
    }

    // Solo generar alerta si se requiere
    if (!necesitaAlertaKm && !necesitaAlertaTiempo) continue;

    // Deduplicación
    const yaExiste = await existeNotificacionReciente(
      supabase,
      'mantenimiento',
      camion.id,
      'media',
      DEDUP_HORAS,
    );

    if (yaExiste) continue;

    // Obtener destinatarios de la sede
    const destinatarios = await getDestinatariosSede(supabase, camion.sede_id);

    const mensajeParts = [detalleTiempo, detalleKm].filter(Boolean);

    for (const dest of destinatarios) {
      notificaciones.push({
        usuario_id: dest.id,
        titulo: `🔧 Mantenimiento requerido: ${camion.numero_unidad}`,
        mensaje:
          `El camión ${camion.numero_unidad} (${camion.marca} ${camion.modelo}) requiere mantenimiento. ` +
          mensajeParts.join(' '),
        prioridad: 'media',
        entidad_tipo: 'mantenimiento',
        entidad_id: camion.id,
      });
    }
  }

  const { insertadas, emailsIntentados } = await insertarNotificaciones(supabase, notificaciones);

  console.log(
    `[FleetIQ Cron] Mantenimientos: ${camiones.length} camiones revisados, ` +
    `${insertadas} notificaciones creadas, ${emailsIntentados} emails intentados.`,
  );

  return { camiones_revisados: camiones.length, notificaciones_creadas: insertadas };
}

// ─────────────────────────────────────────────────────────────
// Ejecutar todos los checks
// ─────────────────────────────────────────────────────────────

/**
 * Ejecuta todos los checks de notificaciones.
 * Diseñado para ser invocado desde el endpoint cron.
 */
export async function ejecutarChecksNotificaciones(): Promise<CronResult> {
  const [documentos, mantenimientos] = await Promise.all([
    checkDocumentosVencimiento(),
    checkMantenimientoProgramado(),
  ]);

  return {
    documentos,
    mantenimientos,
    emails_intentados:
      documentos.notificaciones_creadas + mantenimientos.notificaciones_creadas,
  };
}

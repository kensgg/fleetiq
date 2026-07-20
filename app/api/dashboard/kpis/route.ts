import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/responses';
import { handleApiError } from '@/lib/api/errors';
import { withRole } from '@/lib/api/middleware/authorize';

// ─────────────────────────────────────────────────────────────
// Roles con acceso al dashboard
// ─────────────────────────────────────────────────────────────

const ROLES_DASHBOARD = [
  'administrador',
  'gerente_operaciones',
  'supervisor',
] as const;

/** Semanas de historial por defecto. */
const DEFAULT_SEMANAS = 4;

/** Máximo de semanas que se pueden solicitar. */
const MAX_SEMANAS = 12;

// ─────────────────────────────────────────────────────────────
// Helpers — Cálculo de rangos semanales
// ─────────────────────────────────────────────────────────────

interface SemanaRango {
  /** Etiqueta ISO de la semana (e.g., "2026-W28") */
  semana: string;
  /** Fecha de inicio (lunes) */
  inicio: string;
  /** Fecha de fin (domingo) */
  fin: string;
  /** Objetos Date para queries */
  inicioDate: Date;
  finDate: Date;
}

/**
 * Genera los rangos de las últimas N semanas hacia atrás desde hoy.
 */
function generarRangosSemanas(cantidadSemanas: number): SemanaRango[] {
  const ahora = new Date();
  const rangos: SemanaRango[] = [];

  for (let i = cantidadSemanas - 1; i >= 0; i--) {
    const referencia = new Date(ahora);
    referencia.setDate(referencia.getDate() - i * 7);

    // Calcular el lunes de la semana
    const dia = referencia.getDay();
    const diffALunes = dia === 0 ? -6 : 1 - dia; // domingo=0 → retroceder 6
    const lunes = new Date(referencia);
    lunes.setDate(referencia.getDate() + diffALunes);
    lunes.setHours(0, 0, 0, 0);

    // Calcular el domingo
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);

    // Número de semana ISO
    const primerDiaAnio = new Date(lunes.getFullYear(), 0, 1);
    const diasTranscurridos = Math.floor(
      (lunes.getTime() - primerDiaAnio.getTime()) / (1000 * 60 * 60 * 24),
    );
    const numSemana = Math.ceil((diasTranscurridos + primerDiaAnio.getDay() + 1) / 7);

    rangos.push({
      semana: `${lunes.getFullYear()}-W${String(numSemana).padStart(2, '0')}`,
      inicio: lunes.toISOString().split('T')[0],
      fin: domingo.toISOString().split('T')[0],
      inicioDate: lunes,
      finDate: domingo,
    });
  }

  return rangos;
}

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard/kpis — Datos para gráficas de KPIs (RF-07)
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve datos semanales para las gráficas del dashboard:
 *
 * 1. **Combustible semanal**: ⚠️ Estructura vacía.
 *    No existe tabla `registros_combustible` en el esquema actual.
 *    Se devuelve `[]` con un mensaje indicando que se requiere
 *    una tabla dedicada para tracking de combustible.
 *
 * 2. **Km recorridos semanal**: Aproximación basada en los registros
 *    de `mantenimientos.kilometraje`. Se suma el kilometraje reportado
 *    en mantenimientos por semana. ⚠️ Es una aproximación, no un
 *    tracking real de km. Para datos precisos se necesitaría
 *    telemetría o una tabla de registros de odómetro.
 *
 * 3. **Eficiencia de rutas semanal**: Ratio de rutas completadas vs
 *    total de rutas creadas por semana (excluyendo pendientes aún
 *    activas). Métrica: (completadas / total) * 100.
 *
 * 4. **Resumen de mantenimiento del periodo**: Costo total y cantidad
 *    de mantenimientos realizados en las semanas solicitadas.
 *
 * Query param: ?semanas=4 (default: 4, max: 12)
 *
 * NOTA: Si en el futuro se agregan tablas de telemetría o
 * registros de combustible, este endpoint deberá actualizarse
 * para usar esos datos reales.
 */
export const GET = withRole(...ROLES_DASHBOARD)(async ({ request, user }) => {
  try {
    const supabase = await createClient();
    const sedeId = user.sede_id;

    const { searchParams } = new URL(request.url);
    const semanas = Math.min(
      MAX_SEMANAS,
      Math.max(1, parseInt(searchParams.get('semanas') || String(DEFAULT_SEMANAS), 10)),
    );

    const rangos = generarRangosSemanas(semanas);
    const fechaInicio = rangos[0].inicioDate.toISOString();
    const fechaFin = rangos[rangos.length - 1].finDate.toISOString();

    // ─── Consultas en paralelo ───
    const [mantenimientosResult, rutasResult] = await Promise.all([
      // Mantenimientos del periodo (para km y costos)
      supabase
        .from('mantenimientos')
        .select(`
          id,
          fecha,
          kilometraje,
          costo,
          camion_id,
          camiones!inner ( sede_id )
        `)
        .eq('camiones.sede_id', sedeId)
        .gte('fecha', rangos[0].inicio)
        .lte('fecha', rangos[rangos.length - 1].fin),

      // Rutas del periodo (para eficiencia)
      supabase
        .from('rutas')
        .select('id, estado, created_at')
        .eq('sede_id', sedeId)
        .gte('created_at', fechaInicio)
        .lte('created_at', fechaFin),
    ]);

    if (mantenimientosResult.error) {
      return errorResponse(
        `Error al obtener datos de mantenimientos: ${mantenimientosResult.error.message}`,
        500,
      );
    }

    if (rutasResult.error) {
      return errorResponse(
        `Error al obtener datos de rutas: ${rutasResult.error.message}`,
        500,
      );
    }

    const mantenimientos = mantenimientosResult.data ?? [];
    const rutas = rutasResult.data ?? [];

    // ─── Procesar km recorridos por semana ───
    // SUPUESTO: Se usa el campo `kilometraje` de mantenimientos como
    // aproximación. Cada registro reporta el odómetro en ese momento.
    // Sumamos los km reportados por semana como indicador de actividad.
    const kmSemanal = rangos.map((rango) => {
      const mantsEnSemana = mantenimientos.filter((m) => {
        const fecha = new Date(m.fecha);
        return fecha >= rango.inicioDate && fecha <= rango.finDate;
      });

      const kmTotal = mantsEnSemana.reduce(
        (sum, m) => sum + (m.kilometraje ?? 0),
        0,
      );

      return {
        semana: rango.semana,
        inicio: rango.inicio,
        fin: rango.fin,
        km_total: kmTotal,
        registros: mantsEnSemana.length,
      };
    });

    // ─── Procesar eficiencia de rutas por semana ───
    const eficienciaSemanal = rangos.map((rango) => {
      const rutasEnSemana = rutas.filter((r) => {
        const fecha = new Date(r.created_at);
        return fecha >= rango.inicioDate && fecha <= rango.finDate;
      });

      const total = rutasEnSemana.length;
      const completadas = rutasEnSemana.filter(
        (r) => r.estado === 'completada',
      ).length;
      const canceladas = rutasEnSemana.filter(
        (r) => r.estado === 'cancelada',
      ).length;
      const enCurso = rutasEnSemana.filter(
        (r) => r.estado === 'en_curso',
      ).length;

      return {
        semana: rango.semana,
        inicio: rango.inicio,
        fin: rango.fin,
        completadas,
        canceladas,
        en_curso: enCurso,
        total,
        porcentaje: total > 0 ? Math.round((completadas / total) * 100) : 0,
      };
    });

    // ─── Resumen de mantenimiento del periodo ───
    const costoTotal = mantenimientos.reduce(
      (sum, m) => sum + (typeof m.costo === 'number' ? m.costo : parseFloat(m.costo) || 0),
      0,
    );

    return successResponse(
      {
        semanas,

        // ⚠️ COMBUSTIBLE: Estructura vacía — no existe tabla de registros de combustible.
        // Para implementar este KPI se necesita crear una tabla `registros_combustible`
        // con campos: camion_id, fecha, litros, costo, kilometraje_actual.
        // Una vez creada, este endpoint deberá actualizarse para consultar esos datos.
        combustible_semanal: [],
        _combustible_nota: 'Datos de combustible no disponibles. Se requiere una tabla ' +
          'dedicada `registros_combustible` para tracking de consumo por unidad.',

        km_recorridos_semanal: kmSemanal,
        _km_nota: 'Aproximación basada en kilometraje reportado en mantenimientos. ' +
          'Para datos precisos se requiere telemetría o tabla de odómetro.',

        eficiencia_rutas_semanal: eficienciaSemanal,

        resumen_mantenimiento: {
          costo_total_periodo: Math.round(costoTotal * 100) / 100,
          mantenimientos_realizados: mantenimientos.length,
        },
      },
      'KPIs del dashboard recuperados exitosamente',
    );
  } catch (error) {
    return handleApiError(error);
  }
});

// =============================================================================
// FleetIQ — Script de Seed para Datos de Demo (Mapas y Geolocalización)
// =============================================================================
//
// ⚠️  PENSADO PARA EJECUTARSE UNA SOLA VEZ.
//     Si se ejecuta dos veces, los endpoints devolverán 409 (duplicados) y
//     el script lo reportará sin abortar — no se duplicarán datos existentes.
//
// Prerrequisitos:
//   1. El servidor de Next.js debe estar corriendo: npm run dev
//   2. Las columnas geo en `rutas` y la tabla `ubicaciones_ruta` deben existir
//      en Supabase (SQL del walkthrough del módulo de mapas).
//   3. El usuario seed debe tener rol 'administrador' y sede_id asignado.
//
// Ejecución:
//   node scripts/seed-demo-sede.js
//
// Variables de entorno (de .env.local):
//   NEXT_PUBLIC_SUPABASE_URL      — URL del proyecto Supabase
//   NEXT_PUBLIC_SUPABASE_ANON_KEY — clave anon (usada solo para verificar perfil)
//   SUPABASE_SERVICE_ROLE_KEY     — clave service-role (perfil + rutas)
//   SEED_BASE_URL                 — URL base del servidor (default: http://localhost:3000)
// =============================================================================

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

// ─── Configuración ────────────────────────────────────────────────────────────

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL        = process.env.SEED_BASE_URL || 'http://localhost:3000';

const SEED_USER_ID    = 'da9b0fd1-8dba-4ab7-b034-69a1df244043';
const SEED_USER_EMAIL = 'gerardocg.ti23@utsjr.edu.mx';
const SEED_USER_PASS  = 'gera1234';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const resumen = {
  sede_id:     null,
  camiones:    { intentados: 0, creados: 0 },
  conductores: { intentados: 0, creados: 0 },
  asignaciones:{ intentadas: 0, creadas: 0 },
  rutas:       { intentadas: 0, creadas: 0 },
  ubicaciones: { intentadas: 0, creadas: 0 },
};

/**
 * Realiza una petición autenticada al API de FleetIQ usando cookies de sesión.
 */
async function api(cookieHeader, method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader,
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, opts);
  } catch (err) {
    console.error(`\n  ✗ [${method} ${path}] Error de red: ${err.message}`);
    console.error('    ¿Está corriendo el servidor Next.js? Ejecuta: npm run dev');
    process.exit(1);
  }

  let json;
  try { json = await res.json(); }
  catch { json = { success: false, message: `HTTP ${res.status} sin JSON` }; }

  return { status: res.status, json };
}

// =============================================================================
// PASO 1 — Verificar perfil con service-role (bypasea RLS)
// =============================================================================

async function verificarPerfil() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  FleetIQ — Seed de datos demo');
  console.log('══════════════════════════════════════════════════════════\n');

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('✗ Faltan variables de entorno en .env.local:');
    console.error('  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('[1/6] Verificando perfil del usuario seed…');
  console.log(`      ID   : ${SEED_USER_ID}`);
  console.log(`      Email: ${SEED_USER_EMAIL}`);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Buscar por ID primero
  let { data: profile } = await admin
    .from('profiles')
    .select('id, sede_id, nombre_completo, rol, estado')
    .eq('id', SEED_USER_ID)
    .maybeSingle();

  // Si no existe por ID, buscar por email
  if (!profile) {
    console.log('      No encontrado por ID, buscando por email…');
    const { data: authData } = await admin.auth.admin.getUserByEmail(SEED_USER_EMAIL);
    if (authData?.user) {
      const { data: byEmail } = await admin
        .from('profiles')
        .select('id, sede_id, nombre_completo, rol, estado')
        .eq('id', authData.user.id)
        .maybeSingle();
      profile = byEmail;
      if (profile) console.log(`      Encontrado vía email (id: ${profile.id})`);
    }
  }

  if (!profile) {
    console.error(`\n✗ DETENIDO: El usuario no existe en profiles.`);
    console.error(`  Verifica que ${SEED_USER_EMAIL} esté registrado y tenga perfil.`);
    process.exit(1);
  }
  if (!profile.sede_id) {
    console.error('\n✗ DETENIDO: El perfil no tiene sede_id asignado.');
    process.exit(1);
  }
  if (!profile.estado) {
    console.error('\n✗ DETENIDO: La cuenta está desactivada.');
    process.exit(1);
  }
  if (profile.rol !== 'administrador') {
    console.error(`\n✗ DETENIDO: El usuario tiene rol "${profile.rol}", se requiere "administrador".`);
    process.exit(1);
  }

  resumen.sede_id = profile.sede_id;
  console.log(`\n  ✓ Perfil OK`);
  console.log(`    Nombre : ${profile.nombre_completo}`);
  console.log(`    Rol    : ${profile.rol}`);
  console.log(`    Sede   : ${profile.sede_id}`);

  return profile;
}

// =============================================================================
// PASO 2 — Login: llamar al endpoint HTTP y capturar las cookies Set-Cookie
// =============================================================================
//
// @supabase/ssr gestiona la sesión en cookies cuyo formato exacto (incluyendo
// chunking de tokens largos) solo el servidor conoce. La forma más robusta es
// llamar al endpoint de login del propio servidor y capturar los headers
// Set-Cookie que devuelve, reusándolos en todos los requests posteriores.
// =============================================================================

async function login() {
  console.log('\n[2/6] Autenticando vía POST /api/auth/login…');

  let res;
  try {
    res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: SEED_USER_EMAIL, password: SEED_USER_PASS }),
      redirect: 'manual',
    });
  } catch (err) {
    console.error(`\n✗ No se puede conectar con ${BASE_URL}/api/auth/login`);
    console.error(`  Error: ${err.message}`);
    console.error('  Asegúrate de que el servidor esté corriendo: npm run dev');
    process.exit(1);
  }

  if (res.status !== 200) {
    let body = {};
    try { body = await res.json(); } catch {}
    console.error(`\n✗ Login fallido — HTTP ${res.status}: ${body.message ?? 'sin detalle'}`);
    process.exit(1);
  }

  // Capturar todos los headers Set-Cookie (pueden ser múltiples chunks)
  const rawCookies = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()                        // Node 18+ nativo
    : [res.headers.get('set-cookie')].filter(Boolean);  // fallback

  if (!rawCookies || rawCookies.length === 0) {
    console.error('\n✗ El servidor no devolvió Set-Cookie tras el login.');
    console.error('  Verifica que el middleware de Supabase SSR esté activo.');
    process.exit(1);
  }

  // Construir el header Cookie: extraer solo "name=value" de cada cookie
  const cookiePairs = rawCookies.map((raw) => raw.split(';')[0].trim());
  const cookieHeader = cookiePairs.join('; ');

  console.log(`  ✓ Login exitoso — ${cookiePairs.length} cookie(s) capturada(s):`);
  cookiePairs.forEach((c) => {
    const [name] = c.split('=');
    console.log(`    · ${name}`);
  });

  // Verificar que las cookies funcionan en un endpoint protegido real
  const { status: testStatus } = await api(cookieHeader, 'GET', '/api/camiones');
  if (testStatus === 401 || testStatus === 403) {
    console.error(`\n✗ Las cookies son rechazadas por GET /api/camiones (HTTP ${testStatus}).`);
    console.error('  Posible incompatibilidad de formato de cookie con la versión de @supabase/ssr.');
    console.error(`  Cookies enviadas: ${cookieHeader.substring(0, 120)}…`);
    process.exit(1);
  }

  console.log('  ✓ Cookies verificadas — acceso autenticado confirmado');
  return cookieHeader;
}

// =============================================================================
// PASO 3 — Crear camiones
// =============================================================================

const CAMIONES_SEED = [
  { numero_unidad: 'U-001', marca: 'Kenworth',      modelo: 'T680',         anio: 2021, placas: 'MX-TRK-001', numero_serie: 'KW2021T680001MX',  tipo_carga: 'Carga general seca', estado: 'disponible'   },
  { numero_unidad: 'U-002', marca: 'Freightliner',  modelo: 'Cascadia 126', anio: 2020, placas: 'MX-TRK-002', numero_serie: 'FL2020CS126002MX', tipo_carga: 'Refrigerada',        estado: 'disponible'   },
  { numero_unidad: 'U-003', marca: 'Volvo',         modelo: 'FH16',         anio: 2022, placas: 'MX-TRK-003', numero_serie: 'VL2022FH16003MX',  tipo_carga: 'Carga pesada',       estado: 'mantenimiento'},
  { numero_unidad: 'U-004', marca: 'Peterbilt',     modelo: '389',          anio: 2019, placas: 'MX-TRK-004', numero_serie: 'PB2019389004MX',   tipo_carga: 'Granel',             estado: 'disponible'   },
  { numero_unidad: 'U-005', marca: 'International', modelo: 'LT Series',    anio: 2023, placas: 'MX-TRK-005', numero_serie: 'INT2023LT005MX',   tipo_carga: 'Carga general seca', estado: 'disponible'   },
  { numero_unidad: 'U-006', marca: 'Scania',        modelo: 'R450',         anio: 2021, placas: 'MX-TRK-006', numero_serie: 'SC2021R450006MX',  tipo_carga: 'Líquidos a granel',  estado: 'disponible'   },
];

async function crearCamiones(auth) {
  console.log('\n[3/6] Creando camiones…');
  const ids = [];

  for (const camion of CAMIONES_SEED) {
    resumen.camiones.intentados++;
    const { status, json } = await api(auth, 'POST', '/api/camiones', camion);

    if (status === 201 && json.success) {
      resumen.camiones.creados++;
      ids.push({ id: json.data.id, estado: json.data.estado, unidad: json.data.numero_unidad });
      console.log(`  \u2713 ${camion.numero_unidad} \u2014 ${camion.marca} ${camion.modelo} [${camion.estado}] \u2192 ${json.data.id}`);
    } else if (status === 409) {
      console.log(`  \u26a0 ${camion.numero_unidad} ya existe (409 duplicado) \u2014 omitido`);
    } else {
      console.warn(`  \u2717 ${camion.numero_unidad} \u2014 HTTP ${status}: ${json.message}`);
    }
    await sleep(300);
  }

  // Si no se cre\u00f3 ninguno (todo 409 en segunda ejecuci\u00f3n), recuperar los existentes de la BD
  if (ids.length === 0) {
    console.log('  \u2139 Recuperando camiones existentes de la BD (rejecuci\u00f3n del seed)\u2026');
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: existentes } = await admin
      .from('camiones')
      .select('id, estado, numero_unidad')
      .eq('sede_id', resumen.sede_id)
      .in('numero_unidad', CAMIONES_SEED.map((c) => c.numero_unidad));
    if (existentes?.length) {
      existentes.forEach((c) => ids.push({ id: c.id, estado: c.estado, unidad: c.numero_unidad }));
      console.log(`  \u2139 ${ids.length} camiones recuperados de la BD`);
    }
  }

  return ids;
}

// =============================================================================
// PASO 4 — Crear conductores
// =============================================================================

const CONDUCTORES_SEED = [
  { nombre_completo: 'Carlos Eduardo Mendoza Reyes',   licencia_numero: 'CMRE-2019-001', tipo_licencia: 'E', licencia_vigencia: '2027-06-30' },
  { nombre_completo: 'Roberto Alejandro Fuentes Vega', licencia_numero: 'RFVE-2020-002', tipo_licencia: 'E', licencia_vigencia: '2026-09-15' },
  { nombre_completo: 'Marco Antonio Torres Salinas',   licencia_numero: 'MTSA-2018-003', tipo_licencia: 'D', licencia_vigencia: '2026-10-01' },
  { nombre_completo: 'Juan Pablo Herrera Castillo',    licencia_numero: 'JHCA-2021-004', tipo_licencia: 'E', licencia_vigencia: '2028-03-20' },
  { nombre_completo: 'Adrián Iván López Moreno',       licencia_numero: 'ALMO-2022-005', tipo_licencia: 'E', licencia_vigencia: '2026-09-05' },
  { nombre_completo: 'Sergio Daniel Ramírez Pacheco',  licencia_numero: 'SRPA-2020-006', tipo_licencia: 'D', licencia_vigencia: '2027-12-01' },
];

async function crearConductores(auth) {
  console.log('\n[4/6] Creando conductores…');
  const ids = [];

  for (const c of CONDUCTORES_SEED) {
    resumen.conductores.intentados++;
    const { status, json } = await api(auth, 'POST', '/api/conductores', c);

    if (status === 201 && json.success) {
      resumen.conductores.creados++;
      ids.push({ id: json.data.id, nombre: json.data.nombre_completo });
      console.log(`  \u2713 ${c.nombre_completo} [hasta ${c.licencia_vigencia}] \u2192 ${json.data.id}`);
    } else if (status === 409) {
      console.log(`  \u26a0 ${c.nombre_completo} ya existe (409) \u2014 omitido`);
    } else {
      console.warn(`  \u2717 ${c.nombre_completo} \u2014 HTTP ${status}: ${json.message}`);
      if (json.errors) console.warn('    Detalle:', JSON.stringify(json.errors));
    }
    await sleep(200);
  }

  // Si no se cre\u00f3 ninguno (todo 409 en segunda ejecuci\u00f3n), recuperar los existentes
  if (ids.length === 0) {
    console.log('  \u2139 Recuperando conductores existentes de la BD (rejecuci\u00f3n del seed)\u2026');
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: existentes } = await admin
      .from('conductores')
      .select('id, nombre_completo')
      .eq('sede_id', resumen.sede_id)
      .in('licencia_numero', CONDUCTORES_SEED.map((c) => c.licencia_numero));
    if (existentes?.length) {
      existentes.forEach((c) => ids.push({ id: c.id, nombre: c.nombre_completo }));
      console.log(`  \u2139 ${ids.length} conductores recuperados de la BD`);
    }
  }

  return ids;
}

// =============================================================================
// PASO 5a — Asignaciones conductor ↔ camión (vía service-role)
// =============================================================================
//
// POST /api/asignaciones es rechazado por RLS de Supabase cuando se usa el JWT
// del usuario (la tabla no tiene política para INSERT con anon JWT).
// Usamos service-role y replicamos la lógica de negocio del endpoint:
//   1. Desactivar asignaciones previas del camión y del conductor.
//   2. Insertar la nueva asignación activa.
// =============================================================================

async function crearAsignaciones(_auth, camiones, conductores) {
  console.log('\n[5/6-a] Asignando conductores a camiones (service-role)…');

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const disponibles = camiones.filter((c) => c.estado === 'disponible');
  const pares = Math.min(disponibles.length, conductores.length, 4);
  const ahora = new Date().toISOString();

  for (let i = 0; i < pares; i++) {
    resumen.asignaciones.intentadas++;
    const camion    = disponibles[i];
    const conductor = conductores[i];

    // Verificar que no existe ya esta asignación activa (idempotencia)
    const { data: existe } = await admin
      .from('asignaciones_conductor_camion')
      .select('id')
      .eq('camion_id', camion.id)
      .eq('conductor_id', conductor.id)
      .eq('activo', true)
      .maybeSingle();

    if (existe) {
      console.log(`  ⚠ ${conductor.nombre.split(' ')[0]} → ${camion.unidad} ya asignado — omitido`);
      continue;
    }

    // Desactivar asignaciones previas del camión (lógica RF-10)
    await admin
      .from('asignaciones_conductor_camion')
      .update({ activo: false, fecha_fin: ahora })
      .eq('camion_id', camion.id)
      .eq('activo', true);

    // Desactivar asignaciones previas del conductor
    await admin
      .from('asignaciones_conductor_camion')
      .update({ activo: false, fecha_fin: ahora })
      .eq('conductor_id', conductor.id)
      .eq('activo', true);

    // Crear la nueva asignación activa
    const { error } = await admin
      .from('asignaciones_conductor_camion')
      .insert({
        camion_id:    camion.id,
        conductor_id: conductor.id,
        fecha_inicio: ahora,
        activo:       true,
      });

    if (error) {
      console.warn(`  ✗ Asignación ${i + 1} — ${error.message}`);
    } else {
      resumen.asignaciones.creadas++;
      console.log(`  ✓ ${conductor.nombre.split(' ')[0]} → ${camion.unidad}`);
    }
    await sleep(200);
  }
}

// =============================================================================
// PASO 5b — Insertar rutas vía service-role
// =============================================================================
//
// POST /api/rutas requiere rol gerente_operaciones|supervisor, no administrador.
// Insertamos las rutas directamente con el admin SDK (service-role) y luego
// usamos los endpoints de estado y mapa (que SÍ permiten administrador) para
// transicionar estados y disparar geocodificación + OSRM.
// =============================================================================

const RUTAS_SEED = [
  {
    origen: 'Monterrey, Nuevo León, México',
    destino: 'Ciudad de México, CDMX, México',
    puntos_intermedios: [
      { nombre: 'Saltillo, Coahuila, México' },
      { nombre: 'San Luis Potosí, San Luis Potosí, México' },
    ],
    estado_final: 'completada',
    fecha_offset_dias: -5,
  },
  {
    origen: 'Guadalajara, Jalisco, México',
    destino: 'Monterrey, Nuevo León, México',
    puntos_intermedios: [{ nombre: 'Aguascalientes, Aguascalientes, México' }],
    estado_final: 'completada',
    fecha_offset_dias: -3,
  },
  {
    origen: 'Ciudad de México, CDMX, México',
    destino: 'Veracruz, Veracruz, México',
    puntos_intermedios: [{ nombre: 'Puebla, Puebla, México' }],
    estado_final: 'en_curso',
    fecha_offset_dias: 0,
  },
  {
    origen: 'Tijuana, Baja California, México',
    destino: 'Hermosillo, Sonora, México',
    puntos_intermedios: [],
    estado_final: 'en_curso',
    fecha_offset_dias: 0,
  },
  {
    origen: 'Mérida, Yucatán, México',
    destino: 'Cancún, Quintana Roo, México',
    puntos_intermedios: [{ nombre: 'Valladolid, Yucatán, México' }],
    estado_final: 'pendiente',
    fecha_offset_dias: 2,
  },
  {
    origen: 'Chihuahua, Chihuahua, México',
    destino: 'Ciudad Juárez, Chihuahua, México',
    puntos_intermedios: [],
    estado_final: 'pendiente',
    fecha_offset_dias: 3,
  },
  {
    origen: 'Acapulco, Guerrero, México',
    destino: 'Ciudad de México, CDMX, México',
    puntos_intermedios: [{ nombre: 'Chilpancingo, Guerrero, México' }],
    estado_final: 'cancelada',
    fecha_offset_dias: -1,
  },
];

async function crearRutas(auth, sedeId, camiones, conductores) {
  console.log('\n[5/6-b] Insertando rutas vía Supabase service-role…');
  console.log('        (POST /api/rutas requiere gerente/supervisor; se inserta directo con service-role)');

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Verificar si ya existen rutas seed para esta sede (idempotencia en re-ejecución)
  const origenesEsperados = RUTAS_SEED.map((r) => r.origen);
  const { data: rutasExistentes } = await admin
    .from('rutas')
    .select('id, origen, destino, estado')
    .eq('sede_id', sedeId)
    .in('origen', origenesEsperados);

  if (rutasExistentes && rutasExistentes.length >= RUTAS_SEED.length) {
    console.log(`  ℹ ${rutasExistentes.length} rutas ya existen para esta sede — recuperando (re-ejecución)`);
    // Asociar estado_final del seed a cada ruta existente por origen
    return rutasExistentes.map((ruta) => {
      const def = RUTAS_SEED.find((r) => r.origen === ruta.origen);
      return { ...ruta, estado_final: def?.estado_final ?? ruta.estado };
    });
  }

  const disponibles = camiones.filter((c) => c.estado === 'disponible');
  const rutasCreadas = [];

  for (let i = 0; i < RUTAS_SEED.length; i++) {
    const def = RUTAS_SEED[i];
    resumen.rutas.intentadas++;

    const camion    = disponibles[i % disponibles.length];
    const conductor = conductores[i % conductores.length];

    if (!camion || !conductor) {
      console.warn(`  ⚠ Sin camión/conductor para ruta ${i + 1} — omitida`);
      continue;
    }

    const fecha = new Date();
    fecha.setDate(fecha.getDate() + def.fecha_offset_dias);

    const { data: ruta, error } = await admin
      .from('rutas')
      .insert({
        sede_id:            sedeId,
        camion_id:          camion.id,
        conductor_id:       conductor.id,
        origen:             def.origen,
        destino:            def.destino,
        puntos_intermedios: def.puntos_intermedios,
        fecha_estimada:     fecha.toISOString(),
        estado:             'pendiente',
        creado_por:         SEED_USER_ID,
      })
      .select('id, origen, destino, estado')
      .single();

    if (error) {
      console.warn(`  ✗ ${def.origen.split(',')[0]} → ${def.destino.split(',')[0]} — ${error.message}`);
      continue;
    }

    resumen.rutas.creadas++;
    console.log(`  ✓ ${def.origen.split(',')[0]} → ${def.destino.split(',')[0]} [obj: ${def.estado_final}] → ${ruta.id}`);
    rutasCreadas.push({ ...ruta, estado_final: def.estado_final });

    await sleep(300);
  }

  return rutasCreadas;
}


// =============================================================================
// PASO 5c — Transicionar estados y disparar geocodificación vía GET /mapa
// =============================================================================

async function transicionarYGeocodificar(auth, rutas) {
  console.log('\n[5/6-c] Transicionando estados y geocodificando (Nominatim + OSRM)…');
  console.log('        ⏱  Puede tardar 30-60s por el rate-limit de Nominatim (1 req/s)');

  for (const ruta of rutas) {
    const label = `${ruta.origen.split(',')[0]} → ${ruta.destino.split(',')[0]}`;

    // Construir secuencia de transiciones desde 'pendiente'
    const transiciones = [];
    if (['en_curso', 'completada', 'cancelada'].includes(ruta.estado_final)) {
      transiciones.push('en_curso');
    }
    if (ruta.estado_final === 'completada') transiciones.push('completada');
    if (ruta.estado_final === 'cancelada')  transiciones.push('cancelada');

    for (const nuevoEstado of transiciones) {
      const { status, json } = await api(auth, 'PATCH', `/api/rutas/${ruta.id}/estado`, { estado: nuevoEstado });
      if (status === 200) {
        console.log(`  ✓ [${label}] → ${nuevoEstado}`);
      } else {
        console.warn(`  ✗ [${label}] → ${nuevoEstado} (HTTP ${status}): ${json.message}`);
      }
      await sleep(400);
    }

    // GET /mapa dispara geocodificación + OSRM automáticamente
    process.stdout.write(`  ↳ Geocodificando [${label}]… `);
    const { status: ms, json: mj } = await api(auth, 'GET', `/api/rutas/${ruta.id}/mapa`);

    if (ms === 200 && mj.success) {
      const d   = mj.data;
      const geo = d.geometria_ruta ? '✓ geo' : '⚠ sin geo';
      const dist = d.distancia_km ? `${d.distancia_km} km` : 'sin dist';
      const dur  = d.duracion_estimada_min ? `${d.duracion_estimada_min} min` : 'sin dur';
      console.log(`${geo} | ${dist} | ${dur}`);
      if (d._advertencias?.length) d._advertencias.forEach((a) => console.warn(`      ⚠ ${a}`));
    } else {
      console.log(`falló (HTTP ${ms}): ${mj.message}`);
    }

    // 3s entre rutas para respetar rate-limit Nominatim (hasta 4 puntos por ruta)
    await sleep(3000);
  }
}

// =============================================================================
// PASO 5d — Reportar puntos GPS para rutas en_curso
// =============================================================================

const TRAYECTORIA_CDMX_VER = [
  { lat: 19.4326, lng: -99.1332, velocidad_kmh: 0  }, // CDMX (partida)
  { lat: 19.2900, lng: -98.9500, velocidad_kmh: 75 }, // salida de CDMX
  { lat: 19.0413, lng: -98.2063, velocidad_kmh: 82 }, // Puebla
  { lat: 18.9680, lng: -97.4000, velocidad_kmh: 85 }, // bajando serranía
  { lat: 19.1738, lng: -96.1342, velocidad_kmh: 78 }, // cerca de Veracruz
];

const TRAYECTORIA_TIJ_HER = [
  { lat: 32.5149, lng: -117.0382, velocidad_kmh: 0  }, // Tijuana (partida)
  { lat: 31.8668, lng: -116.5964, velocidad_kmh: 88 }, // rumbo a Ensenada
  { lat: 30.7000, lng: -115.9000, velocidad_kmh: 95 }, // Baja California
  { lat: 29.5000, lng: -114.3000, velocidad_kmh: 98 }, // desierto de Altar
  { lat: 29.0731, lng: -110.9559, velocidad_kmh: 85 }, // cerca de Hermosillo
];

async function reportarUbicaciones(_auth, rutas) {
  console.log('\n[5/6-d] Reportando puntos GPS para rutas en_curso (service-role)…');
  console.log('        (POST /api/rutas/:id/ubicacion es rechazado por RLS; se inserta directo)');

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const enCurso = rutas.filter((r) => r.estado_final === 'en_curso');

  if (enCurso.length === 0) {
    console.log('  ⚠ No hay rutas en_curso — saltando');
    return;
  }

  const trayectorias = [TRAYECTORIA_CDMX_VER, TRAYECTORIA_TIJ_HER];

  for (let ri = 0; ri < enCurso.length; ri++) {
    const ruta        = enCurso[ri];
    const trayectoria = trayectorias[ri % trayectorias.length];
    const label = `${ruta.origen.split(',')[0]} → ${ruta.destino.split(',')[0]}`;

    // Verificar si ya tiene puntos (idempotencia)
    const { count } = await admin
      .from('ubicaciones_ruta')
      .select('id', { count: 'exact', head: true })
      .eq('ruta_id', ruta.id);

    if (count > 0) {
      console.log(`\n  ⚠ Ruta ${label} ya tiene ${count} punto(s) GPS — saltando`);
      resumen.ubicaciones.creadas += count;
      resumen.ubicaciones.intentadas += trayectoria.length;
      continue;
    }

    console.log(`\n  Ruta: ${label} (${ruta.id.substring(0, 8)}…)`);

    for (let pi = 0; pi < trayectoria.length; pi++) {
      const punto = trayectoria[pi];
      resumen.ubicaciones.intentadas++;

      const { error } = await admin
        .from('ubicaciones_ruta')
        .insert({
          ruta_id:      ruta.id,
          lat:          punto.lat,
          lng:          punto.lng,
          velocidad_kmh: punto.velocidad_kmh,
        });

      if (error) {
        console.warn(`    ✗ Punto ${pi + 1} — ${error.message}`);
      } else {
        resumen.ubicaciones.creadas++;
        console.log(`    ✓ Punto ${pi + 1}/${trayectoria.length} — [${punto.lat}, ${punto.lng}] @ ${punto.velocidad_kmh} km/h`);
      }
      await sleep(150);
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  try {
    const profile = await verificarPerfil();
    const auth    = await login();

    const camiones    = await crearCamiones(auth);
    const conductores = await crearConductores(auth);

    if (camiones.length === 0 || conductores.length === 0) {
      console.error('\n✗ No se pudieron obtener camiones o conductores (ni nuevos ni existentes).');
      console.error('  Revisa que la sede del usuario tenga los datos del seed o ejecuta desde cero.');
      process.exit(1);
    }

    await crearAsignaciones(auth, camiones, conductores);

    const rutas = await crearRutas(auth, profile.sede_id, camiones, conductores);

    if (rutas.length > 0) {
      await transicionarYGeocodificar(auth, rutas);
      await reportarUbicaciones(auth, rutas);
    }

    // ─── Resumen final ───
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  RESUMEN DEL SEED');
    console.log('══════════════════════════════════════════════════════════');
    console.log(`  Sede ID     : ${resumen.sede_id}`);
    console.log(`  Camiones    : ${resumen.camiones.creados}/${resumen.camiones.intentados} creados`);
    console.log(`  Conductores : ${resumen.conductores.creados}/${resumen.conductores.intentados} creados`);
    console.log(`  Asignaciones: ${resumen.asignaciones.creadas}/${resumen.asignaciones.intentadas} creadas`);
    console.log(`  Rutas       : ${resumen.rutas.creadas}/${resumen.rutas.intentadas} creadas`);
    console.log(`  Ubicaciones : ${resumen.ubicaciones.creadas}/${resumen.ubicaciones.intentadas} puntos GPS`);
    console.log('══════════════════════════════════════════════════════════');
    console.log('\n  ✅ Seed completado. Endpoints para verificar:');
    console.log('  ├ GET /api/rutas                               → lista de rutas');
    console.log('  ├ GET /api/rutas/:id/mapa                     → datos Leaflet');
    console.log('  └ GET /api/rutas/:id/ubicacion?historial=true → trayectoria GPS\n');
  } catch (err) {
    console.error('\n✗ Error inesperado:', err);
    process.exit(1);
  }
}

main();

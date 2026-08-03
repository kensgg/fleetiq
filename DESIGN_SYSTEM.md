# Sistema de Diseño — FleetIQ

Este documento define la guía de diseño visual, tipografía, espaciado y estándares de componentes para la plataforma **FleetIQ** (sistema de gestión de flotas para *3 Guerras*). Garantiza la consistencia estética entre el flujo de autenticación y los paneles del dashboard.

---

## 1. PALETA DE COLORES (ALWAYS DARK THEME)

FleetIQ utiliza un tema oscuro por defecto, centrado en el color primario de la marca (Naranja FleetIQ) y contrastes en escala de grises.

| Token | Valor CSS (Variable) | Hex / RGBA | Uso Principal |
| :--- | :--- | :--- | :--- |
| **Primary** | `var(--primary)` | `#E2793D` | Botones principales, enlaces activos, acentos de marca, bordes activos. |
| **Background** | `var(--background)` | `#0A0A0A` | Fondo general de la aplicación. |
| **Card / Surface** | `var(--card)` | `#141416` | Fondo de tarjetas, tablas, cajas de diálogo. |
| **Popover** | `var(--popover)` | `#18181B` | Menús desplegables y modales flotantes. |
| **Secondary** | `var(--secondary)` | `#1E1E22` | Botones secundarios, fondos alternos de listas. |
| **Muted** | `var(--muted)` | `#1E1E22` | Bordes inactivos, fondos deshabilitados. |
| **Muted Text** | `var(--muted-foreground)` | `#8A8A8D` | Texto secundario, descripciones, subtítulos. |
| **Accent Glow** | `var(--auth-accent-glow)` | `rgba(226, 121, 61, 0.25)` | Sombras de enfoque, glows activos. |
| **Destructive** | `var(--destructive)` | `#C45250` | Botones de eliminación, mensajes de error. |

---

## 2. TIPOGRAFÍA Y ESCALA

FleetIQ utiliza una combinación de tipografías sans-serif e inglesas serif específicas:

*   **Tipografía de Interfaz (Sans-serif):** **Inter** (`font-sans`). Se usa para todo el cuerpo de texto, botones, tablas, campos de formulario y navegación.
*   **Tipografía Editorial (Serif):** **DM Serif Display** o Georgia (`font-serif`). Se usa **únicamente** en titulares grandes de marca (e.g., encabezado de login, titulares héroes de secciones especiales).
*   **Tipografía de Código (Monospace):** Geist Mono (`font-mono`). Se usa para folios, placas y coordenadas geográficas.

### Escala de Tamaños
*   `text-xs`: 12px (subtítulos secundarios, etiquetas de estado, timestamps).
*   `text-sm`: 14px (texto base del cuerpo, campos de texto, inputs, botones, enlaces).
*   `text-md / text-base`: 16px (títulos de tarjetas pequeñas, alertas).
*   `text-lg`: 18px (títulos de secciones secundarias, cabeceras de tabla).
*   `text-xl`: 20px (títulos de tarjetas y resúmenes).
*   `text-2xl`: 24px (títulos principales de las páginas del dashboard).
*   `font-serif text-3xl/4xl`: 30px - 40px (titulares principales de login/branding).

---

## 3. ESPACIADOS Y GEOMETRÍA

*   **Bordes Redondeados (Border Radius):**
    *   Botones pequeños, inputs, badges: `var(--radius-md)` (calc(0.75rem * 0.8) ➔ 10px).
    *   Tarjetas, tablas, modales principales: `var(--radius-xl)` (calc(0.75rem * 1.4) ➔ 16px).
    *   Avatares y botones flotantes: `rounded-full`.
*   **Márgenes Internos (Padding):**
    *   Inputs y celdas de tabla: `px-4 py-2.5` o `px-6 py-4`.
    *   Tarjetas base: `p-5` o `p-6`.
    *   Páginas principales del dashboard: `p-4 md:p-6 lg:p-8`.

---

## 4. COMPONENTES BASE (GUÍA DE ESTILOS)

### A. Botón Primario
*   **Estilo:** Fondo `--primary` (`#E2793D`), texto blanco, transición suave en hover (`hover:bg-[#C96A32]`), sombra naranja sutil (`shadow-lg shadow-primary/20`).
*   **Esquinas:** `rounded-xl`.
*   **Tamaño:** `h-9 px-4 py-2 text-sm`.

### B. Botón Secundario
*   **Estilo:** Fondo transparente o `--secondary`, borde `--border` (`#2A2A2E`), texto `--foreground`, hover (`hover:bg-muted`).

### C. Botón Destructivo
*   **Estilo:** Fondo `--destructive` (`#C45250`), texto blanco, hover (`hover:bg-red-600/90`).

### D. Input de Formulario
*   **Estilo:** Fondo `--card`, borde `--border`, texto `--foreground`. Enfoque (`focus:border-primary focus:ring-2 focus:ring-primary/20`), transición suave de color.

### E. Badges de Estado (Badges)
Utilizan combinaciones de colores translúcidos con bordes del mismo tono:
*   **Disponible / Activo:** Fondo verde translúcido (`bg-teal-500/10`), texto verde (`text-teal-400`), borde verde (`border-teal-500/20`).
*   **En Ruta / En Curso:** Fondo naranja translúcido (`bg-primary/10`), texto naranja (`text-primary`), borde naranja (`border-primary/20`).
*   **Mantenimiento / Advertencia:** Fondo ámbar translúcido (`bg-amber-500/10`), texto ámbar (`text-amber-400`), borde ámbar (`border-amber-500/20`).
*   **Inactivo / Cancelado:** Fondo gris translúcido (`bg-muted/50`), texto gris (`text-muted-foreground`), borde gris (`border-border/50`).

### H. Tarjeta (Card)
*   **Estilo:** Fondo `--card` (`#141416`), borde `--border` (`#2A2A2E`), con sombra sutil de fondo.

### I. Skeleton de Carga
*   **Estilo:** Bloques grises redondeados (`bg-muted/50`) con animación de pulsación (`animate-pulse`).

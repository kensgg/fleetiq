// pdfmake server-side Printer isn't covered by @types/pdfmake (client-only types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake/src/Printer');
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

// ─────────────────────────────────────────────────────────────
// FleetIQ — Generador de reportes PDF (RF-20)
// ─────────────────────────────────────────────────────────────

/**
 * Datos genéricos para generar un reporte PDF.
 */
export interface PdfReportData {
  titulo: string;
  subtitulo: string;
  columnas: { header: string; key: string; width: number }[];
  filas: Record<string, unknown>[];
  filtrosAplicados: Record<string, string>;
  fechaGeneracion: string;
}

// Fuentes estándar de pdfmake (built-in, no requieren archivos TTF)
const fonts = {
  Roboto: {
    normal: 'node_modules/pdfmake/build/vfs_fonts.js',
    bold: 'node_modules/pdfmake/build/vfs_fonts.js',
    italics: 'node_modules/pdfmake/build/vfs_fonts.js',
    bolditalics: 'node_modules/pdfmake/build/vfs_fonts.js',
  },
};

/**
 * Genera un archivo PDF en memoria y retorna el Buffer.
 *
 * Estructura:
 * - Encabezado con título y subtítulo.
 * - Tabla de datos con headers coloreados.
 * - Pie con filtros aplicados y fecha de generación.
 */
export async function generarPdf(data: PdfReportData): Promise<Buffer> {
  const printer = new PdfPrinter(fonts);

  // Preparar encabezados de tabla
  const tableHeaders = data.columnas.map((col) => ({
    text: col.header,
    style: 'tableHeader',
  }));

  // Preparar filas de tabla
  const tableBody = data.filas.map((fila, idx) =>
    data.columnas.map((col) => ({
      text: String(fila[col.key] ?? '—'),
      fillColor: idx % 2 === 0 ? '#F8F9FA' : '#FFFFFF',
      fontSize: 9,
    })),
  );

  // Preparar sección de filtros
  const filtrosContent: Content[] = [];
  const filtrosEntries = Object.entries(data.filtrosAplicados);

  if (filtrosEntries.length > 0) {
    filtrosContent.push({
      text: 'Filtros aplicados:',
      style: 'filtrosTitle',
      margin: [0, 15, 0, 5] as [number, number, number, number],
    });
    for (const [clave, valor] of filtrosEntries) {
      filtrosContent.push({
        text: `• ${clave}: ${valor}`,
        fontSize: 8,
        color: '#666666',
      });
    }
  }

  // Calcular anchos proporcionales
  const totalWidth = data.columnas.reduce((sum, col) => sum + col.width, 0);
  const availableWidth = 515; // ancho útil en A4 con márgenes
  const columnWidths = data.columnas.map((col) =>
    Math.floor((col.width / totalWidth) * availableWidth),
  );

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: data.columnas.length > 5 ? 'landscape' : 'portrait',
    pageMargins: [40, 60, 40, 60],

    header: {
      columns: [
        {
          text: 'FleetIQ',
          alignment: 'left' as const,
          fontSize: 10,
          bold: true,
          color: '#1A1A2E',
          margin: [40, 20, 0, 0] as [number, number, number, number],
        },
        {
          text: data.fechaGeneracion,
          alignment: 'right' as const,
          fontSize: 8,
          color: '#999999',
          margin: [0, 22, 40, 0] as [number, number, number, number],
        },
      ],
    },

    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: 'Generado por FleetIQ — Plataforma de Gestión de Flotas',
          fontSize: 7,
          color: '#AAAAAA',
          alignment: 'left' as const,
          margin: [40, 0, 0, 0] as [number, number, number, number],
        },
        {
          text: `Página ${currentPage} de ${pageCount}`,
          fontSize: 7,
          color: '#AAAAAA',
          alignment: 'right' as const,
          margin: [0, 0, 40, 0] as [number, number, number, number],
        },
      ],
    }),

    content: [
      // Título
      {
        text: data.titulo,
        style: 'title',
      },
      // Subtítulo
      {
        text: data.subtitulo,
        style: 'subtitle',
      },
      // Separador
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 5,
            x2: availableWidth,
            y2: 5,
            lineWidth: 1,
            lineColor: '#E0E0E0',
          },
        ],
        margin: [0, 5, 0, 15] as [number, number, number, number],
      },
      // Tabla de datos
      data.filas.length > 0
        ? {
            table: {
              headerRows: 1,
              widths: columnWidths,
              body: [tableHeaders, ...tableBody],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0,
              hLineColor: () => '#E0E0E0',
              paddingLeft: () => 6,
              paddingRight: () => 6,
              paddingTop: () => 4,
              paddingBottom: () => 4,
            },
          }
        : {
            text: 'No se encontraron datos para los filtros seleccionados.',
            fontSize: 11,
            color: '#999999',
            italics: true,
            alignment: 'center' as const,
            margin: [0, 30, 0, 30] as [number, number, number, number],
          },
      // Filtros
      ...filtrosContent,
    ] as Content[],

    styles: {
      title: {
        fontSize: 18,
        bold: true,
        color: '#1A1A2E',
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      subtitle: {
        fontSize: 11,
        color: '#666666',
        italics: true,
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },
      tableHeader: {
        bold: true,
        fontSize: 9,
        color: '#FFFFFF',
        fillColor: '#1A1A2E',
      },
      filtrosTitle: {
        fontSize: 9,
        bold: true,
        color: '#333333',
      },
    },

    defaultStyle: {
      fontSize: 10,
    },
  };

  // Generar PDF como buffer
  return new Promise<Buffer>((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];

    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}

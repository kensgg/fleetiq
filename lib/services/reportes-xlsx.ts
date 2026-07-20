import ExcelJS from 'exceljs';

// ─────────────────────────────────────────────────────────────
// FleetIQ — Generador de reportes XLSX (RF-20)
// ─────────────────────────────────────────────────────────────

/**
 * Datos genéricos para generar un reporte XLSX.
 */
export interface XlsxReportData {
  titulo: string;
  subtitulo: string;
  columnas: { header: string; key: string; width: number }[];
  filas: Record<string, unknown>[];
  filtrosAplicados: Record<string, string>;
  fechaGeneracion: string;
}

/**
 * Genera un archivo XLSX en memoria y retorna el Buffer.
 *
 * Estructura del archivo:
 * - Hoja "Reporte": Encabezado con título, tabla de datos con formato.
 * - Hoja "Metadatos": Filtros aplicados y fecha de generación.
 */
export async function generarXlsx(data: XlsxReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FleetIQ';
  workbook.created = new Date();

  // ─── Hoja principal: Reporte ───
  const sheet = workbook.addWorksheet('Reporte', {
    properties: { defaultColWidth: 18 },
  });

  // Título
  sheet.mergeCells('A1', `${String.fromCharCode(64 + data.columnas.length)}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = data.titulo;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF1A1A2E' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // Subtítulo
  sheet.mergeCells('A2', `${String.fromCharCode(64 + data.columnas.length)}2`);
  const subtitleCell = sheet.getCell('A2');
  subtitleCell.value = data.subtitulo;
  subtitleCell.font = { size: 11, italic: true, color: { argb: 'FF666666' } };
  sheet.getRow(2).height = 20;

  // Fila vacía
  sheet.addRow([]);

  // Headers de columnas
  const headerRow = sheet.addRow(data.columnas.map((c) => c.header));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A1A2E' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF333333' } },
    };
  });
  headerRow.height = 24;

  // Configurar anchos de columna
  data.columnas.forEach((col, index) => {
    sheet.getColumn(index + 1).width = col.width;
    sheet.getColumn(index + 1).key = col.key;
  });

  // Filas de datos
  data.filas.forEach((fila, idx) => {
    const row = sheet.addRow(data.columnas.map((c) => fila[c.key] ?? ''));
    const bgColor = idx % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF';
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      cell.alignment = { vertical: 'middle' };
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } },
      };
    });
  });

  // ─── Hoja de metadatos ───
  const metaSheet = workbook.addWorksheet('Metadatos');
  metaSheet.getColumn(1).width = 25;
  metaSheet.getColumn(2).width = 50;

  metaSheet.addRow(['Reporte', data.titulo]).font = { bold: true, size: 12 };
  metaSheet.addRow(['Fecha de generación', data.fechaGeneracion]);
  metaSheet.addRow([]);
  metaSheet.addRow(['Filtros aplicados', '']).font = { bold: true, size: 11 };

  for (const [clave, valor] of Object.entries(data.filtrosAplicados)) {
    metaSheet.addRow([clave, valor]);
  }

  if (Object.keys(data.filtrosAplicados).length === 0) {
    metaSheet.addRow(['(sin filtros)', 'Se incluyeron todos los registros']);
  }

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

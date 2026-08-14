import { generarReporte } from '../lib/services/reportes';

async function main() {
  try {
    const reporte = await generarReporte({
      tipo: 'km_recorridos',
      formato: 'pdf',
      filtros: {},
      sedeId: '12345678-1234-1234-1234-123456789012',
      userId: '12345678-1234-1234-1234-123456789012'
    });
    console.log("Success:", reporte);
  } catch (e) {
    console.error("Error:", e);
  }
}
main();

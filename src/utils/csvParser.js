import Papa from 'papaparse';

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      transform: v => (typeof v === 'string' ? v.trim() : v),
      complete: (results) => resolve(results.data),
      error: (err) => reject(new Error('Error leyendo CSV: ' + err.message)),
    });
  });
}

// Limpia montos tipo "S/ 51,000.00" → número
export function parseMonto(str) {
  if (!str) return 0;
  const clean = String(str).replace(/[^0-9.]/g, '');
  return parseFloat(clean) || 0;
}

// Extrae proyecto base de strings como "LAS RETAMAS - Etapa 01 - Lote: 5 - Mz.: A"
export function extraerProyecto(str) {
  if (!str) return 'Sin proyecto';
  return String(str).trim();
}
// Formatea número como moneda peruana
export function formatMonto(n) {
  if (n >= 1_000_000) return `S/ ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `S/ ${(n / 1_000).toFixed(1)}k`;
  return `S/ ${n.toFixed(0)}`;
}

// Agrupa un array por una clave
export function agrupar(arr, key) {
  return arr.reduce((acc, row) => {
    const k = row[key] || 'Sin valor';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

// Convierte objeto agrupado en array para recharts
export function aObjeto(obj, labelKey = 'nombre', valueKey = 'cantidad') {
  return Object.entries(obj)
    .map(([k, v]) => ({ [labelKey]: k, [valueKey]: v }))
    .sort((a, b) => b[valueKey] - a[valueKey]);
}

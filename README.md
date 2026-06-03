# Reportes Comerciales — Inmobiliaria

## Requisito único
**Node.js 18+** → https://nodejs.org (descarga el instalador LTS para Windows)

## Cómo iniciar
1. Haz doble clic en **INICIAR.bat**
2. La primera vez instala dependencias automáticamente (~2 min)
3. Se abrirá el navegador en http://localhost:3000

## Uso
- **Leads / Oportunidades / Ventas**: carga el CSV del mes con "Cargar CSV"
- **Resumen General**: se genera automáticamente con el historial acumulado
- Los datos se guardan en la carpeta `/data` como archivos JSON por mes

## Estructura de datos guardados
```
data/
  2026-05.json   ← Mayo 2026 (leads + oportunidades + ventas)
  2026-06.json   ← Junio 2026
  ...
```

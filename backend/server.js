const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, '..', 'data');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Asegurar que exista la carpeta data/
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// GET /api/periodos — lista todos los períodos guardados
app.get('/api/periodos', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort((a, b) => b.localeCompare(a)); // más reciente primero
    res.json(files);
  } catch (e) {
    res.status(500).json({ error: 'Error leyendo períodos' });
  }
});

// GET /api/datos/:periodo — obtiene los datos de un período (ej: 2026-05)
app.get('/api/datos/:periodo', (req, res) => {
  const file = path.join(DATA_DIR, `${req.params.periodo}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Período no encontrado' });
  try {
    const raw = fs.readFileSync(file, 'utf8');
    res.json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ error: 'Error leyendo archivo' });
  }
});

app.post('/api/datos/:periodo', (req, res) => {
  const file = path.join(DATA_DIR, `${req.params.periodo}.json`);
  try {
    // Si ya existe, mergear (no pierde lo que ya había)
    let existing = {};
    if (fs.existsSync(file)) {
      existing = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    const merged = { ...existing, ...req.body, periodo: req.params.periodo };
    fs.writeFileSync(file, JSON.stringify(merged, null, 2), 'utf8');
    res.json({ ok: true, periodo: req.params.periodo });
  } catch (e) {
    res.status(500).json({ error: 'Error guardando datos' });
  }
});

// DELETE /api/datos/:periodo — elimina un período
app.delete('/api/datos/:periodo', (req, res) => {
  const file = path.join(DATA_DIR, `${req.params.periodo}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'No existe' });
  fs.unlinkSync(file);
  res.json({ ok: true });
});

// GET /api/todos — todos los períodos juntos para resumen general
app.get('/api/todos', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const all = files.map(f => {
      const raw = fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
      return JSON.parse(raw);
    });
    res.json(all);
  } catch (e) {
    res.status(500).json({ error: 'Error cargando todos los datos' });
  }
});

app.listen(PORT, () => {
  console.log(`\nBackend corriendo en http://localhost:${PORT}`);
  console.log(`Datos guardados en: ${DATA_DIR}\n`);
});

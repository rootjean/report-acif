const BASE = '/api';

export async function getPeriodos() {
  const r = await fetch(`${BASE}/periodos`);
  return r.json();
}

export async function getDatos(periodo) {
  const r = await fetch(`${BASE}/datos/${periodo}`);
  if (!r.ok) throw new Error('No encontrado');
  return r.json();
}

export async function guardarDatos(periodo, datos) {
  const r = await fetch(`${BASE}/datos/${periodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  return r.json();
}

export async function eliminarPeriodo(periodo) {
  const r = await fetch(`${BASE}/datos/${periodo}`, { method: 'DELETE' });
  return r.json();
}

export async function getTodos() {
  const r = await fetch(`${BASE}/todos`);
  return r.json();
}

import React, { useEffect, useState } from 'react';
import { getTodos } from '../utils/api';
import { parseMonto, formatMonto } from '../utils/csvParser';
import KpiCard from '../components/KpiCard';
import Grafico from '../components/Grafico';
import './Tab.css';

export default function TabResumen({ periodos, periodoLabel }) {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (periodos.length === 0) return;
    setLoading(true);
    getTodos().then(data => { setTodos(data); setLoading(false); }).catch(() => setLoading(false));
  }, [periodos]);

  if (loading) return <div className="tab-page"><p className="loading-msg">Cargando historial...</p></div>;

  if (todos.length === 0) return (
    <div className="tab-page">
      <div className="tab-header"><h1 className="tab-title">Resumen General</h1></div>
      <div className="empty-state">
        <p>Aún no hay datos históricos. Carga los reportes mensuales desde cada pestaña.</p>
      </div>
    </div>
  );

  // Agregar por mes
  const porMes = todos.map(d => {
    const leads = (d.leads || []).length;
    const opor = (d.oportunidades || []).length;
    const ventas = (d.ventas || []).length;
    const monto = (d.ventas || []).reduce((s, r) => s + parseMonto(r['Monto Total']), 0);
    return { nombre: periodoLabel(d.periodo), leads, opor, ventas, monto: Math.round(monto) };
  }).reverse();

  const totalLeads = porMes.reduce((s, r) => s + r.leads, 0);
  const totalOpor = porMes.reduce((s, r) => s + r.opor, 0);
  const totalVentas = porMes.reduce((s, r) => s + r.ventas, 0);
  const totalMonto = porMes.reduce((s, r) => s + r.monto, 0);
  const tasaGlobal = totalLeads > 0 ? Math.round((totalVentas / totalLeads) * 100) : 0;

  return (
    <div className="tab-page">
      <div className="tab-header">
        <div>
          <h1 className="tab-title">Resumen General</h1>
          <p className="tab-sub">{todos.length} período{todos.length !== 1 ? 's' : ''} cargado{todos.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Leads Totales" value={totalLeads} sub="Todos los períodos" color="var(--naranja)" />
        <KpiCard label="Oportunidades" value={totalOpor} color="var(--azul)" />
        <KpiCard label="Ventas Cerradas" value={totalVentas} color="var(--verde)" />
        <KpiCard label="Monto Total" value={formatMonto(totalMonto)} color="#7C3AED" />
        <KpiCard label="Conversión Global" value={`${tasaGlobal}%`} sub="Lead → Venta" color="#0891B2" />
      </div>

      <div className="graficos-grid">
        <Grafico titulo="Leads por mes" datos={porMes} valueKey="leads" color="#E8620A" />
        <Grafico titulo="Oportunidades por mes" datos={porMes} valueKey="opor" color="#2563EB" />
        <Grafico titulo="Ventas cerradas por mes" datos={porMes} valueKey="ventas" color="#16A34A" />
        <Grafico titulo="Monto vendido por mes (S/)" datos={porMes} valueKey="monto" color="#7C3AED" />
      </div>

      <div className="section-card">
        <h2 className="section-title">Resumen por período</h2>
        <div className="tabla-scroll-simple">
          <table className="resumen-tabla">
            <thead>
              <tr>
                <th>Período</th>
                <th>Leads</th>
                <th>Oportunidades</th>
                <th>Ventas</th>
                <th>Monto Total</th>
                <th>Conv. Lead→Venta</th>
              </tr>
            </thead>
            <tbody>
              {porMes.map((r, i) => (
                <tr key={i}>
                  <td><strong>{r.nombre}</strong></td>
                  <td>{r.leads}</td>
                  <td>{r.opor}</td>
                  <td>{r.ventas}</td>
                  <td>{formatMonto(r.monto)}</td>
                  <td>{r.leads > 0 ? `${Math.round((r.ventas / r.leads) * 100)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState, useMemo } from 'react';
import { getDatos } from '../utils/api';
import { agrupar, aObjeto, parseMonto, formatMonto, extraerProyecto } from '../utils/csvParser';
import KpiCard from '../components/KpiCard';
import Grafico from '../components/Grafico';
import Tabla from '../components/Tabla';
import UploadCSV from '../components/UploadCSV';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import './Tab.css';

const COLORES_PIE = ['#E8620A', '#F97316', '#16A34A', '#2563EB', '#7C3AED'];

export default function TabVentas({ periodo, periodoLabel, onGuardado }) {
  const [datos, setDatos] = useState(null);
  const [vista, setVista] = useState('reporte');
  const [loading, setLoading] = useState(false);

  const cargar = (p) => {
    if (!p) return;
    setLoading(true);
    getDatos(p).then(d => { setDatos(d.ventas || null); setLoading(false); }).catch(() => { setDatos(null); setLoading(false); });
  };

  useEffect(() => { cargar(periodo); }, [periodo]);

  const filas = datos || [];
  const filasNorm = filas.map(r => ({
    ...r,
    _monto: parseMonto(r['Monto Total']),
    _proyecto: extraerProyecto(r['Lote'] || ''),
    _montoSep: parseMonto(r['Monto separacion']),
    _montoInicial: parseMonto(r['Total Inicial']),
    _montoRestante: parseMonto(r['Monto Restante']),
  }));

  const montoTotal = filasNorm.reduce((s, r) => s + r._monto, 0);
  const montoRestante = filasNorm.reduce((s, r) => s + r._montoRestante, 0);
  const montoRecaudado = montoTotal - montoRestante;
  const promedio = filas.length > 0 ? montoTotal / filas.length : 0;
  const alContado = filas.filter(r => (r.Venta || '').toUpperCase().includes('CONTADO')).length;
  const credito = filas.filter(r => (r.Venta || '').toUpperCase().includes('CREDITO')).length;
  const fraccionado = filas.filter(r => (r.Venta || '').toUpperCase().includes('FRACCIONADO')).length;

  const porAsesor = aObjeto(agrupar(filasNorm, 'Asesor'));
  const porTipoVenta = aObjeto(agrupar(filasNorm, 'Venta'));
  const porProyecto = aObjeto(agrupar(filasNorm, '_proyecto'), 'nombre', 'cantidad');

  const montoAsesor = Object.entries(
    filasNorm.reduce((acc, r) => { acc[r.Asesor || 'Sin asesor'] = (acc[r.Asesor || 'Sin asesor'] || 0) + r._monto; return acc; }, {})
  ).map(([nombre, monto]) => ({ nombre, monto: Math.round(monto) })).sort((a, b) => b.monto - a.monto);

  // Ventas por fecha (línea)
  const ventasPorFecha = useMemo(() => {
    const counts = {};
    filasNorm.forEach(r => {
      const raw = (r.Fecha || '').split(' ')[0];
      const partes = raw.includes('/') ? raw.split('/') : raw.split('-');
      const key = partes.length === 3
        ? (raw.includes('/') ? `${partes[2]}-${partes[1]}-${partes[0]}` : raw)
        : raw;
      if (key) counts[key] = (counts[key] || 0) + r._monto;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).map(([nombre, monto]) => ({ nombre, monto: Math.round(monto) }));
  }, [filasNorm]);

  // Recaudado vs Restante
  const pieRecaudado = [
    { name: 'Recaudado', value: Math.round(montoRecaudado) },
    { name: 'Restante', value: Math.round(montoRestante) },
  ];

  return (
    <div className="tab-page">
      <div className="tab-header">
        <div>
          <h1 className="tab-title">Ventas</h1>
          {periodo && <p className="tab-sub">{periodoLabel(periodo)}</p>}
        </div>
        <div className="tab-actions">
          <button className={`btn-toggle ${vista === 'reporte' ? 'active' : ''}`} onClick={() => setVista('reporte')}>Ver reporte</button>
          <button className={`btn-toggle ${vista === 'cargar' ? 'active' : ''}`} onClick={() => setVista('cargar')}>Cargar CSV</button>
        </div>
      </div>

      {vista === 'cargar' && (
        <div className="section-card">
          <h2 className="section-title">Cargar reporte de Ventas</h2>
          <UploadCSV tipo="ventas" periodo={periodo} onGuardado={(p) => { onGuardado(p); cargar(p); setVista('reporte'); }} />
        </div>
      )}

      {vista === 'reporte' && loading && <p className="loading-msg">Cargando datos...</p>}

      {vista === 'reporte' && !loading && filas.length === 0 && (
        <div className="empty-state">
          <p>No hay datos para este período.</p>
          <button className="btn-primary" onClick={() => setVista('cargar')}>Cargar CSV de Ventas</button>
        </div>
      )}

      {vista === 'reporte' && filas.length > 0 && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Total Ventas" value={filas.length} color="var(--naranja)" />
            <KpiCard label="Monto Total" value={formatMonto(montoTotal)} sub="Ventas del período" color="var(--verde)" />
            <KpiCard label="Ticket Promedio" value={formatMonto(promedio)} color="var(--azul)" />
            <KpiCard label="Monto Recaudado" value={formatMonto(montoRecaudado)} sub={`Restante: ${formatMonto(montoRestante)}`} color="#7C3AED" />
            <KpiCard label="Al Contado" value={alContado} color="#0891B2" />
            <KpiCard label="Crédito / Fraccionado" value={`${credito} / ${fraccionado}`} color="#6B7280" />
          </div>

          <div className="graficos-grid">
            <Grafico titulo="Ventas por Asesor (cantidad)" datos={porAsesor} />
            <Grafico titulo="Monto vendido por Asesor (S/)" datos={montoAsesor} valueKey="monto" />
            <Grafico titulo="Ventas por Proyecto" datos={porProyecto} />
            <Grafico titulo="Tipo de Pago" datos={porTipoVenta} />
          </div>

          {/* Recaudado vs Restante */}
          {montoRestante > 0 && (
            <div className="grafico-card">
              <h3 className="grafico-titulo">Monto recaudado vs restante por cobrar</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieRecaudado} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: S/ ${value.toLocaleString()}`} labelLine={false} fontSize={12}>
                    {pieRecaudado.map((_, i) => <Cell key={i} fill={i === 0 ? '#16A34A' : '#E8620A'} />)}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={v => `S/ ${Number(v).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Ventas por fecha */}
          {ventasPorFecha.length > 1 && (
            <div className="grafico-card">
              <h3 className="grafico-titulo">Monto vendido por fecha (S/)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={ventasPorFecha} margin={{ top: 4, right: 12, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => `S/ ${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                  <Line type="monotone" dataKey="monto" stroke="#16A34A" strokeWidth={2} dot={{ fill: '#16A34A', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="section-card">
            <h2 className="section-title">Detalle de Ventas</h2>
            <Tabla filas={filas} columnas={filas.length > 0 ? Object.keys(filas[0]) : []} />
          </div>
        </>
      )}
    </div>
  );
}
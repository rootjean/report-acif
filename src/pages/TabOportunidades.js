import React, { useEffect, useState, useMemo } from 'react';
import { getDatos } from '../utils/api';
import { agrupar, aObjeto, extraerProyecto } from '../utils/csvParser';
import KpiCard from '../components/KpiCard';
import Grafico from '../components/Grafico';
import Tabla from '../components/Tabla';
import UploadCSV from '../components/UploadCSV';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './Tab.css';

export default function TabOportunidades({ periodo, periodoLabel, onGuardado }) {
  const [datos, setDatos] = useState(null);
  const [vista, setVista] = useState('reporte');
  const [loading, setLoading] = useState(false);

  const cargar = (p) => {
    if (!p) return;
    setLoading(true);
    getDatos(p).then(d => { setDatos(d.oportunidades || null); setLoading(false); }).catch(() => { setDatos(null); setLoading(false); });
  };

  useEffect(() => { cargar(periodo); }, [periodo]);

  const filas = datos || [];
  const enProceso = filas.filter(r => (r.Estado || '').toUpperCase() === 'EN PROCESO').length;
  const separacion = filas.filter(r => (r.Estado || '').toUpperCase() === 'SEPARACION').length;
  const tasaSep = filas.length > 0 ? Math.round((separacion / filas.length) * 100) : 0;

  const filasNorm = filas.map(r => ({ ...r, Proyecto: extraerProyecto(r['Proyectos de Interes'] || r['Lote'] || '') }));
  const porAsesor = aObjeto(agrupar(filasNorm, 'Asesor'));
  const porEstado = aObjeto(agrupar(filasNorm, 'Estado'));
  const porProyecto = aObjeto(agrupar(filasNorm, 'Proyecto'));
  const porCanal = aObjeto(agrupar(filasNorm, 'Contacto'));

  // Evolución por día
  const porDia = useMemo(() => {
    const counts = {};
    filas.forEach(r => {
      const raw = (r.Fecha || '').split(' ')[0];
      const partes = raw.includes('/') ? raw.split('/') : raw.split('-');
      const key = partes.length === 3
        ? (raw.includes('/') ? `${partes[2]}-${partes[1]}-${partes[0]}` : raw)
        : raw;
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).map(([nombre, cantidad]) => ({ nombre, cantidad }));
  }, [filas]);

  return (
    <div className="tab-page">
      <div className="tab-header">
        <div>
          <h1 className="tab-title">Oportunidades</h1>
          {periodo && <p className="tab-sub">{periodoLabel(periodo)}</p>}
        </div>
        <div className="tab-actions">
          <button className={`btn-toggle ${vista === 'reporte' ? 'active' : ''}`} onClick={() => setVista('reporte')}>Ver reporte</button>
          <button className={`btn-toggle ${vista === 'cargar' ? 'active' : ''}`} onClick={() => setVista('cargar')}>Cargar CSV</button>
        </div>
      </div>

      {vista === 'cargar' && (
        <div className="section-card">
          <h2 className="section-title">Cargar reporte de Oportunidades</h2>
          <UploadCSV tipo="oportunidades" periodo={periodo} onGuardado={(p) => { onGuardado(p); cargar(p); setVista('reporte'); }} />
        </div>
      )}

      {vista === 'reporte' && loading && <p className="loading-msg">Cargando datos...</p>}

      {vista === 'reporte' && !loading && filas.length === 0 && (
        <div className="empty-state">
          <p>No hay datos para este período.</p>
          <button className="btn-primary" onClick={() => setVista('cargar')}>Cargar CSV de Oportunidades</button>
        </div>
      )}

      {vista === 'reporte' && filas.length > 0 && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Total Oportunidades" value={filas.length} color="var(--naranja)" />
            <KpiCard label="En Proceso" value={enProceso} sub="Activas" color="var(--azul)" />
            <KpiCard label="En Separación" value={separacion} sub="Próximas a cerrar" color="var(--verde)" />
            <KpiCard label="Tasa de Separación" value={`${tasaSep}%`} sub="Oportunidad → Separación" color="#7C3AED" />
          </div>

          <div className="graficos-grid">
            <Grafico titulo="Oportunidades por Asesor" datos={porAsesor} />
            <Grafico titulo="Oportunidades por Proyecto" datos={porProyecto} />
            <Grafico titulo="Estado de Oportunidades" datos={porEstado} />
            <Grafico titulo="Canal de Origen" datos={porCanal} />
          </div>

          {porDia.length > 1 && (
            <div className="grafico-card">
              <h3 className="grafico-titulo">Evolución de oportunidades en el tiempo</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={porDia} margin={{ top: 4, right: 12, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                  <Line type="monotone" dataKey="cantidad" stroke="#2563EB" strokeWidth={2} dot={{ fill: '#2563EB', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="section-card">
            <h2 className="section-title">Detalle de Oportunidades</h2>
            <Tabla filas={filas} columnas={filas.length > 0 ? Object.keys(filas[0]) : []} />
          </div>
        </>
      )}
    </div>
  );
}
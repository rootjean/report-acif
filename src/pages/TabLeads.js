import React, { useEffect, useState, useMemo } from 'react';
import { getDatos } from '../utils/api';
import { agrupar, aObjeto } from '../utils/csvParser';
import KpiCard from '../components/KpiCard';
import Grafico from '../components/Grafico';
import Tabla from '../components/Tabla';
import UploadCSV from '../components/UploadCSV';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import './Tab.css';

export default function TabLeads({ periodo, periodoLabel, onGuardado }) {
  const [datos, setDatos] = useState(null);
  const [vista, setVista] = useState('reporte');
  const [loading, setLoading] = useState(false);

  const cargar = (p) => {
    if (!p) return;
    setLoading(true);
    getDatos(p).then(d => { setDatos(d.leads || null); setLoading(false); }).catch(() => { setDatos(null); setLoading(false); });
  };

  useEffect(() => { cargar(periodo); }, [periodo]);

  const filas = datos || [];

  const totalLeads = filas.length;
  const pendientes = filas.filter(r => (r.Estado || '').toUpperCase() === 'PENDIENTE').length;
  const enOportunidad = filas.filter(r => (r.Estado || '').toUpperCase() === 'OPORTUNIDAD').length;
  const tasaConv = totalLeads > 0 ? Math.round((enOportunidad / totalLeads) * 100) : 0;

  const porAsesor = aObjeto(agrupar(filas, 'Asesor'));
  const porCanal = aObjeto(agrupar(filas, 'Medio Contacto'));
  const porProyecto = aObjeto(agrupar(filas, 'Proyectos de Interes'));
  const porEstado = aObjeto(agrupar(filas, 'Estado'));

  // Leads por día
  const porDia = useMemo(() => {
    const counts = {};
    filas.forEach(r => {
      const fecha = (r.Fecha || '').split(' ')[0].split('/');
      if (fecha.length >= 3) {
        const key = `${fecha[2]}-${fecha[1]}-${fecha[0]}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).map(([nombre, cantidad]) => ({ nombre, cantidad }));
  }, [filas]);

  return (
    <div className="tab-page">
      <div className="tab-header">
        <div>
          <h1 className="tab-title">Leads</h1>
          {periodo && <p className="tab-sub">{periodoLabel(periodo)}</p>}
        </div>
        <div className="tab-actions">
          <button className={`btn-toggle ${vista === 'reporte' ? 'active' : ''}`} onClick={() => setVista('reporte')}>Ver reporte</button>
          <button className={`btn-toggle ${vista === 'cargar' ? 'active' : ''}`} onClick={() => setVista('cargar')}>Cargar CSV</button>
        </div>
      </div>

      {vista === 'cargar' && (
        <div className="section-card">
          <h2 className="section-title">Cargar reporte de Leads</h2>
          <UploadCSV tipo="leads" periodo={periodo} onGuardado={(p) => { onGuardado(p); cargar(p); setVista('reporte'); }} />
        </div>
      )}

      {vista === 'reporte' && loading && <p className="loading-msg">Cargando datos...</p>}

      {vista === 'reporte' && !loading && filas.length === 0 && (
        <div className="empty-state">
          <p>No hay datos para este período.</p>
          <button className="btn-primary" onClick={() => setVista('cargar')}>Cargar CSV de Leads</button>
        </div>
      )}

      {vista === 'reporte' && filas.length > 0 && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Total Leads" value={totalLeads} color="var(--naranja)" />
            <KpiCard label="Pendientes" value={pendientes} sub="Sin gestionar" color="#6B7280" />
            <KpiCard label="En Oportunidad" value={enOportunidad} sub="Leads calificados" color="var(--verde)" />
            <KpiCard label="Tasa de Conversión" value={`${tasaConv}%`} sub="Lead → Oportunidad" color="var(--azul)" />
          </div>

          <div className="graficos-grid">
            <Grafico titulo="Leads por Asesor" datos={porAsesor} />
            <Grafico titulo="Leads por Canal de Captación" datos={porCanal} />
            <Grafico titulo="Leads por Proyecto de Interés" datos={porProyecto} />
            <Grafico titulo="Leads por Estado" datos={porEstado} />
          </div>

          {/* Leads por día — gráfico de línea */}
          {porDia.length > 1 && (
            <div className="grafico-card">
              <h3 className="grafico-titulo">Leads por día</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={porDia} margin={{ top: 4, right: 12, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                  <Line type="monotone" dataKey="cantidad" stroke="#E8620A" strokeWidth={2} dot={{ fill: '#E8620A', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
            
          <div className="section-card">
            <h2 className="section-title">Detalle de Leads</h2>
            <Tabla filas={filas} columnas={filas.length > 0 ? Object.keys(filas[0]) : []} />
          </div>
        </>
      )}
    </div>
  );
}
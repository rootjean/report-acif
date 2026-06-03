import React, { useEffect, useState } from 'react';
import { getDatos } from '../utils/api';
import { agrupar, aObjeto } from '../utils/csvParser';
import KpiCard from '../components/KpiCard';
import Grafico from '../components/Grafico';
import Tabla from '../components/Tabla';
import UploadCSV from '../components/UploadCSV';
import './Tab.css';

const COLS_LEADS = ['Nº','Fecha','Estado','Asesor','Medio Contacto','Proyectos de Interes','Cliente','Apellidos','Celular','Ciudad'];

export default function TabLeads({ periodo, periodoLabel, onGuardado }) {
  const [datos, setDatos] = useState(null);
  const [vista, setVista] = useState('reporte'); // 'reporte' | 'cargar'
  const [loading, setLoading] = useState(false);

  const cargar = (p) => {
    if (!p) return;
    setLoading(true);
    getDatos(p).then(d => { setDatos(d.leads || null); setLoading(false); }).catch(() => { setDatos(null); setLoading(false); });
  };

  useEffect(() => { cargar(periodo); }, [periodo]);

  const filas = datos || [];
  const colsDisponibles = filas.length > 0 ? Object.keys(filas[0]).filter(c => COLS_LEADS.includes(c) || COLS_LEADS.length === 0) : [];

  const totalLeads = filas.length;
  const pendientes = filas.filter(r => (r.Estado || '').toUpperCase() === 'PENDIENTE').length;
  const enOportunidad = filas.filter(r => (r.Estado || '').toUpperCase() === 'OPORTUNIDAD').length;
  const tasaConv = totalLeads > 0 ? Math.round((enOportunidad / totalLeads) * 100) : 0;

  const porAsesor = aObjeto(agrupar(filas, 'Asesor'));
  const porCanal = aObjeto(agrupar(filas, 'Medio Contacto'));
  const porProyecto = aObjeto(agrupar(filas, 'Proyectos de Interes'));
  const porEstado = aObjeto(agrupar(filas, 'Estado'));

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
          <UploadCSV
            tipo="leads"
            periodo={periodo}
            onGuardado={(p) => { onGuardado(p); cargar(p); setVista('reporte'); }}
          />
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

          <div className="section-card">
            <h2 className="section-title">Detalle de Leads</h2>
            <Tabla filas={filas} columnas={colsDisponibles.length ? colsDisponibles : Object.keys(filas[0])} />
          </div>
        </>
      )}
    </div>
  );
}

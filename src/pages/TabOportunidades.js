import React, { useEffect, useState } from 'react';
import { getDatos } from '../utils/api';
import { agrupar, aObjeto, extraerProyecto } from '../utils/csvParser';
import KpiCard from '../components/KpiCard';
import Grafico from '../components/Grafico';
import Tabla from '../components/Tabla';
import UploadCSV from '../components/UploadCSV';
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
            <Grafico titulo="Estado de Oportunidades" datos={porEstado} />
            <Grafico titulo="Oportunidades por Proyecto" datos={porProyecto} />
            <Grafico titulo="Canal de Origen" datos={porCanal} />
          </div>

          <div className="section-card">
            <h2 className="section-title">Detalle de Oportunidades</h2>
            <Tabla filas={filas} columnas={Object.keys(filas[0]).filter(c => !['Llamar','Whatsapp','Operaciones/Crear','Historial','Proformas','Editar'].includes(c))} />
          </div>
        </>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { getDatos } from '../utils/api';
import { agrupar, aObjeto, parseMonto, formatMonto, extraerProyecto } from '../utils/csvParser';
import KpiCard from '../components/KpiCard';
import Grafico from '../components/Grafico';
import Tabla from '../components/Tabla';
import UploadCSV from '../components/UploadCSV';
import './Tab.css';

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
  }));

  const montoTotal = filasNorm.reduce((s, r) => s + r._monto, 0);
  const promedio = filas.length > 0 ? montoTotal / filas.length : 0;
  const alContado = filas.filter(r => (r.Venta || '').toUpperCase().includes('CONTADO')).length;
  const credito = filas.filter(r => (r.Venta || '').toUpperCase().includes('CREDITO') || (r.Venta || '').toUpperCase().includes('FRACCIONADO')).length;

  const porAsesor = aObjeto(agrupar(filasNorm, 'Asesor'));
  const porTipoVenta = aObjeto(agrupar(filasNorm, 'Venta'));
  const porProyecto = aObjeto(agrupar(filasNorm, '_proyecto'), 'nombre', 'cantidad');
  const porEstado = aObjeto(agrupar(filasNorm, 'Estado'));

  // Monto por asesor
  const montoAsesor = Object.entries(
    filasNorm.reduce((acc, r) => { acc[r.Asesor || 'Sin asesor'] = (acc[r.Asesor || 'Sin asesor'] || 0) + r._monto; return acc; }, {})
  ).map(([nombre, monto]) => ({ nombre, monto: Math.round(monto) })).sort((a,b) => b.monto - a.monto);

  const colsTabla = ['N°','ID','Asesor','Fecha','Estado','Estado lote','Lote','Venta','Monto Total','Nombres','Apellidos','Celular1'];

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
            <KpiCard label="Al Contado" value={alContado} sub={`${credito} a crédito/fraccionado`} color="#7C3AED" />
          </div>

          <div className="graficos-grid">
            <Grafico titulo="Ventas por Asesor" datos={porAsesor} />
            <Grafico titulo="Monto vendido por Asesor (S/)" datos={montoAsesor} valueKey="monto" />
            <Grafico titulo="Tipo de Venta" datos={porTipoVenta} />
            <Grafico titulo="Ventas por Proyecto" datos={porProyecto} />
          </div>

          <div className="section-card">
            <h2 className="section-title">Detalle de Ventas</h2>
            <Tabla filas={filas} columnas={colsTabla.filter(c => filas[0] && c in filas[0])} />
          </div>
        </>
      )}
    </div>
  );
}

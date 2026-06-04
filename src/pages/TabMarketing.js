import React, { useEffect, useState, useMemo } from 'react';
import { getDatos, guardarDatos } from '../utils/api';
import { agrupar, aObjeto, extraerProyecto } from '../utils/csvParser';
import KpiCard from '../components/KpiCard';
import Grafico from '../components/Grafico';
import './Tab.css';

const CANALES = ['Facebook', 'Instagram', 'Google', 'Referido', 'Email', 'Orgánico', 'Otro'];
const COLUMNAS_GASTOS_BASE = ['INVERSIONES', 'CONSTRUCTORA', 'PROYECTOS'];
const EMPRESAS = ['CAPCIM', 'INVERSIONES', 'CONSTRUCTORA', 'PROYECTOS'];

export default function TabMarketing({ periodo, periodoLabel, onGuardado }) {
  const [datos, setDatos] = useState([]);
  const [vista, setVista] = useState('reporte');
  const [loading, setLoading] = useState(false);
  const [leadsData, setLeadsData] = useState([]);
  const [proyectoEmpresa, setProyectoEmpresa] = useState({});

  const [formData, setFormData] = useState({
    fecha: '',
    canal: '',
    campaña: '',
    clics: 0,
    impresiones: 0,
    costo: 0,
    leadsGenerados: 0,
  });

  const [columnasVisibles, setColumnasVisibles] = useState(['INVERSIONES', 'CONSTRUCTORA', 'PROYECTOS']);

  const [gastosSemanales, setGastosSemanales] = useState([
    { semana: 1, CAPCIM: 0, INVERSIONES: 0, CONSTRUCTORA: 0, PROYECTOS: 0 },
    { semana: 2, CAPCIM: 0, INVERSIONES: 0, CONSTRUCTORA: 0, PROYECTOS: 0 },
    { semana: 3, CAPCIM: 0, INVERSIONES: 0, CONSTRUCTORA: 0, PROYECTOS: 0 },
    { semana: 4, CAPCIM: 0, INVERSIONES: 0, CONSTRUCTORA: 0, PROYECTOS: 0 }
  ]);

  const cargar = (p) => {
    if (!p) return;
    setLoading(true);
    getDatos(p).then(d => { 
      setDatos(d.marketing || []); 
      setLeadsData(d.leads || []);
      let gs = d.gastosSemanales || [];
      if (gs.length < 4) {
        for (let i = gs.length + 1; i <= 4; i++) {
          gs.push({ semana: i, CAPCIM: 0, INVERSIONES: 0, CONSTRUCTORA: 0, PROYECTOS: 0 });
        }
      }
      if (gs.length > 5) gs = gs.slice(0, 5);
      setGastosSemanales(gs);
      setProyectoEmpresa(d.proyectoEmpresa || {});
      setLoading(false); 
    }).catch(() => { 
      setDatos([]); 
      setLeadsData([]);
      setGastosSemanales([
        { semana: 1, CAPCIM: 0, INVERSIONES: 0, CONSTRUCTORA: 0, PROYECTOS: 0 },
        { semana: 2, CAPCIM: 0, INVERSIONES: 0, CONSTRUCTORA: 0, PROYECTOS: 0 },
        { semana: 3, CAPCIM: 0, INVERSIONES: 0, CONSTRUCTORA: 0, PROYECTOS: 0 },
        { semana: 4, CAPCIM: 0, INVERSIONES: 0, CONSTRUCTORA: 0, PROYECTOS: 0 }
      ]);
      setProyectoEmpresa({});
      setLoading(false); 
    });
  };

  useEffect(() => { cargar(periodo); }, [periodo]);

  const filas = datos || [];

  const totalClics = filas.reduce((sum, r) => sum + (Number(r.Clics) || 0), 0);
  const totalImpresiones = filas.reduce((sum, r) => sum + (Number(r.Impresiones) || 0), 0);
  const totalCosto = filas.reduce((sum, r) => sum + (Number(r.Costo) || 0), 0);
  const totalLeads = filas.reduce((sum, r) => sum + (Number(r['Leads Generados']) || 0), 0);
  const cplGlobal = totalLeads > 0 ? (totalCosto / totalLeads).toFixed(2) : 0;
  const ctrGlobal = totalImpresiones > 0 ? ((totalClics / totalImpresiones) * 100).toFixed(2) : 0;

  const porCanal = aObjeto(agrupar(filas, 'Canal'));
  const porCampaña = aObjeto(agrupar(filas, 'Campaña'));
  const costoPorCanal = aObjeto(filas.reduce((acc, r) => {
    const k = r.Canal || 'Sin canal';
    acc[k] = (acc[k] || 0) + (Number(r.Costo) || 0);
    return acc;
  }, {}));
  const leadsPorCanal = aObjeto(filas.reduce((acc, r) => {
    const k = r.Canal || 'Sin canal';
    acc[k] = (acc[k] || 0) + (Number(r['Leads Generados']) || 0);
    return acc;
  }, {}));

  const proyectosUnicos = useMemo(() => {
    const proyectos = new Set();
    leadsData.forEach(r => {
      const raw = r['Proyectos de Interes'] || r['Proyectos de Interés'] || r['Proyecto'] || '';
      const base = extraerProyecto(raw);
      if (base && base !== 'Sin proyecto') proyectos.add(base);
    });
    return Array.from(proyectos).sort();
  }, [leadsData]);

  const leadsPorProyecto = useMemo(() => {
    const acc = {};
    leadsData.forEach(r => {
      const raw = r['Proyectos de Interes'] || r['Proyectos de Interés'] || r['Proyecto'] || '';
      const base = extraerProyecto(raw);
      if (base && base !== 'Sin proyecto') {
        acc[base] = (acc[base] || 0) + 1;
      }
    });
    return acc;
  }, [leadsData]);

  const columnasGastos = useMemo(() => ['CAPCIM', ...columnasVisibles], [columnasVisibles]);

  const totalesGastos = useMemo(() => {
    return columnasGastos.reduce((acc, col) => {
      acc[col] = gastosSemanales.reduce((sum, s) => sum + (Number(s[col]) || 0), 0);
      return acc;
    }, {});
  }, [gastosSemanales, columnasGastos]);

  const totalGeneralGastos = useMemo(() => {
    return columnasGastos.reduce((sum, col) => sum + (totalesGastos[col] || 0), 0);
  }, [totalesGastos, columnasGastos]);

  const cplPorEmpresaProyecto = useMemo(() => {
    const resultado = {};
    EMPRESAS.forEach(empresa => {
      const costoEmpresa = totalesGastos[empresa] || 0;
      const proyectosEmpresa = proyectosUnicos.filter(p => proyectoEmpresa[p] === empresa);
      let totalLeadsEmpresa = 0;
      proyectosEmpresa.forEach(p => {
        totalLeadsEmpresa += leadsPorProyecto[p] || 0;
      });
      proyectosEmpresa.forEach(p => {
        const leadsProyecto = leadsPorProyecto[p] || 0;
        if (leadsProyecto > 0 && costoEmpresa > 0) {
          const cpl = (costoEmpresa * (leadsProyecto / totalLeadsEmpresa)) / leadsProyecto;
          if (!resultado[empresa]) resultado[empresa] = {};
          resultado[empresa][p] = { cpl: cpl.toFixed(2), leads: leadsProyecto, costoAsignado: (costoEmpresa * (leadsProyecto / totalLeadsEmpresa)).toFixed(2) };
        } else if (leadsProyecto > 0) {
          if (!resultado[empresa]) resultado[empresa] = {};
          resultado[empresa][p] = { cpl: 0, leads: leadsProyecto, costoAsignado: 0 };
        }
      });
    });
    return resultado;
  }, [totalesGastos, proyectosUnicos, proyectoEmpresa, leadsPorProyecto]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'clics' || name === 'impresiones' || name === 'costo' || name === 'leadsGenerados' ? Number(value) || 0 : value }));
  };

  const handleGastoChange = (semanaIndex, columna, value) => {
    const numValue = Number(value) || 0;
    setGastosSemanales(prev => prev.map((s, i) => i === semanaIndex ? { ...s, [columna]: numValue } : s));
  };

  const handleProyectoEmpresaChange = (proyecto, empresa) => {
    setProyectoEmpresa(prev => ({ ...prev, [proyecto]: empresa }));
  };

  const agregarSemana = () => {
    if (gastosSemanales.length >= 5) return;
    const nuevaSemana = gastosSemanales.length + 1;
    setGastosSemanales(prev => [...prev, { semana: nuevaSemana, CAPCIM: 0, INVERSIONES: 0, CONSTRUCTORA: 0, PROYECTOS: 0 }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!periodo) return alert('Selecciona un período primero');

    const merged = { 
      ...(await getDatos(periodo).catch(() => ({}))), 
      marketing: filas,
      gastosSemanales,
      proyectoEmpresa
    };
    await guardarDatos(periodo, merged);
    onGuardado(periodo);
    setFormData({ fecha: '', canal: '', campaña: '', clics: 0, impresiones: 0, costo: 0, leadsGenerados: 0 });
    setVista('reporte');
    cargar(periodo);
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!periodo) return alert('Selecciona un período primero');

    const merged = { 
      ...(await getDatos(periodo).catch(() => ({}))), 
      marketing: filas,
      gastosSemanales 
    };
    await guardarDatos(periodo, merged);
    onGuardado(periodo);
    setFormData({ fecha: '', canal: '', campaña: '', clics: 0, impresiones: 0, costo: 0, leadsGenerados: 0 });
    setVista('reporte');
    cargar(periodo);
  };

  return (
    <div className="tab-page">
      <div className="tab-header">
        <div>
          <h1 className="tab-title">Marketing</h1>
          {periodo && <p className="tab-sub">{periodoLabel(periodo)}</p>}
        </div>
        <div className="tab-actions">
          <button className={`btn-toggle ${vista === 'reporte' ? 'active' : ''}`} onClick={() => setVista('reporte')}>Ver Dashboard</button>
          <button className={`btn-toggle ${vista === 'cargar' ? 'active' : ''}`} onClick={() => setVista('cargar')}>Ingresar Datos</button>
        </div>
      </div>

      {vista === 'cargar' && (
        <div className="section-card">
          <h2 className="section-title">Gastos Semanales</h2>
          {periodo && <p className="tab-sub">Período: <strong>{periodoLabel(periodo)}</strong></p>}
          
          <div className="column-selector">
            <label>Columnas a mostrar:</label>
            <div className="column-checkboxes">
              {COLUMNAS_GASTOS_BASE.map(col => (
                <label key={col} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={columnasVisibles.includes(col)}
                    onChange={(e) => setColumnasVisibles(prev => e.target.checked 
                      ? [...prev, col] 
                      : prev.filter(c => c !== col)
                    )}
                  />
                  {col}
                </label>
              ))}
            </div>
          </div>
          
          <div className="gastos-table-container">
            <table className="gastos-table">
              <thead>
                <tr>
                  <th>Semana</th>
                  {columnasGastos.map(col => <th key={col}>{col} (S/)</th>)}
                  <th>Total Semana</th>
                </tr>
              </thead>
              <tbody>
                {gastosSemanales.map((semana, idx) => {
                  const totalSemana = columnasGastos.reduce((sum, col) => sum + (Number(semana[col]) || 0), 0);
                  return (
                    <tr key={idx}>
                      <td><strong>Semana {semana.semana}</strong></td>
                      {columnasGastos.map(col => (
                        <td key={col}>
                          <input
                            type="number"
                            value={semana[col] || ''}
                            onChange={(e) => handleGastoChange(idx, col, e.target.value)}
                            min="0"
                            step="0.01"
                            className="gasto-input"
                            disabled={col === 'CAPCIM' ? false : !columnasVisibles.includes(col)}
                          />
                        </td>
                      ))}
                      <td className="total-semana">S/ {totalSemana.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td><strong>TOTAL</strong></td>
                  {columnasGastos.map(col => (
                    <td key={col} className="total-columna"><strong>S/ {(totalesGastos[col] || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                  ))}
                  <td className="total-general"><strong>S/ {totalGeneralGastos.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={agregarSemana}
              disabled={gastosSemanales.length >= 5}
              title={gastosSemanales.length >= 5 ? 'Máximo 5 semanas permitidas' : ''}
            >
              {gastosSemanales.length >= 5 ? 'Máx. 5 semanas' : '+ Agregar Semana'}
            </button>
            <button type="button" className="btn-primary" onClick={handleSubmit}>Guardar Gastos Semanales</button>
            <button type="button" className="btn-secondary" onClick={() => setVista('reporte')}>Cancelar</button>
          </div>
        </div>
      )}

      {vista === 'cargar' && proyectosUnicos.length > 0 && (
        <div className="section-card">
          <h2 className="section-title">Asignar Proyectos a Empresas</h2>
          <p className="section-sub">Selecciona a qué empresa pertenece cada proyecto para calcular CPL por empresa</p>
          <div className="proyecto-empresa-grid">
            {proyectosUnicos.map(proyecto => (
              <div key={proyecto} className="proyecto-empresa-item">
                <label>{proyecto}</label>
                <select
                  value={proyectoEmpresa[proyecto] || ''}
                  onChange={(e) => handleProyectoEmpresaChange(proyecto, e.target.value)}
                  className="empresa-select"
                >
                  <option value="">-- Seleccionar empresa --</option>
                  {EMPRESAS.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                </select>
                <span className="leads-count">({leadsPorProyecto[proyecto] || 0} leads)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {vista === 'reporte' && loading && <p className="loading-msg">Cargando datos...</p>}

      {vista === 'reporte' && !loading && filas.length === 0 && gastosSemanales.every(s => columnasGastos.every(c => !s[c] || s[c] === 0)) && (
        <div className="empty-state">
          <p>No hay datos de marketing para este período.</p>
          <button className="btn-primary" onClick={() => setVista('cargar')}>Ingresar primer registro</button>
        </div>
      )}

      {vista === 'reporte' && (filas.length > 0 || gastosSemanales.some(s => columnasGastos.some(c => s[c] > 0))) && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Total Clics" value={totalClics.toLocaleString()} color="var(--azul)" />
            <KpiCard label="Total Impresiones" value={totalImpresiones.toLocaleString()} sub={`CTR: ${ctrGlobal}%`} color="#6B7280" />
            <KpiCard label="Costo Total Campañas" value={`S/ ${totalCosto.toLocaleString()}`} color="var(--naranja)" />
            <KpiCard label="Leads Generados" value={totalLeads} sub={`CPL: S/ ${cplGlobal}`} color="var(--verde)" />
            <KpiCard label="Total Gastos Semanales" value={`S/ ${totalGeneralGastos.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} color="#7C3AED" />
          </div>

          <div className="graficos-grid">
            <Grafico titulo="Clics por Canal" datos={porCanal} />
            <Grafico titulo="Leads por Canal" datos={leadsPorCanal} />
            <Grafico titulo="Costo por Canal" datos={costoPorCanal} />
            <Grafico titulo="Campañas" datos={porCampaña} />
          </div>

          <div className="section-card">
            <h2 className="section-title">Gastos Semanales</h2>
            <div className="gastos-table-container">
              <table className="gastos-table">
                <thead>
                  <tr>
                    <th>Semana</th>
                    {columnasGastos.map(col => <th key={col}>{col} (S/)</th>)}
                    <th>Total Semana</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosSemanales.map((semana, idx) => {
                    const totalSemana = columnasGastos.reduce((sum, col) => sum + (Number(semana[col]) || 0), 0);
                    return (
                      <tr key={idx}>
                        <td><strong>Semana {semana.semana}</strong></td>
                        {columnasGastos.map(col => (
                          <td key={col}>S/ {(Number(semana[col]) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        ))}
                        <td className="total-semana"><strong>S/ {totalSemana.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>TOTAL</strong></td>
                    {columnasGastos.map(col => (
                      <td key={col} className="total-columna"><strong>S/ {(totalesGastos[col] || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                    ))}
                    <td className="total-general"><strong>S/ {totalGeneralGastos.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {proyectosUnicos.length > 0 && (
            <div className="section-card">
              <h2 className="section-title">CPL por Empresa y Proyecto</h2>
              <p className="section-sub">Costo Por Lead calculado distribuyendo el gasto semanal de cada empresa entre sus proyectos asignados</p>
              <div className="tabla-scroll-simple">
                <table className="resumen-tabla cpl-table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Proyecto</th>
                      <th>Leads</th>
                      <th>Costo Asignado (S/)</th>
                      <th>CPL (S/)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EMPRESAS.map(empresa => {
                      const proyectosEmpresa = proyectosUnicos.filter(p => proyectoEmpresa[p] === empresa);
                      if (proyectosEmpresa.length === 0) return null;
                      return proyectosEmpresa.map(proyecto => {
                        const data = cplPorEmpresaProyecto[empresa]?.[proyecto];
                        if (!data) return null;
                        return (
                          <tr key={`${empresa}-${proyecto}`}>
                            <td><strong>{empresa}</strong></td>
                            <td>{proyecto}</td>
                            <td>{data.leads}</td>
                            <td>S/ {Number(data.costoAsignado).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td><strong>S/ {Number(data.cpl).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                          </tr>
                        );
                      });
                    })}
                    {EMPRESAS.every(emp => !proyectosUnicos.some(p => proyectoEmpresa[p] === emp)) && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--gris-texto)' }}>No hay proyectos asignados a empresas. Ve a "Ingresar Datos" para asignarlos.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filas.length > 0 && (
            <div className="section-card">
              <h2 className="section-title">Detalle de Campañas</h2>
              <div className="tabla-scroll-simple">
                <table className="resumen-tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Canal</th>
                      <th>Campaña</th>
                      <th>Clics</th>
                      <th>Impresiones</th>
                      <th>CTR %</th>
                      <th>Costo (S/)</th>
                      <th>Leads</th>
                      <th>CPL (S/)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((r, i) => (
                      <tr key={i}>
                        <td>{r.Fecha || r.fecha || ''}</td>
                        <td>{r.Canal || r.canal || ''}</td>
                        <td>{r.Campaña || r.campaña || ''}</td>
                        <td>{Number(r.Clics || r.clics || 0).toLocaleString()}</td>
                        <td>{Number(r.Impresiones || r.impresiones || 0).toLocaleString()}</td>
                        <td>{r.CTR || r.ctr || (r.impresiones > 0 ? ((r.clics / r.impresiones) * 100).toFixed(2) : 0)}%</td>
                        <td>S/ {Number(r.Costo || r.costo || 0).toFixed(2)}</td>
                        <td>{Number(r['Leads Generados'] || r.leadsGenerados || 0)}</td>
                        <td>S/ {r.CPL || r.cpl || (r.leadsGenerados > 0 ? (r.costo / r.leadsGenerados).toFixed(2) : 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
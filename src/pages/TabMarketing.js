import React, { useEffect, useState, useMemo } from 'react';
import { getDatos, guardarDatos } from '../utils/api';
import '../components/UploadCSV.css';
import './Tab.css';
import { extraerProyecto } from '../utils/csvParser';
import KpiCard from '../components/KpiCard';
import './Tab.css';

const EMPRESA_LOTES = ['INVERSIONES', 'CONSTRUCTORA', 'PROYECTOS'];
const PROYECTOS_CAPCIM = ['RIO HORIZONTE', 'RIO HORIZONTE - ÚNICA'];

const GASTOS_VACIO = (semanas = 4, empresas = []) =>
  Array.from({ length: semanas }, (_, i) => ({
    semana: i + 1,
    ...Object.fromEntries(empresas.map(e => [e, 0])),
  }));

const fmt = (n) =>
  Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TabMarketing({ periodo, periodoLabel, onGuardado }) {
  const [vista, setVista] = useState('reporte');
  const [loading, setLoading] = useState(false);
  const [leadsData, setLeadsData] = useState([]);
  const [guardado, setGuardado] = useState(false);
  const [ventasData, setVentasData] = useState([]);

  // Configuración
  const [empresaLotesActiva, setEmpresaLotesActiva] = useState('INVERSIONES');
  const [empresasSeleccionadas, setEmpresasSeleccionadas] = useState(['CAPCIM', 'INVERSIONES']);
  const [proyectosExcluidos, setProyectosExcluidos] = useState([]);
  const [gastosSemanales, setGastosSemanales] = useState([]);
  const [periodoInput, setPeriodoInput] = useState(periodo || '');


  const cargar = (p) => {
    if (!p) return;
    setLoading(true);
    getDatos(p)
      .then(d => {
        setLeadsData(d.leads || []);
        setVentasData(d.ventas || []);
        
        const empSel = d.empresasSeleccionadas || ['CAPCIM', 'INVERSIONES'];
        setEmpresasSeleccionadas(empSel);
        setEmpresaLotesActiva(d.empresaLotesActiva || 'INVERSIONES');
        setProyectosExcluidos(d.proyectosExcluidos || []);
        const gs = d.gastosMarketing;
        setGastosSemanales(gs && gs.length ? gs : GASTOS_VACIO(4, empSel));
        setGuardado(!!gs);
        setLoading(false);
      })
      .catch(() => {
        setLeadsData([]);
        setGastosSemanales(GASTOS_VACIO(4, ['CAPCIM', 'INVERSIONES']));
        setGuardado(false);
        setLoading(false);
      });
  };

  useEffect(() => { cargar(periodo); }, [periodo]);
    useEffect(() => { setPeriodoInput(periodo || ''); }, [periodo]);

  // Cuando cambian las empresas seleccionadas, reconstruir gastos manteniendo valores
  const handleEmpresaToggle = (emp) => {
    setEmpresasSeleccionadas(prev => {
      const next = prev.includes(emp) ? prev.filter(e => e !== emp) : [...prev, e => e, emp].filter((e, i, a) => a.indexOf(e) === i);
      // reconstruir filas conservando valores
      setGastosSemanales(gs =>
        gs.map(s => ({
          semana: s.semana,
          ...Object.fromEntries(next.map(e => [e, s[e] || 0])),
        }))
      );
      return next;
    });
    // si se selecciona una empresa de lotes, activarla
    if (EMPRESA_LOTES.includes(emp)) setEmpresaLotesActiva(emp);
  };

  // Proyectos del CSV
  const todosProyectos = useMemo(() => {
    const set = new Set();
    leadsData.forEach(r => {
      const raw = r['Proyectos de Interes'] || r['Proyectos de Interés'] || '';
      const base = extraerProyecto(raw);
      if (base && base !== 'Sin proyecto') set.add(base);
    });
    return Array.from(set).sort();
  }, [leadsData]);
  const proyectosCapcim = useMemo(() =>
    todosProyectos.filter(p => PROYECTOS_CAPCIM.includes(p.toUpperCase())),
    [todosProyectos]
  );

  const proyectosLotes = useMemo(() =>
    todosProyectos.filter(p => !PROYECTOS_CAPCIM.includes(p.toUpperCase())),
    [todosProyectos]
  );


  const proyectosLotesActivos = useMemo(() =>
    proyectosLotes.filter(p => !proyectosExcluidos.includes(p)),
    [proyectosLotes, proyectosExcluidos]);

  const leadsPorProyecto = useMemo(() => {
    const acc = {};
    leadsData.forEach(r => {
      const raw = r['Proyectos de Interes'] || r['Proyectos de Interés'] || '';
      const base = extraerProyecto(raw);
      if (base && base !== 'Sin proyecto') acc[base] = (acc[base] || 0) + 1;
    });
    return acc;
  }, [leadsData]);

  // Totales
  const totalPorEmpresa = useMemo(() => {
    const acc = {};
    empresasSeleccionadas.forEach(e => {
      acc[e] = gastosSemanales.reduce((s, r) => s + (Number(r[e]) || 0), 0);
    });
    return acc;
  }, [gastosSemanales, empresasSeleccionadas]);

  const totalGeneral = Object.values(totalPorEmpresa).reduce((s, v) => s + v, 0);


  const totalCapcim = totalPorEmpresa['CAPCIM'] || 0;

  const empresasLotesActivas = useMemo(() =>
    empresasSeleccionadas.filter(e => EMPRESA_LOTES.includes(e)),
    [empresasSeleccionadas]
  );

  const totalLotes = useMemo(() =>
    empresasLotesActivas.reduce((s, e) => s + (totalPorEmpresa[e] || 0), 0),
    [empresasLotesActivas, totalPorEmpresa]
  );
  

  const leadsLotesTotal = proyectosLotesActivos.reduce((s, p) => s + (leadsPorProyecto[p] || 0), 0);
  const cplLotes = leadsLotesTotal > 0 ? totalLotes / leadsLotesTotal : 0;

// ← AGREGA ESTAS DOS LÍNEAS AQUÍ
  const leadsCapcim = proyectosCapcim.reduce((s, p) => s + (leadsPorProyecto[p] || 0), 0);
  const cplCapcim = leadsCapcim > 0 ? totalCapcim / leadsCapcim : 0;

  // ── CAC ──
  const parseMonto = (str) => {
    if (!str) return 0;
    return parseFloat(String(str).replace(/[^0-9.]/g, '')) || 0;
  };

  const ventasVendidas = useMemo(() =>
    ventasData.filter(v => v['Estado lote'] === 'VENDIDO'),
    [ventasData]
  );

  const extraerProyectoVenta = (lote = '') => {
    const u = lote.toUpperCase();
    if (u.includes('RIO HORIZONTE') || u.includes('HORIZONTE')) return 'CAPCIM';
    return 'LOTES';
  };

  const ventasCapcim = useMemo(() =>
    ventasVendidas.filter(v => extraerProyectoVenta(v['Lote']) === 'CAPCIM').length,
    [ventasVendidas]
  );

  const ventasLotes = useMemo(() =>
    ventasVendidas.filter(v => extraerProyectoVenta(v['Lote']) === 'LOTES').length,
    [ventasVendidas]
  );

  const montoVentasCapcim = useMemo(() =>
    ventasVendidas
      .filter(v => extraerProyectoVenta(v['Lote']) === 'CAPCIM')
      .reduce((s, v) => s + parseMonto(v['Monto Total']), 0),
    [ventasVendidas]
  );

  const montoVentasLotes = useMemo(() =>
    ventasVendidas
      .filter(v => extraerProyectoVenta(v['Lote']) === 'LOTES')
      .reduce((s, v) => s + parseMonto(v['Monto Total']), 0),
    [ventasVendidas]
  );

  const cacCapcim = ventasCapcim > 0 ? totalCapcim / ventasCapcim : 0;
  const cacLotes = ventasLotes > 0 ? totalLotes / ventasLotes : 0;

  const roiCapcim = totalCapcim > 0 ? montoVentasCapcim / totalCapcim : 0;
  const roiLotes = totalLotes > 0 ? montoVentasLotes / totalLotes : 0;

  const tasaConvCapcim = leadsCapcim > 0 ? (ventasCapcim / leadsCapcim) * 100 : 0;
  const tasaConvLotes = leadsLotesTotal > 0 ? (ventasLotes / leadsLotesTotal) * 100 : 0;


  const cplPorProyecto = useMemo(() => {
    const result = {};
    proyectosCapcim.forEach(p => {
      const leads = leadsPorProyecto[p] || 0;
      const prop = leadsCapcim > 0 ? leads / leadsCapcim : 0;
      result[p] = { leads, costo: totalCapcim * prop, cpl: leads > 0 ? (totalCapcim * prop) / leads : 0 };
    });
    proyectosLotesActivos.forEach(p => {
      const leads = leadsPorProyecto[p] || 0;
      const prop = leadsLotesTotal > 0 ? leads / leadsLotesTotal : 0;
      result[p] = { leads, costo: totalLotes * prop, cpl: leads > 0 ? (totalLotes * prop) / leads : 0 };
    });
    return result;
  }, [proyectosCapcim, proyectosLotesActivos, leadsPorProyecto, leadsCapcim, leadsLotesTotal, totalCapcim, totalLotes]);

  const handleGastoChange = (idx, col, val) => {
    setGastosSemanales(prev => prev.map((s, i) => i === idx ? { ...s, [col]: Number(val) || 0 } : s));
  };

  const agregarSemana = () => {
    if (gastosSemanales.length >= 5) return;
    setGastosSemanales(prev => [...prev, {
      semana: prev.length + 1,
      ...Object.fromEntries(empresasSeleccionadas.map(e => [e, 0])),
    }]);
  };

  const handleGuardar = async () => {
    if (!periodoInput) return alert('Selecciona un período primero');
    const existing = await getDatos(periodoInput).catch(() => ({}));
    await guardarDatos(periodoInput, {
      ...existing,
      gastosMarketing: gastosSemanales,
      empresasSeleccionadas,
      empresaLotesActiva,
      proyectosExcluidos,
    });
    onGuardado(periodoInput);
    setGuardado(true);
    setVista('reporte');
    cargar(periodoInput);
  };

  return (
    <div className="tab-page">

      {/* CABECERA igual que demás pestañas */}
      <div className="tab-header">
        <div>
          <h1 className="tab-title">Marketing</h1>
          {periodo && <p className="tab-sub">{periodoLabel(periodo)}</p>}
        </div>
        <div className="tab-actions">
          <button className={`btn-toggle ${vista === 'reporte' ? 'active' : ''}`} onClick={() => setVista('reporte')}>Ver reporte</button>
          <button className={`btn-toggle ${vista === 'cargar' ? 'active' : ''}`} onClick={() => setVista('cargar')}>Ingresar datos</button>
        </div>
      </div>

          {/* ── FORMULARIO ── */}
      {vista === 'cargar' && (
        <>
             {/* Período */}
          <div className="section-card">
            <h2 className="section-title">Gastos de Marketing</h2>
            <div className="upload-periodo-row">
              <label>Período:</label>
              <input
                type="month"
                className="input-month"
                value={periodoInput}
                onChange={e => setPeriodoInput(e.target.value)}
              />
              <span className="upload-hint">
                Selecciona el mes al que corresponden estos gastos
              </span>
            </div>
          </div>

          {/* Paso 1: seleccionar empresas */}
          <div className="section-card">
            <h2 className="section-title">Paso 1 — Selecciona las empresas activas este mes</h2>
            <p className="section-sub">Las columnas de la tabla de gastos se formarán según tu selección. Solo una empresa de lotes puede estar activa.</p>
            <div className="mk-empresas-row">
              {/* CAPCIM siempre disponible */}
              <label className="mk-empresa-check capcim">
                <input
                  type="checkbox"
                  checked={empresasSeleccionadas.includes('CAPCIM')}
                  onChange={() => handleEmpresaToggle('CAPCIM')}
                />
                <span className="mk-empresa-nombre">CAPCIM</span>
                <span className="mk-empresa-tipo">Departamentos</span>
              </label>

              {/* Separador */}
              <div className="mk-separador">|</div>

              {/* Empresas de lotes — solo una activa */}
              {EMPRESA_LOTES.map(emp => (
                <label key={emp} className={`mk-empresa-check lotes ${empresasSeleccionadas.includes(emp) ? 'activa' : ''}`}>
                  <input
                    type="checkbox"
                    checked={empresasSeleccionadas.includes(emp)}
                    onChange={() => {
                      setEmpresasSeleccionadas(prev => {
                        const next = prev.includes(emp)
                          ? prev.filter(e => e !== emp)
                          : [...prev, emp];
                        // reconstruir gastos con nuevas columnas
                        setGastosSemanales(gs =>
                          gs.map(s => ({
                            semana: s.semana,
                            ...Object.fromEntries(next.map(e => [e, s[e] || 0])),
                          }))
                        );
                        return next;
                      });
                    }}
                  />
                  <span className="mk-empresa-nombre">{emp}</span>
                  <span className="mk-empresa-tipo">Lotes</span>
                </label>
              ))}
            </div>
          </div>

          {/* Paso 3: tabla de gastos */}
          {empresasSeleccionadas.length > 0 && (
            <div className="section-card">
              <h2 className="section-title">Paso 2 — Ingresa los gastos semanales ($)</h2>
              <div className="gastos-table-container">
                <table className="gastos-table">
                  <thead>
                    <tr>
                      <th>Semana</th>
                      {empresasSeleccionadas.includes('CAPCIM') && <th>CAPCIM</th>}
                      {empresasSeleccionadas.filter(e => EMPRESA_LOTES.includes(e)).map(e => (
                        <th key={e}>{e}</th>
                      ))}
                      <th>Total semana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastosSemanales.map((semana, idx) => {
                      const total = empresasSeleccionadas.reduce((s, e) => s + (Number(semana[e]) || 0), 0);
                      return (
                        <tr key={idx}>
                          <td><strong>Semana {semana.semana}</strong></td>
                          {empresasSeleccionadas.includes('CAPCIM') && (
                            <td>
                              <input type="number" className="gasto-input" min="0" step="0.01"
                                value={semana.CAPCIM || ''}
                                onChange={e => handleGastoChange(idx, 'CAPCIM', e.target.value)} />
                            </td>
                          )}
                          {empresasSeleccionadas.filter(e => EMPRESA_LOTES.includes(e)).map(e => (
                            <td key={e}>
                              <input type="number" className="gasto-input" min="0" step="0.01"
                                value={semana[e] || ''}
                                onChange={ev => handleGastoChange(idx, e, ev.target.value)} />
                            </td>
                          ))}
                          <td className="total-semana">$ {fmt(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>TOTAL</strong></td>
                      {empresasSeleccionadas.includes('CAPCIM') && (
                        <td className="total-columna"><strong>$ {fmt(totalCapcim)}</strong></td>
                      )}
                      {empresasSeleccionadas.filter(e => EMPRESA_LOTES.includes(e)).map(e => (
                        <td key={e} className="total-columna"><strong>$ {fmt(totalPorEmpresa[e] || 0)}</strong></td>
                      ))}
                      <td className="total-general"><strong>$ {fmt(totalGeneral)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={agregarSemana} disabled={gastosSemanales.length >= 5}>
                  {gastosSemanales.length >= 5 ? 'Máx. 5 semanas' : '+ Agregar semana'}
                </button>
                <button type="button" className="btn-primary" onClick={handleGuardar}>Guardar</button>
                <button type="button" className="btn-secondary" onClick={() => setVista('reporte')}>Cancelar</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── REPORTE ── */}
      {vista === 'reporte' && loading && <p className="loading-msg">Cargando datos...</p>}

      {vista === 'reporte' && !loading && !guardado && (
        <div className="empty-state">
          <p>No hay datos de marketing para este período.</p>
          <button className="btn-primary" onClick={() => setVista('cargar')}>Ingresar datos</button>
        </div>
      )}

      {vista === 'reporte' && guardado && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Inversión Total" value={`$ ${fmt(totalGeneral)}`} color="var(--naranja)" />
            <KpiCard label="Gasto CAPCIM" value={`$ ${fmt(totalCapcim)}`} sub="Departamentos" color="#0891B2" />
            <KpiCard label="Gasto Lotes" value={`$ ${fmt(totalLotes)}`} sub={empresasLotesActivas.join(' + ') || '—'} color="#7C3AED" />
            <KpiCard label="CPL CAPCIM" value={cplCapcim > 0 ? `$ ${fmt(cplCapcim)}` : '—'} sub={`${leadsCapcim} leads`} color="#0891B2" />
            <KpiCard label="CPL Lotes" value={cplLotes > 0 ? `$ ${fmt(cplLotes)}` : '—'} sub={`${leadsLotesTotal} leads`} color="#7C3AED" />
            <KpiCard label="CAC CAPCIM" value={cacCapcim > 0 ? `$ ${fmt(cacCapcim)}` : '—'} sub={`${ventasCapcim} ventas`} color="#0891B2" />
            <KpiCard label="CAC Lotes" value={cacLotes > 0 ? `$ ${fmt(cacLotes)}` : '—'} sub={`${ventasLotes} ventas`} color="#7C3AED" />
            <KpiCard label="ROI CAPCIM" value={roiCapcim > 0 ? `${fmt(roiCapcim)}x` : '—'} sub={`S/ ${fmt(montoVentasCapcim)} vendido`} color="#059669" />
            <KpiCard label="ROI Lotes" value={roiLotes > 0 ? `${fmt(roiLotes)}x` : '—'} sub={`S/ ${fmt(montoVentasLotes)} vendido`} color="#059669" />
          </div>

          {ventasData.length > 0 && (
          <div className="mk-cpl-grid" style={{ marginBottom: 0 }}>
            <div className="section-card">
              <div className="mk-seccion-header departamentos">
                <span>EMBUDO CAPCIM</span>
                <span className="mk-empresa-badge">CAPCIM</span>
              </div>
              <table className="resumen-tabla" style={{ marginTop: 10 }}>
                <thead><tr><th>Etapa</th><th>Cantidad</th><th>Conversión</th></tr></thead>
                <tbody>
                  <tr><td>Leads</td><td>{leadsCapcim}</td><td>—</td></tr>
                  <tr><td>Ventas cerradas</td><td>{ventasCapcim}</td><td><strong>{fmt(tasaConvCapcim)}%</strong></td></tr>
                  <tr><td>Monto vendido</td><td colSpan="2"><strong>S/ {fmt(montoVentasCapcim)}</strong></td></tr>
                </tbody>
              </table>
            </div>

            <div className="section-card">
              <div className="mk-seccion-header lotes">
                <span>EMBUDO LOTES</span>
                <span className="mk-empresa-badge">{empresasLotesActivas.join(' + ') || '—'}</span>
              </div>
              <table className="resumen-tabla" style={{ marginTop: 10 }}>
                <thead><tr><th>Etapa</th><th>Cantidad</th><th>Conversión</th></tr></thead>
                <tbody>
                  <tr><td>Leads</td><td>{leadsLotesTotal}</td><td>—</td></tr>
                  <tr><td>Ventas cerradas</td><td>{ventasLotes}</td><td><strong>{fmt(tasaConvLotes)}%</strong></td></tr>
                  <tr><td>Monto vendido</td><td colSpan="2"><strong>S/ {fmt(montoVentasLotes)}</strong></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

          {/* Gastos semanales readonly */}
          <div className="section-card">
            <h2 className="section-title">Gastos Semanales — {periodoLabel(periodo)}</h2>
            <div className="gastos-table-container">
              <table className="gastos-table">
                <thead>
                  <tr>
                    <th>Semana</th>
                    {empresasSeleccionadas.includes('CAPCIM') && <th>CAPCIM (USD)</th>}
                    {empresasSeleccionadas.filter(e => EMPRESA_LOTES.includes(e)).map(e => <th key={e}>{e} (USD)</th>)}
                    <th>Total Semana</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosSemanales.map((s, i) => {
                    const total = empresasSeleccionadas.reduce((sum, e) => sum + (Number(s[e]) || 0), 0);
                    return (
                      <tr key={i}>
                        <td><strong>Semana {s.semana}</strong></td>
                        {empresasSeleccionadas.includes('CAPCIM') && <td>$ {fmt(s.CAPCIM)}</td>}
                        {empresasSeleccionadas.filter(e => EMPRESA_LOTES.includes(e)).map(e => <td key={e}>$ {fmt(s[e])}</td>)}
                        <td className="total-semana"><strong>$ {fmt(total)}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>TOTAL</strong></td>
                    {empresasSeleccionadas.includes('CAPCIM') && <td className="total-columna"><strong>$ {fmt(totalCapcim)}</strong></td>}
                    {empresasSeleccionadas.filter(e => EMPRESA_LOTES.includes(e)).map(e => <td key={e} className="total-columna"><strong>$ {fmt(totalPorEmpresa[e] || 0)}</strong></td>)}
                    <td className="total-general"><strong>$ {fmt(totalGeneral)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* CPL por proyecto */}
          {leadsData.length > 0 && (
            <div className="mk-cpl-grid">
              <div className="section-card">
                <div className="mk-seccion-header departamentos">
                  <span>DEPARTAMENTOS (resumen)</span>
                  <span className="mk-empresa-badge">CAPCIM</span>
                </div>
                <table className="resumen-tabla" style={{ marginTop: 10 }}>
                  <thead><tr><th>Proyecto</th><th>Leads</th><th>Costo ($)</th><th>CPL ($)</th></tr></thead>
                  <tbody>
                    {proyectosCapcim.length === 0
                      ? <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--gris-texto)' }}>Sin leads de RIO HORIZONTE cargados</td></tr>
                      : proyectosCapcim.map(p => {
                          const d = cplPorProyecto[p];
                          return <tr key={p}><td>{p}</td><td>{d?.leads || 0}</td><td>$ {fmt(d?.costo)}</td><td><strong>$ {fmt(d?.cpl)}</strong></td></tr>;
                        })
                    }
                    <tr className="fila-total">
                      <td><strong>Total CAPCIM</strong></td>
                      <td><strong>{leadsCapcim}</strong></td>
                      <td><strong>$ {fmt(totalCapcim)}</strong></td>
                      <td><strong>$ {fmt(cplCapcim)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="section-card">
                <div className="mk-seccion-header lotes">
                  <span>LOTES</span>
                  <span className="mk-empresa-badge">{empresasLotesActivas.join(' + ') || '—'}</span>
                </div>
                <table className="resumen-tabla" style={{ marginTop: 10 }}>
                  <thead><tr><th>Proyecto</th><th>Leads</th><th>Costo ($)</th><th>CPL ($)</th></tr></thead>
                  <tbody>
                    {proyectosLotesActivos.length === 0
                      ? <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--gris-texto)' }}>Sin proyectos activos</td></tr>
                      : proyectosLotesActivos.map(p => {
                          const d = cplPorProyecto[p];
                          return <tr key={p}><td>{p}</td><td>{d?.leads || 0}</td><td>$ {fmt(d?.costo)}</td><td><strong>$ {fmt(d?.cpl)}</strong></td></tr>;
                        })
                    }
                    <tr className="fila-total">
                      <td><strong>Total {empresaLotesActiva}</strong></td>
                      <td><strong>{leadsLotesTotal}</strong></td>
                      <td><strong>$ {fmt(totalLotes)}</strong></td>
                      <td><strong>$ {fmt(cplLotes)}</strong></td>
                    </tr>
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

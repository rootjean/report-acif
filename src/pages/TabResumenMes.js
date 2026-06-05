import React, { useEffect, useState, useMemo } from 'react';
import { getDatos } from '../utils/api';
import { extraerProyecto } from '../utils/csvParser';
import KpiCard from '../components/KpiCard';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend
} from 'recharts';
import './Tab.css';
import './TabResumenMes.css';

const parseMonto = (str) => parseFloat(String(str || '').replace(/[^0-9.]/g, '')) || 0;
const fmt = (n) => Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n) => `${Number(n || 0).toFixed(1)}%`;
const COLORES = ['#E8620A', '#F97316', '#16A34A', '#2563EB', '#7C3AED', '#0891B2', '#DC2626'];
const PROYECTOS_CAPCIM_KEY = ['RIO HORIZONTE', 'HORIZONTE'];

// Componente reutilizable: tarjeta con toggle Gráfico/Cuadro
function IndCard({ titulo, children, grafico, cuadro }) {
  const [modo, setModo] = useState('grafico');
  return (
    <div className="ind-card">
      <div className="ind-card-header">
        <span className="ind-card-titulo">{titulo}</span>
        <div className="ind-card-tabs">
          <button className={modo === 'grafico' ? 'active' : ''} onClick={() => setModo('grafico')}>Gráfico</button>
          <button className={modo === 'cuadro' ? 'active' : ''} onClick={() => setModo('cuadro')}>Cuadro</button>
        </div>
      </div>
      <div className="ind-card-body">
        {modo === 'grafico' ? grafico : cuadro}
      </div>
    </div>
  );
}

export default function TabResumenMes({ periodo, periodoLabel }) {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [opors, setOpors] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [marketing, setMarketing] = useState({ gastosMarketing: [], empresasSeleccionadas: [], empresaLotesActiva: '' });

  useEffect(() => {
    if (!periodo) return;
    setLoading(true);
    getDatos(periodo).then(d => {
      setLeads(d.leads || []);
      setOpors(d.oportunidades || []);
      setVentas(d.ventas || []);
      setMarketing({
        gastosMarketing: d.gastosMarketing || [],
        empresasSeleccionadas: d.empresasSeleccionadas || [],
        empresaLotesActiva: d.empresaLotesActiva || '',
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [periodo]);

  // ── CAPTACIÓN ──
  const totalLeads = leads.length;
  const leadsPorAsesor = useMemo(() => {
    const acc = {};
    leads.forEach(r => { const k = r.Asesor || 'Sin asesor'; acc[k] = (acc[k] || 0) + 1; });
    return Object.entries(acc).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
  }, [leads]);

  const leadsPorCanal = useMemo(() => {
    const acc = {};
    leads.forEach(r => { const k = r['Medio Contacto'] || 'Sin canal'; acc[k] = (acc[k] || 0) + 1; });
    return Object.entries(acc).map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
  }, [leads]);

  // ── EMBUDO ──
  const totalOpors = opors.length;
  const separaciones = opors.filter(r => (r.Estado || '').toUpperCase() === 'SEPARACION').length;
  const ventasVendidas = ventas.filter(v => (v['Estado lote'] || '').toUpperCase() === 'VENDIDO');
  const totalVentas = ventasVendidas.length;

  const tasaLeadOpor = totalLeads > 0 ? (totalOpors / totalLeads) * 100 : 0;
  const tasaOporVenta = totalOpors > 0 ? (totalVentas / totalOpors) * 100 : 0;
  const tasaLeadVenta = totalLeads > 0 ? (totalVentas / totalLeads) * 100 : 0;

  const embudo = [
    { nombre: 'Leads', cantidad: totalLeads },
    { nombre: 'Oportunidades', cantidad: totalOpors },
    { nombre: 'Separaciones', cantidad: separaciones },
    { nombre: 'Ventas', cantidad: totalVentas },
  ];

  // ── RENDIMIENTO POR CANAL ──
  const canalStats = useMemo(() => {
    const acc = {};
    leads.forEach(r => {
      const k = r['Medio Contacto'] || 'Sin canal';
      if (!acc[k]) acc[k] = { nombre: k, leads: 0, opors: 0, ventas: 0 };
      acc[k].leads++;
    });
    opors.forEach(r => {
      const k = r.Contacto || 'Sin canal';
      if (acc[k]) acc[k].opors++;
    });
    ventasVendidas.forEach(v => {
      // no hay canal directo en ventas, omitir
    });
    return Object.values(acc).map(c => ({
      ...c,
      conversion: c.leads > 0 ? ((c.opors / c.leads) * 100).toFixed(1) + '%' : '0%',
    }));
  }, [leads, opors, ventasVendidas]);

  // ── DESEMPEÑO POR PROYECTO ──
  const proyectoStats = useMemo(() => {
    const acc = {};
    leads.forEach(r => {
      const p = extraerProyecto(r['Proyectos de Interes'] || r['Proyectos de Interés'] || '');
      if (p && p !== 'Sin proyecto') {
        if (!acc[p]) acc[p] = { nombre: p, leads: 0, opors: 0, ventas: 0, monto: 0 };
        acc[p].leads++;
      }
    });
    opors.forEach(r => {
      const p = extraerProyecto(r['Proyectos de Interes'] || r['Lote'] || '');
      if (acc[p]) acc[p].opors++;
    });
    ventas.forEach(v => {
      const p = extraerProyecto(v['Lote'] || '');
      if (acc[p]) {
        acc[p].ventas++;
        acc[p].monto += parseMonto(v['Monto Total']);
      }
    });
    return Object.values(acc).sort((a, b) => b.leads - a.leads);
  }, [leads, opors, ventas]);

  // ── RANKING ASESORES ──
  const asesorStats = useMemo(() => {
    const acc = {};
    leads.forEach(r => {
      const k = r.Asesor || 'Sin asesor';
      if (!acc[k]) acc[k] = { nombre: k, leads: 0, opors: 0, ventas: 0, monto: 0 };
      acc[k].leads++;
    });
    opors.forEach(r => {
      const k = r.Asesor || 'Sin asesor';
      if (!acc[k]) acc[k] = { nombre: k, leads: 0, opors: 0, ventas: 0, monto: 0 };
      acc[k].opors++;
    });
    ventas.forEach(v => {
      const k = v.Asesor || 'Sin asesor';
      if (!acc[k]) acc[k] = { nombre: k, leads: 0, opors: 0, ventas: 0, monto: 0 };
      acc[k].ventas++;
      acc[k].monto += parseMonto(v['Monto Total']);
    });
    return Object.values(acc).sort((a, b) => b.monto - a.monto);
  }, [leads, opors, ventas]);

  // ── VENTAS ──
  const montoTotal = ventasVendidas.reduce((s, v) => s + parseMonto(v['Monto Total']), 0);
  const ventasPorTipo = useMemo(() => {
    const acc = {};
    ventas.forEach(v => { const k = v.Venta || 'Sin tipo'; acc[k] = (acc[k] || 0) + 1; });
    return Object.entries(acc).map(([nombre, cantidad]) => ({ nombre, cantidad }));
  }, [ventas]);

  const montoRecaudado = ventasVendidas.reduce((s, v) => s + parseMonto(v['Total Inicial']), 0);
  const montoRestante = ventasVendidas.reduce((s, v) => s + parseMonto(v['Monto Restante']), 0);

  // ── SEPARACIONES ──
  const sepPendientes = opors.filter(r => (r.Estado || '').toUpperCase() === 'SEPARACION').length;
  const enProceso = opors.filter(r => (r.Estado || '').toUpperCase() === 'EN PROCESO').length;

  // ── MARKETING ──
  const { gastosMarketing, empresasSeleccionadas, empresaLotesActiva } = marketing;
  const totalPorEmpresa = useMemo(() => {
    const acc = {};
    empresasSeleccionadas.forEach(e => {
      acc[e] = (gastosMarketing || []).reduce((s, r) => s + (Number(r[e]) || 0), 0);
    });
    return acc;
  }, [gastosMarketing, empresasSeleccionadas]);
  const totalInversion = Object.values(totalPorEmpresa).reduce((s, v) => s + v, 0);
  const roiGlobal = totalInversion > 0 ? montoTotal / totalInversion : 0;
  const cplGlobal = totalLeads > 0 && totalInversion > 0 ? totalInversion / totalLeads : 0;
  const cacGlobal = totalVentas > 0 && totalInversion > 0 ? totalInversion / totalVentas : 0;

  if (!periodo) return (
    <div className="tab-page">
      <div className="empty-state"><p>Selecciona un período en la barra superior.</p></div>
    </div>
  );

  if (loading) return <div className="tab-page"><p className="loading-msg">Cargando resumen...</p></div>;

  const sinDatos = totalLeads === 0 && totalOpors === 0 && totalVentas === 0;
  if (sinDatos) return (
    <div className="tab-page">
      <div className="tab-header">
        <div><h1 className="tab-title">Resumen del Mes</h1><p className="tab-sub">{periodoLabel(periodo)}</p></div>
      </div>
      <div className="empty-state"><p>No hay datos cargados para {periodoLabel(periodo)}. Carga primero los CSVs de Leads, Oportunidades y Ventas.</p></div>
    </div>
  );

  return (
    <div className="tab-page">
      <div className="tab-header">
        <div>
          <h1 className="tab-title">Resumen del Mes</h1>
          <p className="tab-sub">{periodoLabel(periodo)}</p>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="kpi-grid">
        <KpiCard label="Total Leads" value={totalLeads} color="var(--naranja)" />
        <KpiCard label="Oportunidades" value={totalOpors} sub={pct(tasaLeadOpor) + ' de leads'} color="var(--azul)" />
        <KpiCard label="Ventas cerradas" value={totalVentas} sub={pct(tasaLeadVenta) + ' de leads'} color="var(--verde)" />
        <KpiCard label="Monto Total" value={`S/ ${fmt(montoTotal)}`} color="var(--verde)" />
        <KpiCard label="Inversión Marketing" value={totalInversion > 0 ? `$ ${fmt(totalInversion)}` : '—'} color="var(--naranja)" />
        <KpiCard label="ROI Global" value={roiGlobal > 0 ? `${fmt(roiGlobal)}x` : '—'} sub="Ventas / Inversión" color="#059669" />
        <KpiCard label="CPL Global" value={cplGlobal > 0 ? `$ ${fmt(cplGlobal)}` : '—'} sub="Costo por Lead" color="#7C3AED" />
        <KpiCard label="CAC Global" value={cacGlobal > 0 ? `$ ${fmt(cacGlobal)}` : '—'} sub="Costo por Venta" color="#0891B2" />
      </div>

      {/* GRID DE INDICADORES — 2 columnas */}
      <div className="ind-grid">

        {/* 1. CAPTACIÓN */}
        <IndCard
          titulo="Captación"
          grafico={
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leadsPorAsesor} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} name="Leads">
                  {leadsPorAsesor.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
          cuadro={
            <table className="resumen-tabla">
              <thead><tr><th>Indicador</th><th>Valor</th></tr></thead>
              <tbody>
                <tr><td>Total Leads</td><td><strong>{totalLeads}</strong></td></tr>
                <tr><td>Leads pendientes</td><td>{leads.filter(r => (r.Estado || '').toUpperCase() === 'PENDIENTE').length}</td></tr>
                <tr><td>Leads en oportunidad</td><td>{leads.filter(r => (r.Estado || '').toUpperCase() === 'OPORTUNIDAD').length}</td></tr>
                {leadsPorAsesor.map(a => <tr key={a.nombre}><td>— {a.nombre}</td><td>{a.cantidad}</td></tr>)}
              </tbody>
            </table>
          }
        />

        {/* 2. EMBUDO COMERCIAL */}
        <IndCard
          titulo="Embudo Comercial"
          grafico={
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={embudo} layout="vertical" margin={{ top: 4, right: 40, left: 80, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} name="Cantidad">
                  {embudo.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
          cuadro={
            <table className="resumen-tabla">
              <thead><tr><th>Etapa</th><th>Cantidad</th><th>Conversión</th></tr></thead>
              <tbody>
                <tr><td>Leads</td><td><strong>{totalLeads}</strong></td><td>—</td></tr>
                <tr><td>Oportunidades</td><td><strong>{totalOpors}</strong></td><td>{pct(tasaLeadOpor)}</td></tr>
                <tr><td>Separaciones</td><td><strong>{separaciones}</strong></td><td>{pct(totalOpors > 0 ? (separaciones / totalOpors) * 100 : 0)}</td></tr>
                <tr><td>Ventas</td><td><strong>{totalVentas}</strong></td><td>{pct(tasaOporVenta)}</td></tr>
                <tr className="fila-total"><td>Lead → Venta</td><td colSpan="2"><strong>{pct(tasaLeadVenta)}</strong></td></tr>
              </tbody>
            </table>
          }
        />

        {/* 3. RENDIMIENTO POR CANAL */}
        <IndCard
          titulo="Rendimiento por Canal de Marketing"
          grafico={
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leadsPorCanal} margin={{ top: 4, right: 8, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} name="Leads">
                  {leadsPorCanal.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
          cuadro={
            <table className="resumen-tabla">
              <thead><tr><th>Canal</th><th>Leads</th><th>Opors</th><th>Conv.</th></tr></thead>
              <tbody>
                {canalStats.map(c => (
                  <tr key={c.nombre}>
                    <td>{c.nombre}</td>
                    <td>{c.leads}</td>
                    <td>{c.opors}</td>
                    <td><strong>{c.conversion}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />

        {/* 4. ROI POR CANAL / EMPRESA */}
        <IndCard
          titulo="ROI por Empresa"
          grafico={
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={empresasSeleccionadas.map(e => ({
                  nombre: e,
                  inversion: totalPorEmpresa[e] || 0,
                  roi: totalPorEmpresa[e] > 0 ? montoTotal / totalPorEmpresa[e] : 0,
                }))}
                margin={{ top: 4, right: 8, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [n === 'roi' ? `${fmt(v)}x` : `$ ${fmt(v)}`, n === 'roi' ? 'ROI' : 'Inversión']} />
                <Bar dataKey="inversion" name="Inversión" radius={[4, 4, 0, 0]} fill="#E8620A" />
              </BarChart>
            </ResponsiveContainer>
          }
          cuadro={
            <table className="resumen-tabla">
              <thead><tr><th>Empresa</th><th>Inversión ($)</th><th>ROI</th><th>ROI %</th></tr></thead>
              <tbody>
                {empresasSeleccionadas.map(e => {
                  const inv = totalPorEmpresa[e] || 0;
                  const roi = inv > 0 ? montoTotal / inv : 0;
                  const roiPct = inv > 0 ? ((montoTotal - inv) / inv) * 100 : 0;
                  return (
                    <tr key={e}>
                      <td>{e}</td>
                      <td>$ {fmt(inv)}</td>
                      <td><strong>{fmt(roi)}x</strong></td>
                      <td>{pct(roiPct)}</td>
                    </tr>
                  );
                })}
                <tr className="fila-total">
                  <td><strong>Total</strong></td>
                  <td><strong>$ {fmt(totalInversion)}</strong></td>
                  <td><strong>{fmt(roiGlobal)}x</strong></td>
                  <td><strong>{pct(totalInversion > 0 ? ((montoTotal - totalInversion) / totalInversion) * 100 : 0)}</strong></td>
                </tr>
              </tbody>
            </table>
          }
        />

        {/* 5. DESEMPEÑO POR PROYECTO */}
        <IndCard
          titulo="Desempeño por Proyecto"
          grafico={
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={proyectoStats.slice(0, 8)} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 9, fill: '#6B7280' }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="leads" name="Leads" fill="#E8620A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ventas" name="Ventas" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          }
          cuadro={
            <table className="resumen-tabla">
              <thead><tr><th>Proyecto</th><th>Leads</th><th>Opors</th><th>Ventas</th><th>Monto</th></tr></thead>
              <tbody>
                {proyectoStats.map(p => (
                  <tr key={p.nombre}>
                    <td>{p.nombre}</td>
                    <td>{p.leads}</td>
                    <td>{p.opors}</td>
                    <td>{p.ventas}</td>
                    <td>S/ {fmt(p.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />

        {/* 6. RANKING ASESORES */}
        <IndCard
          titulo="Ranking de Asesores"
          grafico={
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={asesorStats} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="leads" name="Leads" fill="#E8620A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ventas" name="Ventas" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          }
          cuadro={
            <table className="resumen-tabla">
              <thead><tr><th>Asesor</th><th>Leads</th><th>Opors</th><th>Ventas</th><th>Facturación</th></tr></thead>
              <tbody>
                {asesorStats.map(a => (
                  <tr key={a.nombre}>
                    <td><strong>{a.nombre}</strong></td>
                    <td>{a.leads}</td>
                    <td>{a.opors}</td>
                    <td>{a.ventas}</td>
                    <td>S/ {fmt(a.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />

        {/* 7. VENTAS */}
        <IndCard
          titulo="Ventas"
          grafico={
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ventasPorTipo} cx="50%" cy="50%" outerRadius={75} dataKey="cantidad" nameKey="nombre"
                  label={({ nombre, cantidad }) => `${nombre}: ${cantidad}`} labelLine={false} fontSize={11}>
                  {ventasPorTipo.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          }
          cuadro={
            <table className="resumen-tabla">
              <thead><tr><th>Tipo</th><th>Cantidad</th><th>Monto</th></tr></thead>
              <tbody>
                {ventasPorTipo.map(t => {
                  const monto = ventas.filter(v => v.Venta === t.nombre).reduce((s, v) => s + parseMonto(v['Monto Total']), 0);
                  return <tr key={t.nombre}><td>{t.nombre}</td><td>{t.cantidad}</td><td>S/ {fmt(monto)}</td></tr>;
                })}
                <tr className="fila-total">
                  <td><strong>Total</strong></td>
                  <td><strong>{ventas.length}</strong></td>
                  <td><strong>S/ {fmt(montoTotal)}</strong></td>
                </tr>
              </tbody>
            </table>
          }
        />

        {/* 8. SEPARACIONES PENDIENTES */}
        <IndCard
          titulo="Separaciones Pendientes"
          grafico={
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[{ nombre: 'En proceso', cantidad: enProceso }, { nombre: 'Separación', cantidad: sepPendientes }]}
                  cx="50%" cy="50%" outerRadius={75} dataKey="cantidad" nameKey="nombre"
                  label={({ nombre, cantidad }) => `${nombre}: ${cantidad}`} labelLine={false} fontSize={11}
                >
                  <Cell fill="#2563EB" /><Cell fill="#E8620A" />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          }
          cuadro={
            <table className="resumen-tabla">
              <thead><tr><th>Estado</th><th>Cantidad</th></tr></thead>
              <tbody>
                <tr><td>En proceso</td><td><strong>{enProceso}</strong></td></tr>
                <tr><td>Separación</td><td><strong>{sepPendientes}</strong></td></tr>
                <tr className="fila-total"><td>Total oportunidades</td><td><strong>{totalOpors}</strong></td></tr>
              </tbody>
            </table>
          }
        />

      </div>
    </div>
  );
}
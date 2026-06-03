import React, { useState, useEffect } from 'react';
import './App.css';
import { getPeriodos, eliminarPeriodo } from './utils/api';
import TabResumen from './pages/TabResumen';
import Asistente from './components/Asistente';
import TabLeads from './pages/TabLeads';
import TabOportunidades from './pages/TabOportunidades';
import TabVentas from './pages/TabVentas';

const TABS = [
  { id: 'resumen', label: 'Resumen General' },
  { id: 'leads', label: 'Leads' },
  { id: 'oportunidades', label: 'Oportunidades' },
  { id: 'ventas', label: 'Ventas' },
];

export default function App() {
  const [tab, setTab] = useState('leads');
  const [periodos, setPeriodos] = useState([]);
  const [periodoActivo, setPeriodoActivo] = useState('');
  const [recargar, setRecargar] = useState(0);
  const [modalBorrar, setModalBorrar] = useState(false);

  useEffect(() => {
    getPeriodos().then(lista => {
      setPeriodos(lista);
      if (lista.length > 0 && !periodoActivo) setPeriodoActivo(lista[0]);
    }).catch(() => {});
  }, [recargar]);

  const onDatosGuardados = () => setRecargar(r => r + 1);

  const periodoLabel = (p) => {
    if (!p) return '';
    const [anio, mes] = p.split('-');
    const nombres = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${nombres[parseInt(mes)]} ${anio}`;
  };

  const borrarPeriodo = async (p) => {
    if (!window.confirm(`¿Borrar todos los datos de ${periodoLabel(p)}?`)) return;
    await eliminarPeriodo(p);
    setRecargar(r => r + 1);
    if (periodoActivo === p) setPeriodoActivo('');
  };

  const borrarTodo = async () => {
    if (!window.confirm('¿Borrar TODOS los períodos? Esta acción no se puede deshacer.')) return;
    for (const p of periodos) await eliminarPeriodo(p);
    setPeriodos([]);
    setPeriodoActivo('');
    setRecargar(r => r + 1);
    setModalBorrar(false);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-brand">
            <span className="brand-dot" />
            <span className="brand-text">Reportes Comerciales</span>
          </div>
          <nav className="topbar-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`tab-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="topbar-right">
            {periodos.length > 0 && tab !== 'resumen' && (
              <select
                className="periodo-select"
                value={periodoActivo}
                onChange={e => setPeriodoActivo(e.target.value)}
              >
                {periodos.map(p => (
                  <option key={p} value={p}>{periodoLabel(p)}</option>
                ))}
              </select>
            )}
            {periodos.length > 0 && (
              <button className="btn-borrar-top" onClick={() => setModalBorrar(true)}>
                Gestionar datos
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="app-content">
        {tab === 'resumen' && <TabResumen periodos={periodos} periodoLabel={periodoLabel} />}
        {tab === 'leads' && <TabLeads periodo={periodoActivo} periodoLabel={periodoLabel} onGuardado={onDatosGuardados} />}
        {tab === 'oportunidades' && <TabOportunidades periodo={periodoActivo} periodoLabel={periodoLabel} onGuardado={onDatosGuardados} />}
        {tab === 'ventas' && <TabVentas periodo={periodoActivo} periodoLabel={periodoLabel} onGuardado={onDatosGuardados} />}
      </main>

      {/* MODAL GESTIONAR DATOS */}
      {modalBorrar && (
        <div className="modal-overlay" onClick={() => setModalBorrar(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Gestionar datos guardados</h2>
            <p className="modal-sub">Puedes eliminar un período específico o borrar todo el historial.</p>

            <div className="modal-lista">
              {periodos.map(p => (
                <div key={p} className="modal-fila">
                  <span>{periodoLabel(p)}</span>
                  <button className="btn-borrar-item" onClick={() => { borrarPeriodo(p); setModalBorrar(false); }}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={() => setModalBorrar(false)}>Cancelar</button>
              <button className="btn-borrar-todo" onClick={borrarTodo}>Borrar todo el historial</button>
            </div>
          </div>
        </div>
      )}
            <Asistente datosContexto={null} />

    </div>
  );
}
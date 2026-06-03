import React, { useState, useMemo } from 'react';
import './Tabla.css';

const PG = 15;

export default function Tabla({ filas, columnas }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroCol, setFiltroCol] = useState({});
  const [orden, setOrden] = useState({ col: '', dir: 'asc' });
  const [pagina, setPagina] = useState(1);

  const toggleOrden = (col) => {
    setOrden(o => o.col === col ? { col, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
    setPagina(1);
  };

  const resultado = useMemo(() => {
    let r = filas.filter(row =>
      (!busqueda || Object.values(row).some(v => String(v).toLowerCase().includes(busqueda.toLowerCase()))) &&
      Object.entries(filtroCol).every(([c, v]) => !v || String(row[c] ?? '').toLowerCase().includes(v.toLowerCase()))
    );
    if (orden.col) {
      r = [...r].sort((a, b) => {
        const va = a[orden.col] ?? '', vb = b[orden.col] ?? '';
        const na = parseFloat(va), nb = parseFloat(vb);
        const cmp = !isNaN(na) && !isNaN(nb) ? na - nb : String(va).localeCompare(String(vb));
        return orden.dir === 'asc' ? cmp : -cmp;
      });
    }
    return r;
  }, [filas, busqueda, filtroCol, orden]);

  const total = resultado.length;
  const totalPags = Math.ceil(total / PG);
  const visibles = resultado.slice((pagina - 1) * PG, pagina * PG);

  if (!columnas.length) return <p style={{color:'var(--gris-texto)'}}>Sin datos</p>;

  return (
    <div className="tabla-wrap">
      <div className="tabla-toolbar">
        <input
          className="tabla-busq"
          placeholder="Buscar en la tabla..."
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
        />
        <span className="tabla-count">{total} registro{total !== 1 ? 's' : ''}</span>
      </div>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              {columnas.map(col => (
                <th key={col}>
                  <div className="th-top" onClick={() => toggleOrden(col)}>
                    {col}
                    <span className="th-sort">{orden.col === col ? (orden.dir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                  </div>
                  <input
                    className="th-filter"
                    placeholder="Filtrar..."
                    value={filtroCol[col] || ''}
                    onChange={e => { setFiltroCol(f => ({ ...f, [col]: e.target.value })); setPagina(1); }}
                    onClick={e => e.stopPropagation()}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0
              ? <tr><td colSpan={columnas.length} className="td-empty">Sin resultados</td></tr>
              : visibles.map((row, i) => (
                <tr key={i} className={i % 2 ? 'odd' : ''}>
                  {columnas.map(col => (
                    <td key={col} title={String(row[col] ?? '')}>{row[col] ?? ''}</td>
                  ))}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      {totalPags > 1 && (
        <div className="tabla-pag">
          <button disabled={pagina === 1} onClick={() => setPagina(1)}>«</button>
          <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>‹</button>
          <span>Página {pagina} de {totalPags}</span>
          <button disabled={pagina === totalPags} onClick={() => setPagina(p => p + 1)}>›</button>
          <button disabled={pagina === totalPags} onClick={() => setPagina(totalPags)}>»</button>
        </div>
      )}
    </div>
  );
}

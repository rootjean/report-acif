import React, { useState, useRef } from 'react';
import { parseCSV } from '../utils/csvParser';
import { guardarDatos } from '../utils/api';
import './UploadCSV.css';

export default function UploadCSV({ tipo, periodo, onGuardado, onDatos }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [periodoInput, setPeriodoInput] = useState(periodo || '');
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setError('Solo se aceptan archivos .csv'); return; }
    if (!periodoInput) { setError('Selecciona el período (mes/año) primero'); return; }

    setError(''); setSuccess(''); setLoading(true);
    try {
      const filas = await parseCSV(file);
      // Guardar en backend
      await guardarDatos(periodoInput, { [tipo]: filas });
      setSuccess(`${filas.length} registros guardados correctamente`);
      if (onGuardado) onGuardado(periodoInput);
      if (onDatos) onDatos(filas);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-csv">
      <div className="upload-periodo-row">
        <label>Período:</label>
        <input
          type="month"
          className="input-month"
          value={periodoInput}
          onChange={e => setPeriodoInput(e.target.value)}
        />
        <span className="upload-hint">Selecciona el mes al que corresponde este archivo</span>
      </div>

      <div
        className={`drop-area ${dragging ? 'dragging' : ''} ${loading ? 'busy' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => !loading && inputRef.current.click()}
      >
        <input ref={inputRef} type="file" accept=".csv" style={{display:'none'}} onChange={e => handleFile(e.target.files[0])} />
        {loading ? (
          <><div className="spin"/><p>Procesando...</p></>
        ) : (
          <>
            <p className="drop-main">Arrastra el CSV aquí o haz clic para seleccionar</p>
            <p className="drop-sub">.csv — {tipo === 'leads' ? 'Reporte de Leads' : tipo === 'oportunidades' ? 'Reporte de Oportunidades' : 'Reporte de Ventas'}</p>
          </>
        )}
      </div>

      {error && <p className="msg-error">{error}</p>}
      {success && <p className="msg-ok">{success}</p>}
    </div>
  );
}

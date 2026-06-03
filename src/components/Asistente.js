import React, { useState, useRef, useEffect } from 'react';
import './Asistente.css';

const SUGERENCIAS = [
  '¿Qué asesor tiene más leads?',
  '¿Cuál canal convierte mejor?',
  'Resumen de ventas del período',
  '¿Cuántos leads están pendientes?',
];

const BIENVENIDA = {
  rol: 'ia',
  texto: 'Hola, soy tu asistente con IA. Puedo analizar los datos cargados y responder preguntas sobre leads, oportunidades y ventas. ¿En qué te ayudo?',
};

export default function Asistente({ datosContexto }) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([BIENVENIDA]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const enviar = async (texto) => {
    const pregunta = texto || input.trim();
    if (!pregunta || cargando) return;
    setInput('');
    setMensajes(m => [...m, { rol: 'usuario', texto: pregunta }]);
    setCargando(true);

    try {
      const contexto = datosContexto
        ? `Contexto de datos del sistema inmobiliario:\n${JSON.stringify(datosContexto, null, 2)}\n\n`
        : 'No hay datos cargados aún en el sistema.\n\n';

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `Eres un asistente de análisis comercial para una empresa inmobiliaria. 
Respondes preguntas sobre leads, oportunidades y ventas de forma concisa y directa. 
Usas los datos proporcionados para dar respuestas específicas con números reales.
Si no hay datos cargados, indícalo amablemente y sugiere cargar los archivos CSV.
Responde siempre en español. Sé breve (máximo 3 oraciones).`,
          messages: [
            {
              role: 'user',
              content: contexto + pregunta,
            },
          ],
        }),
      });

      const data = await response.json();
      const respuesta = data.content?.[0]?.text || 'No pude procesar la respuesta.';
      setMensajes(m => [...m, { rol: 'ia', texto: respuesta }]);
    } catch (e) {
      setMensajes(m => [...m, { rol: 'ia', texto: 'Ocurrió un error al conectar con la IA. Verifica tu conexión.' }]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      {/* BURBUJA */}
      <button
        className={`asistente-burbuja ${abierto ? 'activo' : ''}`}
        onClick={() => setAbierto(a => !a)}
        aria-label="Abrir asistente IA"
      >
        {abierto ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10a9.96 9.96 0 0 1-5.06-1.37L2 22l1.37-4.94A9.96 9.96 0 0 1 2 12 10 10 0 0 1 12 2z"/>
            <path d="M8 10h.01M12 10h.01M16 10h.01" strokeWidth="2.5"/>
          </svg>
        )}
        {!abierto && <span className="burbuja-label">Consultar con IA</span>}
      </button>

      {/* PANEL */}
      {abierto && (
        <div className="asistente-panel">
          <div className="asistente-header">
            <div className="asistente-header-info">
              <div className="asistente-header-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
              </div>
              <div>
                <div className="asistente-nombre">Asistente IA</div>
                <div className="asistente-subtitulo">Análisis de reportes con IA</div>
              </div>
            </div>
          </div>

          <div className="asistente-mensajes">
            {mensajes.map((m, i) => (
              <div key={i} className={`mensaje ${m.rol}`}>
                {m.rol === 'ia' && (
                  <div className="mensaje-avatar">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                    </svg>
                  </div>
                )}
                <div className="mensaje-burbuja">{m.texto}</div>
              </div>
            ))}
            {cargando && (
              <div className="mensaje ia">
                <div className="mensaje-avatar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                </div>
                <div className="mensaje-burbuja typing">
                  <span/><span/><span/>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="asistente-sugerencias">
            {SUGERENCIAS.map((s, i) => (
              <button key={i} className="sug-chip" onClick={() => enviar(s)}>{s}</button>
            ))}
          </div>

          <div className="asistente-input-row">
            <input
              className="asistente-input"
              type="text"
              placeholder="Escribe una pregunta..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enviar()}
              disabled={cargando}
            />
            <button className="asistente-send" onClick={() => enviar()} disabled={cargando || !input.trim()}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
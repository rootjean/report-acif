import React from 'react';
import './KpiCard.css';

export default function KpiCard({ label, value, sub, color }) {
  return (
    <div className="kpi-card" style={{ borderTop: `3px solid ${color || 'var(--naranja)'}` }}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import './Grafico.css';

const COLORES = ['#E8620A','#F97316','#FB923C','#FDBA74','#C4510A','#EA580C'];

export default function Grafico({ titulo, datos, labelKey = 'nombre', valueKey = 'cantidad', color }) {
  if (!datos || datos.length === 0) return null;
  return (
    <div className="grafico-card">
      <h3 className="grafico-titulo">{titulo}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={datos} margin={{ top: 4, right: 12, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey={labelKey}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            angle={-35}
            textAnchor="end"
            interval={0}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(232,98,10,0.06)' }}
            contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
          />
          <Bar dataKey={valueKey} radius={[4, 4, 0, 0]} maxBarSize={50}>
            {datos.map((_, i) => (
              <Cell key={i} fill={color || COLORES[i % COLORES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

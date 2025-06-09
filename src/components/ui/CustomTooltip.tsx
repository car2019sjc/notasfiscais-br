import React from 'react';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-lg backdrop-blur-sm">
        <p className="font-bold text-gray-800 mb-2 text-sm">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
            {`${entry.name}: ${entry.value.toLocaleString('pt-BR')}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};
import React from 'react';
import { Card } from './Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CustomTooltip } from './CustomTooltip';
import type { AnalysisData } from '../../types';

interface ExecutiveChartProps {
  title: string;
  data: AnalysisData[];
  onClick?: (planta: string) => void;
}

export const ExecutiveChart: React.FC<ExecutiveChartProps> = ({ title, data, onClick }) => {
  return (
    <Card>
      <h3 className="text-xl font-bold text-gray-700 mb-6">{title}</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              name="Volume" 
              fill="#ef4444"
              onClick={(data) => onClick?.(data.name)}
              style={{ cursor: 'pointer' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}; 
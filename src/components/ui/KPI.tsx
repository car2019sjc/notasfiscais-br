import React from 'react';
import { Card } from './Card';
import type { KPIData } from '../../types';

export const KPI: React.FC<KPIData> = ({ title, value, icon, color }) => (
  <Card className="group cursor-pointer transform transition-all duration-300 hover:scale-105">
    <div className="flex items-center">
      <div 
        className="p-4 rounded-full mr-4 transition-all duration-300 group-hover:scale-110" 
        style={{ backgroundColor: `${color}1A`, color: color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-1 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-800 transition-all duration-300 group-hover:text-gray-900">
          {value}
        </p>
      </div>
    </div>
  </Card>
);
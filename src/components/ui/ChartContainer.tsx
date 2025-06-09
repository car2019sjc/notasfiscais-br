import React from 'react';
import { Card } from './Card';

interface ChartContainerProps {
  title: React.ReactNode;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({ title, icon, children }) => (
  <Card className="transition-all duration-300 hover:shadow-2xl">
    <div className="flex items-center mb-6">
      <div className="text-red-600 mr-3 p-2 bg-red-50 rounded-lg transition-all duration-300 hover:bg-red-100">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-800">{title}</h3>
    </div>
    <div style={{ width: '100%', height: 350 }} className="transition-all duration-300">
      {children}
    </div>
  </Card>
);
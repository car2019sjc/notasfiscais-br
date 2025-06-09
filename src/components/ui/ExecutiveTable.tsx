import React from 'react';
import { Card } from './Card';

export interface TableColumn {
  header: string;
  accessor: string;
  render?: (value: any) => React.ReactNode;
}

interface ExecutiveTableProps {
  title?: string;
  icon?: React.ReactNode;
  data: any[];
  columns: TableColumn[];
}

export const ExecutiveTable: React.FC<ExecutiveTableProps> = ({ 
  title, 
  icon, 
  data, 
  columns 
}) => {
  return (
    <Card>
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-6">
          {icon}
          {title && <h3 className="text-xl font-bold text-gray-700">{title}</h3>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={`px-6 py-4 text-sm text-gray-900 ${column.accessor === 'motivo' ? 'whitespace-normal break-words' : ''} ${column.accessor === 'count' ? 'text-right' : ''}`}
                  >
                    {column.render 
                      ? column.render(row[column.accessor])
                      : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
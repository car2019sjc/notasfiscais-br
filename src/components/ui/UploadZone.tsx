import React, { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File, type: string) => void;
  file: File | null;
  title: string;
  id: string;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, file, title, id }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  return (
    <div 
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 transform hover:scale-105 ${
        isDragging 
          ? 'border-red-500 bg-red-50 shadow-lg scale-105' 
          : 'border-gray-300 hover:border-red-400 hover:bg-red-50'
      }`}
      onDragEnter={(e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        setIsDragging(true); 
      }}
      onDragLeave={(e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        setIsDragging(false); 
      }}
      onDragOver={(e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
      }}
      onDrop={(e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        setIsDragging(false); 
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          onFileSelect(e.dataTransfer.files[0], id);
        }
      }}
    >
      <input 
        type="file" 
        id={id} 
        className="hidden" 
        accept=".xlsx, .xls" 
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0], id);
          }
        }} 
      />
      <label htmlFor={id} className="cursor-pointer flex flex-col items-center group">
        <FileSpreadsheet 
          className={`w-16 h-16 mb-4 transition-all duration-300 group-hover:scale-110 ${
            isDragging ? 'text-red-500' : 'text-gray-400 group-hover:text-red-500'
          }`} 
        />
        <span className="font-bold text-lg text-gray-700 mb-2 group-hover:text-red-600 transition-colors duration-300">
          {title}
        </span>
        <p className="text-sm text-gray-500 mb-3 group-hover:text-gray-600 transition-colors duration-300">
          Arraste e solte ou clique para selecionar
        </p>
        <p className="text-xs text-gray-400 group-hover:text-gray-500 transition-colors duration-300">
          Formatos aceitos: .xlsx, .xls
        </p>
        {file && (
          <p className="text-sm font-bold text-green-600 mt-4 p-2 bg-green-50 rounded-lg border border-green-200 max-w-xs truncate">
            ✓ {file.name}
          </p>
        )}
      </label>
    </div>
  );
};
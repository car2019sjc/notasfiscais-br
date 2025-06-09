import React, { useState, useCallback, useEffect } from 'react';
import { Upload, BarChart3, ListChecks, Loader2, AlertCircle } from 'lucide-react';
import { BridgestoneLogo } from './components/BridgestoneLogo';
import { UploadZone } from './components/ui/UploadZone';
import { Card } from './components/ui/Card';
import { RejectionsDashboard } from './components/dashboards/RejectionsDashboard';
import { CorrectionsDashboard } from './components/dashboards/CorrectionsDashboard';
import type { ProcessedData, LogEntry } from './types';

declare global {
  interface Window {
    XLSX: any;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'rejections' | 'corrections'>('upload');
  const [rejectionsFile, setRejectionsFile] = useState<File | null>(null);
  const [correctionsFile, setCorrectionsFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedData>({ 
    rejectionsData: [], 
    correctionsData: [], 
    sefazErrorMap: new Map() 
  });
  const [error, setError] = useState('');
  const [xlsxLoaded, setXlsxLoaded] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);

  const exportToExcel = useCallback((analysis: any) => {
    if (!window.XLSX) {
      setError('Biblioteca de Excel não carregada.');
      return;
    }

    const wb = window.XLSX.utils.book_new();
    
    for (const [key, value] of Object.entries(analysis)) {
      if (Array.isArray(value) && value.length > 0) {
        const sheetName = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
        const ws = window.XLSX.utils.json_to_sheet(value);
        window.XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
      }
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    window.XLSX.writeFile(wb, `Relatorio_Dashboard_Bridgestone_${timestamp}.xlsx`);
  }, []);

  useEffect(() => {
    if (window.XLSX) { 
      setXlsxLoaded(true); 
      return; 
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.async = true;
    script.onload = () => { 
      addLog("Biblioteca de Excel carregada com sucesso.", "success"); 
      setXlsxLoaded(true); 
    };
    script.onerror = () => { 
      addLog("Falha ao carregar a biblioteca de Excel.", "error"); 
      setError('Falha ao carregar um recurso essencial.'); 
    };
    document.body.appendChild(script);
    
    return () => { 
      if (document.body.contains(script)) document.body.removeChild(script); 
    };
  }, []);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [{ timestamp, message, type }, ...prev]);
  };
  
  const handleFile = (file: File | null, type: string) => {
    if (!file) return;
    
    if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && 
        file.type !== 'application/vnd.ms-excel') {
      setError(`Tipo de arquivo inválido para ${type}. Por favor, use .xlsx ou .xls.`);
      return;
    }
    
    if (type === 'rejections') setRejectionsFile(file);
    else setCorrectionsFile(file);
    
    addLog(`Arquivo '${file.name}' carregado com sucesso.`, 'success');
    setError('');
  };
  
  const processSheetInChunks = async (workbook: any, sheetName: string, onProgress: (progress: number) => void) => {
    return new Promise<any[]>((resolve, reject) => {
      try {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) throw new Error(`Aba '${sheetName}' não encontrada.`);
        
        const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { 
          defval: '', 
          blankrows: false, 
          raw: false 
        });
        
        const totalRows = jsonData.length;
        if (totalRows === 0) { 
          onProgress(100); 
          resolve([]); 
          return; 
        }
        
        const chunkSize = 500;
        let currentIndex = 0;
        let processedData: any[] = [];
        
        function processChunk() {
          processedData.push(...jsonData.slice(currentIndex, currentIndex + chunkSize));
          currentIndex += chunkSize;
          onProgress(Math.min(100, (currentIndex / totalRows) * 100));
          
          if (currentIndex < totalRows) {
            setTimeout(processChunk, 0);
          } else {
            resolve(processedData);
          }
        }
        
        processChunk();
      } catch (err) { 
        reject(err); 
      }
    });
  };

  const processFiles = useCallback(() => {
    if (!rejectionsFile || !correctionsFile) { 
      setError("Por favor, carregue ambos os arquivos."); 
      return; 
    }
    
    if (!xlsxLoaded) { 
      setError("Aguarde o carregamento da biblioteca de Excel."); 
      return; 
    }

    setIsLoading(true); 
    setProgress(0); 
    setLogs([]); 
    setError(''); 
    setProcessedData({ rejectionsData: [], correctionsData: [], sefazErrorMap: new Map() });

    setTimeout(async () => {
      try {
        addLog("Iniciando leitura dos arquivos..."); 
        setProgress(5);
        
        const [rejectionsBuffer, correctionsBuffer] = await Promise.all([
          rejectionsFile.arrayBuffer(), 
          correctionsFile.arrayBuffer()
        ]);
        
        addLog("Analisando estrutura dos arquivos..."); 
        setProgress(10);
        
        const rejectionsWb = window.XLSX.read(rejectionsBuffer, { type: 'buffer', cellDates: true });
        const correctionsWb = window.XLSX.read(correctionsBuffer, { type: 'buffer', cellDates: true });
        
        addLog("Criando dicionário de erros SEFAZ...");
        const sefazSheet = rejectionsWb.Sheets['Lista Erros Sefaz'];
        if (!sefazSheet) throw new Error("Aba 'Lista Erros Sefaz' não encontrada.");
        
        const sefazErrorList = window.XLSX.utils.sheet_to_json(sefazSheet, { header: 1 });
        const sefazErrorMap = new Map(
          sefazErrorList.map((row: any[]) => [String(row[0]).trim(), String(row[1]).trim()])
        );
        
        addLog(`Dicionário com ${sefazErrorMap.size} códigos de erro criado.`); 
        setProgress(20);
        
        addLog("Processando dados de Rejeições...");
        const rejectionsData = await processSheetInChunks(
          rejectionsWb, 
          'Base Consolidado', 
          (p) => setProgress(20 + (p * 0.35))
        );
        
        addLog("Processando dados de Correções...");
        const correctionsData = await processSheetInChunks(
          correctionsWb, 
          'Listagem de Eventos', 
          (p) => setProgress(55 + (p * 0.4))
        );
        
        addLog(`Processamento concluído: ${rejectionsData.length} rejeições e ${correctionsData.length} correções.`, 'success');
        
        setProcessedData({ rejectionsData, correctionsData, sefazErrorMap });
        setProgress(100); 
        addLog("Análise completa! Dados prontos para visualização.", 'success'); 
        setActiveTab('rejections');
      } catch (err: any) { 
        setError(`Erro no processamento: ${err.message}. Verifique os nomes das abas.`); 
        addLog(`ERRO: ${err.message}`, 'error');
      } finally { 
        setTimeout(() => { 
          setIsLoading(false); 
          setProgress(0); 
        }, 1000); 
      }
    }, 50);
  }, [rejectionsFile, correctionsFile, xlsxLoaded]);

  const renderUploadTab = () => (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Upload de Planilhas</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Faça o upload dos arquivos de rejeições e correções para gerar uma análise completa 
          dos dados de notas fiscais da Bridgestone.
        </p>
      </div>

      {isLoading && (
        <Card>
          <div className="text-center">
            <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
              <div 
                className="bg-gradient-to-r from-red-500 to-red-600 h-6 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white mix-blend-difference">
                {`${progress.toFixed(0)}%`}
              </span>
            </div>
            <p className="mt-4 text-gray-600 font-medium">Processando dados...</p>
            <p className="mt-2 text-yellow-600 font-semibold text-base animate-pulse">Aguarde, o processamento pode levar alguns minutos dependendo do volume de dados.</p>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <UploadZone 
          onFileSelect={handleFile} 
          file={rejectionsFile} 
          title="Nota Fiscal Rejections" 
          id="rejections" 
        />
        <UploadZone 
          onFileSelect={handleFile} 
          file={correctionsFile} 
          title="Nota fiscal Correction Letter" 
          id="corrections" 
        />
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-500 mr-3 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-red-800">Erro de Processamento</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="text-center">
        <button 
          onClick={processFiles} 
          disabled={!rejectionsFile || !correctionsFile || isLoading || !xlsxLoaded}
          className="bg-blue-800 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:bg-blue-900 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center mx-auto min-w-[200px] transform hover:scale-105 disabled:hover:scale-100"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              Processando...
            </>
          ) : !xlsxLoaded ? (
            <>
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              Carregando Recursos
            </>
          ) : (
            <>
              <ListChecks className="mr-2 h-5 w-5" />
              Processar Dados
            </>
          )}
        </button>
      </div>
    </div>
  );
  
  const handleTabChange = (tab: 'upload' | 'rejections' | 'corrections') => {
    if (tab === activeTab) return;
    setTabLoading(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTabLoading(false);
    }, 600);
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen font-sans">
      <header className="bg-white shadow-lg border-b-4" style={{ borderBottomColor: '#fba412' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-3xl font-extrabold text-black">Bridgestone</span>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 ml-6">
              Dashboard de Análise de Notas Fiscais - Rejeições e Correções
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-8" aria-label="Tabs">
              {[
                { id: 'upload', label: 'Upload', icon: Upload },
                { id: 'rejections', label: 'Análise de Rejeições', icon: BarChart3 },
                { id: 'corrections', label: 'Análise de Correções', icon: BarChart3 }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabChange(id as any)}
                  className={`whitespace-nowrap py-6 px-1 border-b-4 font-bold text-sm transition-all duration-300 flex items-center ${
                    activeTab === id
                      ? (id === 'upload' ? 'border-0 border-b-4' : 'border-red-600') + ' text-[#fba412] border-[#fba412]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-2 ${activeTab === id && id === 'upload' ? 'text-[#fba412]' : ''}`} />
                  {label}
                </button>
              ))}
            </nav>
          </div>
          
          {tabLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-6 py-4 rounded-lg text-lg font-semibold shadow animate-pulse">
                {activeTab === 'rejections' ? 'Recarregando dados de Notas Corrigidas...' : activeTab === 'corrections' ? 'Recarregando dados de Notas Rejeitadas...' : 'Carregando...'}
              </div>
            </div>
          )}

          <div className="p-8">
            {!tabLoading && activeTab === 'upload' && renderUploadTab()}
            {!tabLoading && activeTab === 'rejections' && (
              <RejectionsDashboard 
                data={processedData.rejectionsData} 
                sefazErrorMap={processedData.sefazErrorMap} 
                onExport={exportToExcel}
              />
            )}
            {!tabLoading && activeTab === 'corrections' && (
              <CorrectionsDashboard 
                data={processedData.correctionsData} 
                onExport={exportToExcel}
              />
            )}
          </div>
        </div>
      </main>

      <footer className="w-full py-4 bg-white border-t text-center mt-8">
        <div className="text-gray-500 text-base">
          OnSet Tecnologia © 2025 - Dashboard de Análise de Notas Fiscais - Bridgestone
        </div>
      </footer>
    </div>
  );
}

export default App;
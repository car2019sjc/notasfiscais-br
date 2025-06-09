import React, { useState, useMemo, useRef } from 'react';
import { Download, Filter, X, RefreshCw, Building2, BarChart3, Users, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Line } from 'recharts';
import { Card } from '../ui/Card';
import { KPI } from '../ui/KPI';
import { ChartContainer } from '../ui/ChartContainer';
import { CustomTooltip } from '../ui/CustomTooltip';
import { ExecutiveTable } from '../ui/ExecutiveTable';
import { ExecutiveChart } from '../ui/ExecutiveChart';
import { robustParseDate, dateToNumber } from '../../utils/dateUtils';
import { analyzeCorrectionReasons, analyzeCorrectionsByPlant, calculateMonthlyVolumeCorrections, analyzeCorrectionsByShiftAndWeekType, getTop5CNPJDestinatario } from '../../utils/dataAnalysis';
import { getTopCNPJsByPlanta, formatCNPJ } from '../../utils/correctionAnalysis';
import { BRIDGESTONE_COLORS } from '../../constants';
import type { CorrectionRow, AnalysisData } from '../../types';
import { Modal } from '../ui/Modal';

interface MonthlyVolumeItem {
  mes: string;
  total: number;
}

interface DateFilter {
  startDate: string;
  endDate: string;
}

interface CorrectionsDashboardProps {
  data: CorrectionRow[];
  onExport: (data: CorrectionRow[]) => void;
}

function getDefaultDateRange() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // último dia do mês atual
  const start = new Date(now.getFullYear(), now.getMonth() - 3, 1); // primeiro dia de 4 meses atrás
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
    endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

// Função para formatar CNPJ no padrão brasileiro
const formatarCNPJ = (cnpj: string): string => {
  // Remove caracteres não numéricos
  const cnpjNumeros = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cnpjNumeros.length !== 14) return cnpj;
  
  // Aplica a máscara: 00.000.000/0000-00
  return cnpjNumeros.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
};

export const CorrectionsDashboard: React.FC<CorrectionsDashboardProps> = ({ data, onExport }) => {
  const [dateFilter, setDateFilter] = useState<DateFilter>(getDefaultDateRange());
  const [selectedPlanta, setSelectedPlanta] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const turnoChartRef = useRef<HTMLDivElement>(null);
  const [showCnpjModal, setShowCnpjModal] = useState(false);
  const [top5CnpjPlanta, setTop5CnpjPlanta] = useState<{ cnpj: string, total: number }[]>([]);
  const [showCnpjMonthModal, setShowCnpjMonthModal] = useState(false);
  const [top5CnpjMonth, setTop5CnpjMonth] = useState<{ cnpj: string, total: number }[]>([]);
  const [selectedMonthForCnpj, setSelectedMonthForCnpj] = useState<string | null>(null);
  const [top5MotivosMonth, setTop5MotivosMonth] = useState<{ motivo: string, count: number }[]>([]);
  const [showMotivosByCnpjModal, setShowMotivosByCnpjModal] = useState(false);
  const [selectedCnpj, setSelectedCnpj] = useState<string | null>(null);
  const [top5MotivosByCnpj, setTop5MotivosByCnpj] = useState<{ motivo: string, count: number }[]>([]);

  console.log('Exemplo de registro bruto:', data[0]);
  const filteredData = useMemo(() => {
    if (!dateFilter.startDate && !dateFilter.endDate) return data;

    // Extrai mês e ano do filtro
    const start = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
    const end = dateFilter.endDate ? new Date(dateFilter.endDate) : null;

    return data.filter(row => {
      if (!row.Data) return false;
      // Extrai mês e ano do dado
      const [mes, ano] = row.Data.split('-');
      if (!mes || !ano) return false;
      const dataRow = new Date(`${ano}-${mes.padStart(2, '0')}-01`);

      if (start && dataRow < start) return false;
      if (end && dataRow > end) return false;
      return true;
    });
  }, [data, dateFilter]);

  const analysis = useMemo(() => ({
    byPlant: analyzeCorrectionsByPlant(filteredData),
    topReasons: analyzeCorrectionReasons(filteredData)
  }), [filteredData]);

  const topCNPJs = useMemo(() => {
    if (!selectedPlanta) return [];
    const offenders = getTopCNPJsByPlanta(filteredData, selectedPlanta);
    return offenders[selectedPlanta] || [];
  }, [filteredData, selectedPlanta]);

  // Volume mensal de correções
  const monthlyVolume = useMemo<MonthlyVolumeItem[]>(() => {
    const result = calculateMonthlyVolumeCorrections(filteredData) as MonthlyVolumeItem[];
    return result.map(item => ({
      mes: item.mes,
      total: item.total
    }));
  }, [filteredData]);
  const shiftWeekType = useMemo(() => analyzeCorrectionsByShiftAndWeekType(filteredData), [filteredData]);
  const top5CNPJ = useMemo(() => getTop5CNPJDestinatario(filteredData), [filteredData]);

  // Filtra os dados para o mês selecionado, se houver
  const filteredByMonth = useMemo(() => {
    if (!selectedMonth) return filteredData;
    return filteredData.filter(row => {
      if (!row.Data) return false;
      const [mes, ano] = row.Data.split('-');
      if (!mes || !ano) return false;
      return `${mes.padStart(2, '0')}-${ano}` === selectedMonth;
    });
  }, [filteredData, selectedMonth]);

  const shiftWeekTypeByMonth = useMemo(() => analyzeCorrectionsByShiftAndWeekType(filteredByMonth), [filteredByMonth]);

  // Top 5 CNPJ filtrado pelo mês selecionado
  const top5CNPJByMonth = useMemo(() => getTop5CNPJDestinatario(filteredByMonth), [filteredByMonth]);

  // Função para abrir o modal com o Top 5 CNPJs da planta
  const handleBarClickPlanta = (data: any, index: number) => {
    const planta = data.name || '';
    setSelectedPlanta(planta);
    // Filtra os dados da planta
    const cnpjs = getTop5CNPJDestinatario(filteredData.filter(row => row.Planta === planta));
    setTop5CnpjPlanta(cnpjs);
    setShowCnpjModal(true);
  };

  // Função para abrir o modal com o Top 5 Motivos de Correção do mês
  const handleBarClickMonth = (data: any, index: number) => {
    const mes = data.mes || (monthlyVolume[index] && monthlyVolume[index].mes) || null;
    if (!mes) return;
    setSelectedMonth(mes);
    setSelectedMonthForCnpj(mes);
    // Filtra os dados do mês
    const dadosMes = filteredData.filter(row => {
      if (!row.Data) return false;
      const [m, a] = row.Data.split('-');
      return `${m.padStart(2, '0')}-${a}` === mes;
    });
    const motivos = analyzeCorrectionReasons(dadosMes).slice(0, 5).map(m => ({
      motivo: m.motivo || m.name || '',
      count: m.count
    }));
    setTop5MotivosMonth(motivos);
    setShowCnpjMonthModal(true);
    setTimeout(() => {
      if (turnoChartRef.current) {
        turnoChartRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Função para abrir o modal com o Top 5 Motivos de Correção do CNPJ
  const handleBarClickCnpj = (data: any) => {
    const cnpj = data.cnpj;
    setSelectedCnpj(cnpj);
    // Filtra os dados do período para o CNPJ
    const dadosCnpj = filteredData.filter(row => row.CNPJ === cnpj);
    const motivos = analyzeCorrectionReasons(dadosCnpj).slice(0, 5).map(m => ({
      motivo: m.motivo || m.name || '',
      count: m.count
    }));
    setTop5MotivosByCnpj(motivos);
    setShowMotivosByCnpjModal(true);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-800 bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-transparent">
          Análise de Correções
        </h2>
        <button 
          onClick={() => onExport(filteredData)}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
        >
          <Download className="mr-2 h-5 w-5" />
          Exportar Análise
        </button>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-6 h-6 text-amber-600" />
          <h3 className="text-xl font-bold text-gray-700">Filtros de Data</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div>
            <label htmlFor="startDateCorr" className="block text-sm font-bold text-gray-700 mb-2">
              Data de Início
            </label>
            <input 
              type="date" 
              name="startDate" 
              id="startDateCorr" 
              value={dateFilter.startDate} 
              onChange={(e) => setDateFilter(p => ({...p, startDate: e.target.value}))} 
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 transition-all duration-300"
            />
          </div>
          <div>
            <label htmlFor="endDateCorr" className="block text-sm font-bold text-gray-700 mb-2">
              Data de Fim
            </label>
            <input 
              type="date" 
              name="endDate" 
              id="endDateCorr" 
              value={dateFilter.endDate} 
              onChange={(e) => setDateFilter(p => ({...p, endDate: e.target.value}))} 
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 transition-all duration-300"
            />
          </div>
          <div>
            <button 
              onClick={() => setDateFilter({ startDate: '', endDate: ''})} 
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105"
            >
              <X className="inline-block mr-2 h-4 w-4" />
              Limpar Filtros
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <KPI 
          title="Total de Correções" 
          value={filteredData.length.toLocaleString('pt-BR')} 
          icon={<RefreshCw className="w-6 h-6" />} 
          color={BRIDGESTONE_COLORS.accent} 
        />
        <KPI 
          title="Plantas Ativas" 
          value={new Set(filteredData.map(r => r.Planta)).size.toString()} 
          icon={<Building2 className="w-6 h-6" />} 
          color={BRIDGESTONE_COLORS.success} 
        />
        <KPI 
          title="Total de CNPJs" 
          value={filteredData.length.toString()} 
          icon={<Users className="w-6 h-6" />} 
          color={BRIDGESTONE_COLORS.info} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <h3 className="text-xl font-bold text-gray-700 mb-4">Top 1 a 5 Motivos de Correção</h3>
          {analysis.topReasons.length === 0 ? (
            <div className="text-center text-gray-500 py-16">Nenhum dado disponível para os motivos de correção.</div>
          ) : (
            <ExecutiveTable
              title="Top 1 a 5 Motivos de Correção"
              icon={<BarChart3 className="w-6 h-6" />}
              data={analysis.topReasons.slice(0, 5)}
              columns={[
                { header: "Motivo da Correção", accessor: 'motivo' },
                { header: "Ocorrências", accessor: 'count' }
              ]}
            />
          )}
        </Card>
        <Card>
          <h3 className="text-xl font-bold text-gray-700 mb-4">Top 6 a 10 Motivos de Correção</h3>
          {analysis.topReasons.length <= 5 ? (
            <div className="text-center text-gray-500 py-16">Nenhum dado disponível para os motivos de correção.</div>
          ) : (
            <ExecutiveTable
              title="Top 6 a 10 Motivos de Correção"
              icon={<BarChart3 className="w-6 h-6" />}
              data={analysis.topReasons.slice(5, 10)}
              columns={[
                { header: "Motivo da Correção", accessor: 'motivo' },
                { header: "Ocorrências", accessor: 'count' }
              ]}
            />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartContainer title="Correções por Planta" icon={<BarChart3 className="w-6 h-6" />}>
          <div className="text-sm text-gray-600 mb-2 font-bold">Clique em uma barra para ver os Top 5 CNPJs da planta selecionada.</div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={analysis.byPlant} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Bar dataKey="value" name="Correções" fill="#ef4444" onClick={handleBarClickPlanta} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Gráfico Volume Mensal */}
        <ChartContainer title="Volume Mensal" icon={<BarChart3 className="w-6 h-6" />}>
          <div className="text-sm text-gray-600 mb-2 font-bold">Clique em uma barra para ver o detalhamento por Turno, Semana, Sábado e Domingo.<br/>Clique novamente para ver o Top 5 Motivos de Correção do mês.</div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthlyVolume} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" angle={-25} textAnchor="end" interval={0} height={80} tick={{ fontSize: 12 }} />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="total" name="Total" fill="#f59e42"
                onClick={handleBarClickMonth}
                cursor="pointer"
              />
              <Line type="monotone" dataKey="total" name="Tendência" stroke="#ef4444" strokeWidth={3} dot={true} activeDot={{ r: 5 }} />
            </BarChart>
          </ResponsiveContainer>
          {selectedMonth && (
            <div className="flex justify-end mt-6">
              <button
                className="px-4 py-2 bg-blue-800 text-white font-bold rounded hover:bg-blue-900 text-sm transition shadow"
                onClick={() => setSelectedMonth(null)}
              >
                Limpar seleção de mês e voltar para o período do calendário
              </button>
            </div>
          )}
        </ChartContainer>

        {/* Gráfico por Turno, Semana, Sábado e Domingo (sempre visível) */}
        <div ref={turnoChartRef}>
          <ChartContainer title={`Por Turno, Semana, Sábado e Domingo${selectedMonth ? ` (${selectedMonth})` : ''}`} icon={<BarChart3 className="w-6 h-6" />}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={selectedMonth ? shiftWeekTypeByMonth : shiftWeekType} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="turno" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="Semana" name="Semana" fill="#22c55e" />
                <Bar dataKey="Saturday" name="Sábado" fill="#a78bfa" />
                <Bar dataKey="Sunday" name="Domingo" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
            {selectedMonth && (
              <div className="flex justify-end mt-6">
                <button
                  className="px-4 py-2 bg-blue-800 text-white font-bold rounded hover:bg-blue-900 text-sm transition shadow"
                  onClick={() => setSelectedMonth(null)}
                >
                  Limpar seleção de mês e voltar para o período do calendário
                </button>
              </div>
            )}
          </ChartContainer>
        </div>

        {/* Top 5 CNPJ do mês selecionado */}
        {selectedMonth && (
          <ChartContainer title={`Top 5 CNPJs - ${selectedMonth}`} icon={<BarChart3 className="w-6 h-6" />}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={top5CNPJByMonth} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="total" />
                <YAxis 
                  type="category" 
                  dataKey="cnpj" 
                  width={180} 
                  tick={{ fontSize: 12, fontWeight: 'bold' }}
                  tickFormatter={(value) => formatarCNPJ(value)}
                />
                <RechartsTooltip 
                  formatter={(value) => value.toLocaleString('pt-BR')} 
                  labelFormatter={(label) => `CNPJ: ${formatarCNPJ(label)}`} 
                />
                <Bar 
                  dataKey="total" 
                  name="Total" 
                  fill="#38bdf8" 
                  cursor="pointer"
                  onClick={(data) => {
                    const cnpj = data.cnpj;
                    setSelectedCnpj(cnpj);
                    // Filtra os dados do mês e CNPJ
                    const dadosCnpjMes = filteredData.filter(row => {
                      if (!row.Data) return false;
                      const [m, a] = row.Data.split('-');
                      const mesAno = `${m.padStart(2, '0')}-${a}`;
                      return row.CNPJ === cnpj && mesAno === selectedMonth;
                    });
                    const motivos = analyzeCorrectionReasons(dadosCnpjMes).slice(0, 5).map(m => ({
                      motivo: m.motivo || m.name || '',
                      count: m.count
                    }));
                    setTop5MotivosByCnpj(motivos);
                    setShowMotivosByCnpjModal(true);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Gráfico Top 5 CNPJ do Destinatário - por período */}
        <ChartContainer title="Top 5 CNPJ do Destinatário - por período" icon={<BarChart3 className="w-6 h-6" />}>
          <div className="text-sm text-gray-600 mb-2 font-bold">Clique em uma barra para ver os Top 5 Motivos de Correção deste CNPJ.</div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={top5CNPJ} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="total" />
              <YAxis 
                type="category" 
                dataKey="cnpj" 
                width={180} 
                tick={{ fontSize: 12, fontWeight: 'bold' }}
                tickFormatter={(value) => formatarCNPJ(value)}
              />
              <RechartsTooltip 
                formatter={(value) => value.toLocaleString('pt-BR')} 
                labelFormatter={(label) => `CNPJ: ${formatarCNPJ(label)}`} 
              />
              <Bar dataKey="total" name="Total" fill="#38bdf8" onClick={handleBarClickCnpj} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Modal para Top 5 CNPJs da planta */}
      {showCnpjModal && (
        <Modal onClose={() => setShowCnpjModal(false)}>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Top 5 CNPJs - {selectedPlanta}</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNPJ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CORREÇÕES</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {top5CnpjPlanta.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatarCNPJ(row.cnpj)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.total.toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="mt-6 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-semibold" onClick={() => setShowCnpjModal(false)}>Fechar</button>
          </div>
        </Modal>
      )}

      {/* Modal para Top 5 Motivos de Correção do mês */}
      {showCnpjMonthModal && (
        <Modal onClose={() => setShowCnpjMonthModal(false)}>
          <div className="p-0 sm:p-6 animate-fadeIn">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-7 h-7 text-yellow-500" />
              <h2 className="text-xl font-bold">Top 5 Motivos de Correção - {selectedMonthForCnpj}</h2>
            </div>
            {/* Gráfico de barras horizontal sozinho */}
            <div className="w-full h-64 min-w-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top5MotivosMonth}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="count" />
                  <YAxis type="category" dataKey="motivo" width={200} tick={{ fontSize: 13 }} />
                  <RechartsTooltip formatter={(value) => value.toLocaleString('pt-BR')} labelFormatter={(label) => `Motivo: ${label}`} />
                  <Bar dataKey="count" fill="#f59e42" radius={[8, 8, 8, 8]} barSize={16} label={{ position: 'right', fill: '#333', fontWeight: 'bold', formatter: (v: number) => v.toLocaleString('pt-BR') }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-end mt-6">
              <button className="px-4 py-2 bg-blue-800 text-white font-bold rounded hover:bg-blue-900 text-sm transition shadow" onClick={() => setShowCnpjMonthModal(false)}>Fechar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal para Top 5 Motivos de Correção por CNPJ */}
      {showMotivosByCnpjModal && (
        <Modal onClose={() => setShowMotivosByCnpjModal(false)}>
          <div className="p-0 sm:p-6 animate-fadeIn">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-7 h-7 text-yellow-500" />
              <h2 className="text-xl font-bold">Top 5 Motivos de Correção - CNPJ {formatarCNPJ(selectedCnpj || '')}</h2>
            </div>
            <div className="w-full h-64 min-w-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top5MotivosByCnpj}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="count" />
                  <YAxis type="category" dataKey="motivo" width={200} tick={{ fontSize: 13 }} />
                  <RechartsTooltip formatter={(value) => value.toLocaleString('pt-BR')} labelFormatter={(label) => `Motivo: ${label}`} />
                  <Bar dataKey="count" fill="#f59e42" radius={[8, 8, 8, 8]} barSize={16} label={{ position: 'right', fill: '#333', fontWeight: 'bold', formatter: (v: number) => v.toLocaleString('pt-BR') }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-end mt-6">
              <button className="px-4 py-2 bg-blue-800 text-white font-bold rounded hover:bg-blue-900 text-sm transition shadow" onClick={() => setShowMotivosByCnpjModal(false)}>Fechar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CorrectionsDashboard;
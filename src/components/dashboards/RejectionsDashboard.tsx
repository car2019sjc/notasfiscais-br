import React, { useState, useMemo } from 'react';
import { Download, Filter, X, FileX, Loader2, BarChart3, PieChart, TrendingUp, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, ComposedChart, Line } from 'recharts';
import { Card } from '../ui/Card';
import { KPI } from '../ui/KPI';
import { ChartContainer } from '../ui/ChartContainer';
import { CustomTooltip } from '../ui/CustomTooltip';
import { ExecutiveTable } from '../ui/ExecutiveTable';
import { robustParseDate, dateToNumber } from '../../utils/dateUtils';
import { analyzeCancelationReasons, analyzeBotVsAnalysts, calculateMonthlyVolume, analyzeShiftDistribution, analyzeRejectionsByDayTypeAndShift, getTopCancelReasonsByPlant } from '../../utils/dataAnalysis';
import { BRIDGESTONE_COLORS, CHART_COLORS } from '../../constants';
import type { DateFilter } from '../../types';
import { Modal } from '../ui/Modal';

interface RejectionsDashboardProps {
  data: any[];
  sefazErrorMap: Map<string, string>;
  onExport: (analysis: any) => void;
}

export const RejectionsDashboard: React.FC<RejectionsDashboardProps> = ({ data, sefazErrorMap, onExport }) => {
  console.log('Primeiro registro dos dados brutos:', data[0]);

  // Pré-processa os dados para adicionar o campo mesAno (MM-AAAA)
  const preprocessedData = useMemo(() => {
    return data.map(row => {
      const date = robustParseDate(row['Data de modificação']);
      let mesAno = '';
      if (date) {
        const mes = (date.getMonth() + 1).toString().padStart(2, '0');
        const ano = date.getFullYear();
        mesAno = `${mes}-${ano}`;
      }
      return { ...row, mesAno };
    });
  }, [data]);

  const [dateFilter, setDateFilter] = useState<DateFilter>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 4);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  });
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showMotivosByTurnoModal, setShowMotivosByTurnoModal] = useState(false);
  const [selectedTurno, setSelectedTurno] = useState<string | null>(null);
  const [top5MotivosByTurno, setTop5MotivosByTurno] = useState<{ motivo: string, count: number }[]>([]);
  const [showAllReasons, setShowAllReasons] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [selectedTurnoDistribuicao, setSelectedTurnoDistribuicao] = useState<string | null>(null);
  const [showMotivosByTurnoTipoSemanaModal, setShowMotivosByTurnoTipoSemanaModal] = useState(false);
  const [top5MotivosByTurnoTipoSemana, setTop5MotivosByTurnoTipoSemana] = useState<{ motivo: string, count: number }[]>([]);
  const [selectedTipoSemana, setSelectedTipoSemana] = useState<string | null>(null);

  // Filtro de data otimizado usando mesAno
  const filteredData = useMemo(() => {
    if (!dateFilter.startDate && !dateFilter.endDate) return preprocessedData;
    const start = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
    const end = dateFilter.endDate ? new Date(dateFilter.endDate) : null;
    return preprocessedData.filter(row => {
      if (!row.mesAno) return false;
      const [mes, ano] = row.mesAno.split('-');
      if (!mes || !ano) return false;
      const dataRow = new Date(`${ano}-${mes}-01`);
      if (start && dataRow < start) return false;
      if (end && dataRow > end) return false;
      return true;
    });
  }, [preprocessedData, dateFilter]);
  
  const analysis = useMemo(() => {
    const botVsAnalysts = analyzeBotVsAnalysts(filteredData);
    const automationRate = botVsAnalysts.reduce((sum, d) => sum + (d.value || 0), 0) > 0 
      ? ((botVsAnalysts.find(d => d.name === 'Bot (Automação)')?.value || 0) / botVsAnalysts.reduce((sum, d) => sum + (d.value || 0), 0)) * 100 
      : 0;
    
    return {
      total: filteredData.length,
      topReasons: analyzeCancelationReasons(filteredData, sefazErrorMap),
      botVsAnalysts,
      automationRate,
      monthlyVolume: calculateMonthlyVolume(filteredData),
      shiftDistribution: analyzeShiftDistribution(filteredData),
      rejectionsByDayTypeAndShift: analyzeRejectionsByDayTypeAndShift(filteredData)
    };
  }, [filteredData, sefazErrorMap]);
  
  // Gera o volume mensal já com mesAno, sempre a partir dos dados filtrados pelo calendário
  const monthlyVolume = useMemo(() => {
    const counts: Record<string, { mesAno: string; bot: number; analistas: number; total: number }> = {};
    filteredData.forEach(row => {
      if (!row.mesAno) return;
      if (!counts[row.mesAno]) {
        counts[row.mesAno] = { mesAno: row.mesAno, bot: 0, analistas: 0, total: 0 };
      }
      const modificadoPor = (row['Modificado por'] || '').toUpperCase();
      if (modificadoPor.includes('NFERPABRAZIL') || modificadoPor.includes('S_RF_DFE') || modificadoPor.includes('RPA')) {
        counts[row.mesAno].bot += 1;
      } else {
        counts[row.mesAno].analistas += 1;
      }
      counts[row.mesAno].total += 1;
    });
    // Ordena por data
    return Object.values(counts).sort((a, b) => {
      const [mA, yA] = a.mesAno.split('-').map(Number);
      const [mB, yB] = b.mesAno.split('-').map(Number);
      return yA !== yB ? yA - yB : mA - mB;
    });
  }, [filteredData]);

  // Filtro por mês selecionado usando mesAno, sempre sobre os dados filtrados pelo calendário
  const filteredByMonth = useMemo(() => {
    if (!selectedMonth) return filteredData;
    return filteredData.filter(row => row.mesAno === selectedMonth);
  }, [filteredData, selectedMonth]);

  // Dados para o gráfico de rejeições por período e turno no mês
  const rejectionsByDayTypeAndShiftByMonth = useMemo(() => analyzeRejectionsByDayTypeAndShift(filteredByMonth), [filteredByMonth]);

  // Handler para clicar na barra do turno
  const handleBarClickTurno = (data: any) => {
    const turno = data.name;
    setSelectedTurno(turno);
    // Filtra os dados do mês e turno
    const motivos = analyzeCancelationReasons(
      filteredByMonth.filter(row => row['Turno'] === turno),
      sefazErrorMap
    ).slice(0, 5).map(m => ({
      motivo: m.motivo || m.name || '',
      count: m.count
    }));
    setTop5MotivosByTurno(motivos);
    setShowMotivosByTurnoModal(true);
  };

  // Tick customizado para motivos longos
  const CustomYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const motivo = payload.value;
    // Quebra a cada 32 caracteres
    const lines = motivo.match(/.{1,32}/g) || [];
    // Centraliza verticalmente
    const totalHeight = lines.length * 13;
    const startY = y - totalHeight / 2 + 10;
    // x negativo para alinhar totalmente à esquerda
    return (
      <g transform={`translate(${-180},${startY})`}>
        {lines.map((line: string, idx: number) => (
          <text key={idx} x={0} y={idx * 13} dy={0} textAnchor="start" fontSize="11" fill="#222">
            {line}
          </text>
        ))}
      </g>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-3xl font-bold" style={{ color: '#14489c' }}>
          Análise de Rejeições
        </h2>
        <button 
          onClick={() => onExport({
            topCancelReasons: analysis.topReasons,
            botVsAnalysts: analysis.botVsAnalysts,
            monthlyVolume: analysis.monthlyVolume,
            shiftDistribution: analysis.shiftDistribution,
            rejectionsByDayTypeAndShift: analysis.rejectionsByDayTypeAndShift
          })}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
        >
          <Download className="mr-2 h-5 w-5" />
          Exportar Análise
        </button>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-6 h-6 text-red-600" />
          <h3 className="text-xl font-bold text-gray-700">Filtros de Data</h3>
        </div>
        {isFilterLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-6 py-4 rounded-lg text-lg font-semibold shadow animate-pulse">
              Recarregando os dados... aguarde
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
              <label htmlFor="startDateRej" className="block text-sm font-bold text-gray-700 mb-2">
                Data de Início
              </label>
              <input 
                type="date" 
                name="startDate" 
                id="startDateRej" 
                value={dateFilter.startDate} 
                onChange={(e) => setDateFilter(p => ({...p, startDate: e.target.value}))} 
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 transition-all duration-300"
              />
            </div>
            <div>
              <label htmlFor="endDateRej" className="block text-sm font-bold text-gray-700 mb-2">
                Data de Fim
              </label>
              <input 
                type="date" 
                name="endDate" 
                id="endDateRej" 
                value={dateFilter.endDate} 
                onChange={(e) => setDateFilter(p => ({...p, endDate: e.target.value}))} 
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 transition-all duration-300"
              />
            </div>
            <div>
              <button 
                onClick={() => {
                  setIsFilterLoading(true);
                  setTimeout(() => {
                    setDateFilter({ startDate: '', endDate: '' });
                    setTimeout(() => setIsFilterLoading(false), 800);
                  }, 10);
                }} 
                className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105"
              >
                <X className="inline-block mr-2 h-4 w-4" />
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <KPI 
          title="Total de Cancelamentos" 
          value={analysis.total.toLocaleString('pt-BR')} 
          icon={<FileX className="w-6 h-6" />} 
          color={BRIDGESTONE_COLORS.primary} 
        />
        <KPI 
          title="Taxa de Automação" 
          value={`${analysis.automationRate.toFixed(1)}%`} 
          icon={<Loader2 className="w-6 h-6" />} 
          color={BRIDGESTONE_COLORS.info} 
        />
      </div>

      {/* Espaçamento entre blocos de gráficos */}
      <div className="mt-64"></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div>
          <ExecutiveTable 
            title="Top 1 a 5 Motivos de Cancelamento" 
            icon={<BarChart3 className="w-6 h-6" />} 
            data={analysis.topReasons.slice(0, 5)} 
            columns={[
              { header: "Motivo Padronizado", accessor: 'motivo' }, 
              { header: "Ocorrências", accessor: 'count' }
            ]} 
          />
        </div>
        <div>
          <ExecutiveTable 
            title="Top 6 a 10 Motivos" 
            icon={<BarChart3 className="w-5 h-5" />} 
            data={analysis.topReasons.slice(5, 10)} 
            columns={[
              { header: "Motivo", accessor: 'motivo' }, 
              { header: "Ocorrências", accessor: 'count' }
            ]} 
          />
        </div>
        
        <ChartContainer title="Bot vs. Sala de Guerra" icon={<PieChart className="w-6 h-6" />}>
          <ResponsiveContainer>
            <RechartsPieChart>
              <Pie 
                data={analysis.botVsAnalysts} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                outerRadius={120} 
                labelLine={false} 
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {analysis.botVsAnalysts.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Volume Mensal" icon={<TrendingUp className="w-6 h-6" />}>
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-gray-600 font-bold">Clique em uma barra para ver o gráfico mês a mês por turnos.</div>
            {selectedMonth && (
              <button
                className="px-4 py-2 bg-blue-800 text-white font-bold rounded hover:bg-blue-900 text-xs transition shadow"
                onClick={() => setSelectedMonth(null)}
              >
                Limpar seleção de mês
              </button>
            )}
          </div>
          <ResponsiveContainer>
            <ComposedChart data={monthlyVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mesAno" tickFormatter={(mesAno) => {
                if (!mesAno) return '';
                const [mes, ano] = mesAno.split('-');
                const data = new Date(Number(ano), Number(mes) - 1, 1);
                return data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
              }} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="bot" 
                stackId="a" 
                fill={BRIDGESTONE_COLORS.info} 
                name="Bot"
                cursor="pointer"
                onClick={(_, index) => {
                  setSelectedMonth(monthlyVolume[index].mesAno);
                }}
              />
              <Bar 
                dataKey="analistas" 
                stackId="a" 
                fill={BRIDGESTONE_COLORS.accent} 
                name="Analistas"
                cursor="pointer"
                onClick={(_, index) => {
                  setSelectedMonth(monthlyVolume[index].mesAno);
                }}
              />
              <Line type="monotone" dataKey="total" stroke={BRIDGESTONE_COLORS.primary} strokeWidth={3} name="Total" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
        {selectedMonth && (
          <ChartContainer title={`Rejeições por Período e Turno no mês: ${(() => {
            const [mes, ano] = selectedMonth.split('-');
            const data = new Date(Number(ano), Number(mes) - 1, 1);
            return data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          })()}`} icon={<CalendarDays className="w-6 h-6" />}>
            <ResponsiveContainer>
              <BarChart data={rejectionsByDayTypeAndShiftByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="Semana" fill={BRIDGESTONE_COLORS.info} name="Semana" />
                <Bar dataKey="Saturday" fill="#a78bfa" name="Sábado" />
                <Bar dataKey="Sunday" fill="#fbbf24" name="Domingo" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        <ChartContainer title={`Distribuição Geral por Turno por Período${dateFilter.startDate && dateFilter.endDate ? ` (${new Date(dateFilter.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })} - ${new Date(dateFilter.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })})` : ''}`} icon={<BarChart3 className="w-6 h-6" />}>
          <div className="text-sm text-gray-600 mb-2 font-bold">Clique em uma barra para ver a distribuição por turno na Semana.</div>
          <ResponsiveContainer>
            <BarChart data={analysis.shiftDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Volume" onClick={(data) => setSelectedTurnoDistribuicao(data.name)} cursor="pointer">
                {analysis.shiftDistribution.map((entry, idx) => {
                  let color = '#22c55e'; // T1 - verde claro
                  if (entry.name === 'T2') color = '#2563eb'; // T2 - azul
                  if (entry.name === 'T3') color = '#dc2626'; // T3 - vermelho
                  return <Cell key={`cell-${idx}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        {selectedTurnoDistribuicao && (
          <ChartContainer 
            title={`Distribuição por Semana, Sábado e Domingo - ${selectedTurnoDistribuicao}${dateFilter.startDate && dateFilter.endDate ? ` (${new Date(dateFilter.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })} - ${new Date(dateFilter.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })})` : ''}`} 
            icon={<BarChart3 className="w-6 h-6" />}>
              <div className="text-sm text-gray-600 mb-2 font-bold">Clique em uma barra para ver os Top 5 motivos de cancelamento desse segmento.</div>
              <div className="flex justify-end mb-2">
                <button className="px-3 py-1 bg-blue-800 text-white rounded text-xs font-bold hover:bg-blue-900 transition" onClick={() => setSelectedTurnoDistribuicao(null)}>
                  Limpar seleção
                </button>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={(() => {
                  const all = analyzeRejectionsByDayTypeAndShift(filteredData);
                  const turno = all.find(t => t.name === selectedTurnoDistribuicao);
                  return turno ? [
                    { tipo: 'Sem.', valor: turno.Semana },
                    { tipo: 'Sab.', valor: turno.Saturday },
                    { tipo: 'Dom.', valor: turno.Sunday }
                  ] : [];
                })()} layout="vertical" margin={{ top: 20, right: 40, left: 40, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" dataKey="valor" />
                  <YAxis type="category" dataKey="tipo" width={80} tick={{ fontSize: 14, fontWeight: 'bold' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" name="Volume" fill={
                    selectedTurnoDistribuicao === 'T1' ? '#22c55e' :
                    selectedTurnoDistribuicao === 'T2' ? '#2563eb' :
                    '#dc2626'
                  }
                    onClick={(_, idx) => {
                      const tipoSemanaMap: Record<string, string> = { 'Sem.': 'semana', 'Sab.': 'sábado', 'Dom.': 'domingo' };
                      const tipo = ['Sem.', 'Sab.', 'Dom.'][idx];
                      setSelectedTipoSemana(tipo);
                      const all = analyzeRejectionsByDayTypeAndShift(filteredData);
                      const turno = all.find(t => t.name === selectedTurnoDistribuicao);
                      let tipoSemana = tipoSemanaMap[tipo];
                      // Filtra os dados do período para o turno e tipo de semana
                      const motivos = analyzeCancelationReasons(
                        filteredData.filter(row => {
                          const turnoRow = row['Turno'];
                          const tipoSemanaRow = (row['Tipo Semana'] || '').toLowerCase();
                          return turnoRow === selectedTurnoDistribuicao && (
                            (tipoSemana === 'semana' && (tipoSemanaRow === 'semana' || tipoSemanaRow === 'week')) ||
                            (tipoSemana === 'sábado' && (tipoSemanaRow === 'sábado' || tipoSemanaRow === 'saturday')) ||
                            (tipoSemana === 'domingo' && (tipoSemanaRow === 'domingo' || tipoSemanaRow === 'sunday'))
                          );
                        }),
                        sefazErrorMap
                      ).slice(0, 5).map(m => ({ motivo: m.motivo || m.name || '', count: m.count }));
                      setTop5MotivosByTurnoTipoSemana(motivos);
                      setShowMotivosByTurnoTipoSemanaModal(true);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
        )}
      </div>

      {/* Modal para Top 5 Motivos de Cancelamento por Turno no mês */}
      {showMotivosByTurnoModal && (
        <Modal onClose={() => setShowMotivosByTurnoModal(false)}>
          <div className="p-0 sm:p-6 animate-fadeIn">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-7 h-7 text-red-500" />
              <h2 className="text-xl font-bold">Top 5 Motivos de Cancelamento - {selectedTurno} ({(() => {
                if (!selectedMonth) return '';
                const [mes, ano] = selectedMonth.split('-');
                const data = new Date(Number(ano), Number(mes) - 1, 1);
                return data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
              })()})</h2>
            </div>
            <div className="w-full min-w-[400px] max-w-[800px] h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top5MotivosByTurno}
                  layout="vertical"
                  margin={{ top: 20, right: 40, left: 20, bottom: 20 }}
                  barCategoryGap={32}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="count" />
                  <YAxis 
                    type="category" 
                    dataKey="motivo" 
                    width={200} 
                    tick={<CustomYAxisTick />}
                  />
                  <Tooltip formatter={(value) => value.toLocaleString('pt-BR')} labelFormatter={(label) => `Motivo: ${label}`} />
                  <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 8, 8]} barSize={18} label={{ position: 'right', fill: '#333', fontWeight: 'bold', formatter: (v: number) => v.toLocaleString('pt-BR') }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-end mt-6">
              <button className="px-4 py-2 bg-blue-800 text-white font-bold rounded hover:bg-blue-900 text-sm transition shadow" onClick={() => setShowMotivosByTurnoModal(false)}>Fechar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal para Top 5 Motivos de Cancelamento por Turno e Tipo de Semana */}
      {showMotivosByTurnoTipoSemanaModal && (
        <Modal onClose={() => setShowMotivosByTurnoTipoSemanaModal(false)}>
          <div className="p-0 sm:p-6 animate-fadeIn w-[600px] max-w-[95vw]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-7 h-7 text-red-500" />
              <h2 className="text-xl font-bold">Top 5 Motivos de Cancelamento - {selectedTurnoDistribuicao} / {selectedTipoSemana}</h2>
            </div>
            {top5MotivosByTurnoTipoSemana.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-500 text-lg font-semibold">Nenhum dado disponível para este período.</div>
            ) : (
              <div className="flex flex-row gap-4 items-start w-full h-64">
                <div className="flex flex-col justify-between h-full w-1/2 min-w-[220px]">
                  {top5MotivosByTurnoTipoSemana.map((item, idx) => (
                    <div key={idx} className="text-left text-xs text-gray-800 mb-2 break-words leading-snug">
                      {item.motivo}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col justify-between h-full w-1/4 min-w-[60px] items-end pr-2">
                  {top5MotivosByTurnoTipoSemana.map((item, idx) => (
                    <div key={idx} className="text-right text-base font-bold text-red-600 mb-2">
                      {item.count}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button className="px-4 py-2 bg-blue-800 text-white font-bold rounded hover:bg-blue-900 text-sm transition shadow" onClick={() => setShowMotivosByTurnoTipoSemanaModal(false)}>Fechar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
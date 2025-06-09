import { robustParseDate, dateToNumber } from './dateUtils';
import type { AnalysisData, CorrectionRow } from '../types';

export const standardizeErrorMessage = (msg: string): string => {
  if (typeof msg !== 'string' || !msg.trim()) return 'Motivo não especificado';
  
  const rules = [
    { 
      pattern: /tipo de emissãoalterado/i, 
      replacement: "Erro: Alteração do tipo de emissão da NF-e" 
    },
    { 
      pattern: /o valor '.*?' do campo '(.*?)' é inválido/i, 
      replacement: (m: RegExpMatchArray) => `Erro: Valor inválido no campo '${m[1]}'`
    },
    { 
      pattern: /rejeição:\s*(.*)/i, 
      replacement: (m: RegExpMatchArray) => `Rejeição SEFAZ: ${m[1].split('.')[0]}`
    },
    { 
      pattern: /o status da nf-e.*?foi alterado para erro/i, 
      replacement: "Status da NF-e alterado para Erro na SEFAZ"
    },
    { 
      pattern: /<|>/, 
      replacement: 'Erro de formatação (HTML/XML na mensagem)'
    },
    { 
      pattern: /line number|column number/i, 
      replacement: 'Erro de estrutura do arquivo (Linha/Coluna)'
    },
    { 
      pattern: /sefaz/i, 
      replacement: 'Erro de comunicação com a SEFAZ'
    },
  ];
  
  for (const rule of rules) {
    const match = msg.match(rule.pattern);
    if (match) {
      return typeof rule.replacement === 'function' 
        ? rule.replacement(match) 
        : rule.replacement;
    }
  }
  
  return msg.substring(0, 100) + (msg.length > 100 ? '...' : '');
};

export const analyzeCancelationReasons = (data: any[], sefazErrorMap: Map<string, string>): AnalysisData[] => {
  const reasonCounts = data.reduce((acc, row) => {
    let reasonFound = false;
    const statusCode = row['Código status'];
    
    if (statusCode && sefazErrorMap.has(String(statusCode).trim())) {
      let reason = sefazErrorMap.get(String(statusCode).trim()) || '';
      reason = reason.replace(/^rejei[cç][ãa]o:\s*/i, '');
      acc[`Rejeição: ${reason}`] = (acc[`Rejeição: ${reason}`] || 0) + 1;
      reasonFound = true;
    }
    
    if (!reasonFound) {
      const textReasons = [
        row['Motivo para estorno/não utilização'],
        row['Motivo para estorno/não utilização__1'],
        row['Motivo para estorno/não utilização__2'],
        row['Motivo para estorno/não utilização__3'],
        row['Motivo para estorno/não utilização__4'],
      ];
      
      for (const textReason of textReasons) {
        if (textReason && typeof textReason === 'string' && textReason.trim() !== '' && textReason.trim() !== 'N/A') {
          const cleanedReason = standardizeErrorMessage(textReason);
          acc[cleanedReason] = (acc[cleanedReason] || 0) + 1;
          break;
        }
      }
    }
    
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(reasonCounts)
    .map(([motivo, count]) => ({ motivo, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

export const analyzeBotVsAnalysts = (data: any[]): AnalysisData[] => {
  const distribution = data.reduce((acc, row) => {
    const modifiedBy = (row['Modificado por'] || '').toUpperCase();
    let category = 'Outros';
    
    if (modifiedBy.includes('NFERPABRAZIL') || modifiedBy.includes('S_RF_DFE') || modifiedBy.includes('RPA')) {
      category = 'Bot (Automação)';
    } else if (modifiedBy.includes('KATIANE') || modifiedBy.includes('CAROLAINE') || modifiedBy.includes('SOUZA')) {
      category = 'Sala de Guerra';
    }
    
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, { 'Bot (Automação)': 0, 'Sala de Guerra': 0, 'Outros': 0 } as Record<string, number>);
  
  return Object.entries(distribution).map(([name, value]) => ({ name, value: Number(value), count: Number(value) }));
};

export const calculateMonthlyVolume = (data: any[]) => {
  const monthlyData = data.reduce((acc, row) => {
    const date = robustParseDate(row['Data de modificação']);
    if (!date) return acc;
    
    const monthKey = date.toLocaleDateString('pt-BR', { year: '2-digit', month: 'short' });
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        dateObj: new Date(date.getFullYear(), date.getMonth(), 1),
        mes: monthKey,
        total: 0,
        bot: 0,
        analistas: 0
      };
    }
    
    acc[monthKey].total += 1;
    
    const modifiedBy = (row['Modificado por'] || '').toUpperCase();
    if (modifiedBy.includes('NFERPABRAZIL') || modifiedBy.includes('S_RF_DFE')) {
      acc[monthKey].bot += 1;
    } else {
      acc[monthKey].analistas += 1;
    }
    
    return acc;
  }, {} as Record<string, any>);
  
  return Object.values(monthlyData).sort((a, b) => a.dateObj - b.dateObj);
};

export const analyzeShiftDistribution = (data: any[]): AnalysisData[] => {
  const shiftCounts = data.reduce((acc, row) => {
    const shift = row['Turno'];
    if (shift && ['T1', 'T2', 'T3'].includes(shift)) {
      acc[shift] = (acc[shift] || 0) + 1;
    }
    return acc;
  }, { T1: 0, T2: 0, T3: 0 } as Record<string, number>);
  
  return Object.entries(shiftCounts).map(([name, value]) => ({ name, value: Number(value), count: Number(value) }));
};

export const analyzeRejectionsByDayTypeAndShift = (data: any[]) => {
  const result = {
    T1: { 'Semana': 0, 'Saturday': 0, 'Sunday': 0 },
    T2: { 'Semana': 0, 'Saturday': 0, 'Sunday': 0 },
    T3: { 'Semana': 0, 'Saturday': 0, 'Sunday': 0 },
  };
  
  data.forEach(row => {
    const shift = row['Turno'];
    const dayTypeRaw = row['Tipo Semana'];
    if (shift && result[shift as keyof typeof result] && dayTypeRaw) {
      const dayType = (dayTypeRaw || '').toLowerCase();
      if (dayType === 'week' || dayType === 'semana') result[shift]['Semana'] += 1;
      if (dayType === 'saturday' || dayType === 'sábado') result[shift]['Saturday'] += 1;
      if (dayType === 'sunday' || dayType === 'domingo') result[shift]['Sunday'] += 1;
    }
  });
  
  return Object.keys(result).map(shift => ({
    name: shift,
    Semana: result[shift]['Semana'],
    Saturday: result[shift]['Saturday'],
    Sunday: result[shift]['Sunday'],
  }));
};

export function analyzeCorrectionsByPlant(data: CorrectionRow[]): AnalysisData[] {
  const plantCounts: Record<string, number> = {};
  
  data.forEach(row => {
    const planta = row.Planta;
    if (!planta) return;
    
    plantCounts[planta] = (plantCounts[planta] || 0) + 1;
  });
  
  return Object.entries(plantCounts)
    .map(([name, value]) => ({ name, value: Number(value), count: Number(value) }))
    .sort((a, b) => Number(b.value) - Number(a.value));
}

export function analyzeCorrectionReasons(data: any[]): AnalysisData[] {
  const reasonCounts: Record<string, number> = {};

  data.forEach(row => {
    const motivo = (row['Texto/ Motivo'] || row['Texto/Motivo'] || row['Motivo'] || row['motivo'] || '').trim();
    if (!motivo) return;

    // Padroniza o motivo removendo "Correção:" do início
    const motivoPadronizado = motivo.replace(/^Correção:\s*/i, '').trim();
    
    // Agrupa motivos similares
    let motivoFinal = motivoPadronizado;
    
    // Agrupa por tipo de correção
    if (motivoPadronizado.match(/peso.*?(\d+)/i)) {
      motivoFinal = 'Correção de Peso';
    } else if (motivoPadronizado.match(/pall?et/i)) {
      motivoFinal = 'Correção de Quantidade de Pallets';
    } else if (motivoPadronizado.match(/nfe|nota fiscal/i)) {
      motivoFinal = 'Correção de Documentação Fiscal';
    } else if (motivoPadronizado.match(/transportadora|placa/i)) {
      motivoFinal = 'Correção de Transporte';
    } else if (motivoPadronizado.match(/container|local de entrega/i)) {
      motivoFinal = 'Correção de Local/Container';
    }

    reasonCounts[motivoFinal] = (reasonCounts[motivoFinal] || 0) + 1;
  });

  return Object.entries(reasonCounts)
    .map(([motivo, count]) => ({ motivo, count: Number(count), name: motivo, value: Number(count) }))
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, 10);
}

export function getTopCancelReasonsByPlant(data: any[]): Record<string, { motivo: string; count: number }[]> {
  const motivosPorPlanta: Record<string, Record<string, number>> = {};

  data.forEach(row => {
    const planta = row['Planta'] || row['planta'] || row['Plant'] || row['PLANTA'];
    const motivo = row['Motivo Padronizado'] || row['motivo'] || row['Motivo'];
    if (!planta || !motivo) return;
    if (!motivosPorPlanta[planta]) motivosPorPlanta[planta] = {};
    motivosPorPlanta[planta][motivo] = (motivosPorPlanta[planta][motivo] || 0) + 1;
  });

  const resultado: Record<string, { motivo: string; count: number }[]> = {};
  Object.entries(motivosPorPlanta).forEach(([planta, motivos]) => {
    resultado[planta] = Object.entries(motivos)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  });

  return resultado;
}

// Volume Mensal para Correções
export function calculateMonthlyVolumeCorrections(data: any[]) {
  const monthlyData = data.reduce((acc, row) => {
    if (!row.Data) return acc;
    const [mes, ano] = row.Data.split('-');
    if (!mes || !ano) return acc;
    const key = `${mes.padStart(2, '0')}-${ano}`;
    if (!acc[key]) {
      acc[key] = { mes: key, total: 0 };
    }
    acc[key].total += 1;
    return acc;
  }, {} as Record<string, { mes: string; total: number }>);
  return Object.values(monthlyData).sort((a, b) => {
    const [mA, yA] = a.mes.split('-').map(Number);
    const [mB, yB] = b.mes.split('-').map(Number);
    return yA !== yB ? yA - yB : mA - mB;
  });
}

// Distribuição por Turno e Tipo Semana para Correções
export function analyzeCorrectionsByShiftAndWeekType(data: any[]) {
  // Estrutura: { T1: { Semana: 0, Saturday: 0, Sunday: 0 }, ... }
  const result = {
    T1: { Semana: 0, Saturday: 0, Sunday: 0 },
    T2: { Semana: 0, Saturday: 0, Sunday: 0 },
    T3: { Semana: 0, Saturday: 0, Sunday: 0 },
  };
  data.forEach(row => {
    const turno = row.Turno;
    const tipoSemana = (row['Tipo Semana'] || '').toLowerCase();
    if (['t1', 't2', 't3'].includes((turno || '').toLowerCase())) {
      const t = turno.toUpperCase();
      if (tipoSemana === 'semana' || tipoSemana === 'week') result[t].Semana += 1;
      if (tipoSemana === 'sábado' || tipoSemana === 'saturday') result[t].Saturday += 1;
      if (tipoSemana === 'domingo' || tipoSemana === 'sunday') result[t].Sunday += 1;
    }
  });
  return Object.keys(result).map(turno => ({
    turno,
    Semana: result[turno].Semana,
    Saturday: result[turno].Saturday,
    Sunday: result[turno].Sunday,
  }));
}

// Top 5 CNPJ do Destinatário (coluna H)
export function getTop5CNPJDestinatario(data: any[]) {
  const counts: Record<string, number> = {};
  data.forEach(row => {
    const cnpj = row['CNPJ Destinatário'] || row['CNPJ do Destinatário'] || row['CNPJ'] || row['Destinatário'] || row['H'] || '';
    if (!cnpj) return;
    counts[cnpj] = (counts[cnpj] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([cnpj, total]) => ({ cnpj, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}
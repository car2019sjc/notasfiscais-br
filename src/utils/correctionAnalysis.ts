import type { CorrectionRow, OffenderSummary, PlantaOffenders } from '../types/corrections';

/**
 * Valida se um CNPJ é válido
 * @param cnpj CNPJ a ser validado
 * @returns true se o CNPJ for válido
 */
export function isValidCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  if (cleanCNPJ.length !== 14) return false;

  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (digit !== parseInt(cleanCNPJ[12])) return false;

  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (digit !== parseInt(cleanCNPJ[13])) return false;

  return true;
}

/**
 * Formata um CNPJ para exibição
 * @param cnpj CNPJ a ser formatado
 * @returns CNPJ formatado (XX.XXX.XXX/XXXX-XX)
 */
export function formatCNPJ(cnpj: string): string {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  return cleanCNPJ.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Obtém os top N CNPJs com mais correções por planta
 * @param data Array de correções
 * @param planta Planta a ser considerada
 * @returns Mapa de plantas para array de resumos de CNPJs
 */
export function getTopCNPJsByPlanta(
  data: CorrectionRow[],
  planta: string
): PlantaOffenders {
  const offenders: PlantaOffenders = {};
  
  // Agrupa correções por CNPJ
  data.forEach(row => {
    if (row.Planta !== planta || !isValidCNPJ(row.CNPJ)) return;
    
    if (!offenders[planta]) {
      offenders[planta] = [];
    }
    
    const existingOffender = offenders[planta].find(o => o.cnpj === row.CNPJ);
    if (existingOffender) {
      existingOffender.count++;
    } else {
      offenders[planta].push({
        cnpj: row.CNPJ,
        count: 1
      });
    }
  });
  
  // Ordena por número de correções
  if (offenders[planta]) {
    offenders[planta].sort((a, b) => b.count - a.count);
  }
  
  return offenders;
}

/**
 * Gera um resumo estatístico das correções
 * @param data Array de correções
 * @returns Resumo estatístico
 */
export const generateCorrectionStats = (data: CorrectionRow[]) => {
  const topCNPJs = getTopCNPJsByPlanta(data);
  const stats = {
    totalPlantas: Object.keys(topCNPJs).length,
    totalCNPJs: Object.values(topCNPJs).reduce(
      (acc, offenders) => acc + offenders.length,
      0
    ),
    topOffenders: Object.entries(topCNPJs).reduce(
      (acc, [planta, offenders]) => {
        if (offenders.length > 0) {
          acc[planta] = {
            cnpj: offenders[0].cnpj,
            total: offenders[0].total,
            motivos: offenders[0].motivos
          };
        }
        return acc;
      },
      {} as Record<string, { cnpj: string; total: number; motivos: Record<string, number> }>
    )
  };

  return stats;
}; 
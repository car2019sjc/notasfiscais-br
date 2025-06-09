export interface CorrectionRow {
  Data: string;
  Planta: string;
  CNPJ: string;
  Motivo: string;
}

export interface OffenderSummary {
  cnpj: string;
  count: number;
}

export interface PlantaOffenders {
  [planta: string]: OffenderSummary[];
}

export interface AnalysisData {
  name: string;
  value: number;
} 
export interface ProcessedData {
  rejectionsData: any[];
  correctionsData: any[];
  sefazErrorMap: Map<string, string>;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface DateFilter {
  startDate: string;
  endDate: string;
}

export interface AnalysisData {
  motivo?: string;
  count: number;
  name?: string;
  value?: number;
}

export interface KPIData {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

export interface TableColumn {
  header: string;
  accessor: string;
  className?: string;
}

export * from './corrections';
import { getTopCNPJsByPlanta, isValidCNPJ, formatCNPJ, generateCorrectionStats } from '../correctionAnalysis';
import { CorrectionRow } from '../../types/corrections';

describe('Correction Analysis', () => {
  describe('isValidCNPJ', () => {
    it('deve validar CNPJs corretamente', () => {
      expect(isValidCNPJ('11.444.777/0001-61')).toBe(true);
      expect(isValidCNPJ('11444777000161')).toBe(true);
      expect(isValidCNPJ('11.444.777/0001-62')).toBe(false);
      expect(isValidCNPJ('123')).toBe(false);
      expect(isValidCNPJ('')).toBe(false);
    });
  });

  describe('formatCNPJ', () => {
    it('deve formatar CNPJs corretamente', () => {
      expect(formatCNPJ('11444777000161')).toBe('11.444.777/0001-61');
      expect(formatCNPJ('11.444.777/0001-61')).toBe('11.444.777/0001-61');
    });
  });

  describe('getTopCNPJsByPlanta', () => {
    const mockData: CorrectionRow[] = [
      { Planta: 'P1', CNPJ: '11444777000161', MotivoTax: 'Erro1' },
      { Planta: 'P1', CNPJ: '11444777000161', MotivoTax: 'Erro2' },
      { Planta: 'P1', CNPJ: '11444777000161', MotivoTax: 'Erro1' },
      { Planta: 'P2', CNPJ: '11444777000162', MotivoTax: 'Erro1' },
      { Planta: 'P2', CNPJ: '11444777000163', MotivoTax: 'Erro2' },
      { Planta: 'P2', CNPJ: '11444777000163', MotivoTax: 'Erro2' },
    ];

    it('deve retornar os top N CNPJs por planta', () => {
      const result = getTopCNPJsByPlanta(mockData, 2);

      expect(result['P1']).toHaveLength(1);
      expect(result['P2']).toHaveLength(2);
      expect(result['P1'][0].total).toBe(3);
      expect(result['P2'][0].total).toBe(2);
    });

    it('deve ignorar registros inválidos', () => {
      const invalidData = [
        ...mockData,
        { Planta: '', CNPJ: '11444777000161', MotivoTax: 'Erro1' },
        { Planta: 'P1', CNPJ: '', MotivoTax: 'Erro1' },
        { Planta: 'P1', CNPJ: '11444777000161', MotivoTax: '' },
        { Planta: 'P1', CNPJ: '123', MotivoTax: 'Erro1' },
      ];

      const result = getTopCNPJsByPlanta(invalidData, 2);
      expect(result['P1'][0].total).toBe(3);
    });
  });

  describe('generateCorrectionStats', () => {
    const mockData: CorrectionRow[] = [
      { Planta: 'P1', CNPJ: '11444777000161', MotivoTax: 'Erro1' },
      { Planta: 'P1', CNPJ: '11444777000161', MotivoTax: 'Erro2' },
      { Planta: 'P2', CNPJ: '11444777000162', MotivoTax: 'Erro1' },
    ];

    it('deve gerar estatísticas corretas', () => {
      const stats = generateCorrectionStats(mockData);

      expect(stats.totalPlantas).toBe(2);
      expect(stats.totalCNPJs).toBe(2);
      expect(stats.topOffenders['P1'].total).toBe(2);
      expect(stats.topOffenders['P2'].total).toBe(1);
    });
  });
}); 
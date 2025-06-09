# Documentação do Dashboard de Correções Fiscais

## Visão Geral

Este aplicativo é um dashboard interativo desenvolvido em **React** para análise de correções fiscais, com foco em clareza visual, interatividade e apresentação profissional dos dados. Utiliza principalmente a biblioteca **Recharts** para gráficos e componentes customizados para modais, tabelas e filtros.

---

## Estrutura de Pastas e Arquivos Principais

```
src/
├── components/
│   ├── dashboards/
│   │   └── CorrectionsDashboard.tsx   // Dashboard principal de correções
│   ├── ui/
│   │   ├── Card.tsx
│   │   ├── ChartContainer.tsx
│   │   ├── CustomTooltip.tsx
│   │   ├── ExecutiveTable.tsx
│   │   ├── ExecutiveChart.tsx
│   │   ├── KPI.tsx
│   │   └── Modal.tsx
│   └── BridgestoneLogo.tsx
├── utils/
│   ├── dataAnalysis.ts                // Funções de análise e agrupamento de dados
│   └── correctionAnalysis.ts          // Funções auxiliares para CNPJ e planta
├── types/
│   ├── index.ts                       // Tipos globais
│   └── corrections.ts                 // Tipos específicos de correções
├── constants.ts                       // Cores e constantes visuais
└── App.tsx                            // Componente raiz
```

---

## Componentes e Funções Principais

### 1. CorrectionsDashboard.tsx

- **Filtros de Data:** Permite selecionar o período de análise (padrão: últimos 4 meses).
- **KPI Cards:** Exibe totais de correções, plantas ativas e CNPJs.
- **Gráficos:**
  - **Top 10 Motivos de Correção:** Dividido em Top 1-5 e Top 6-10.
  - **Correções por Planta:** Barras verticais, interativo.
  - **Volume Mensal:** Barras + linha de tendência, interativo.
  - **Por Turno, Semana, Sábado e Domingo:** Barras empilhadas.
  - **Top 5 CNPJ do Destinatário - por período:** Barras horizontais, interativo.
  - **Top 5 CNPJs - [mês/ano]:** Barras horizontais, interativo.
- **Modais:**
  - **Top 5 CNPJs da Planta:** Tabela detalhada.
  - **Top 5 Motivos de Correção do mês:** Gráfico horizontal.
  - **Top 5 Motivos de Correção por CNPJ:** Gráfico horizontal.

#### Principais Funções

- **formatarCNPJ:** Formata o CNPJ para o padrão brasileiro.
- **handleBarClickMonth:** Abre modal de motivos do mês ao clicar em barra do volume mensal.
- **handleBarClickCnpj:** Abre modal de motivos ao clicar em barra de CNPJ.
- **Filtros e useMemo:** Otimizam o processamento dos dados conforme seleção do usuário.

---

### 2. Gráficos (Recharts)

- **BarChart:** Usado para todos os gráficos de barras (verticais e horizontais).
- **Line:** Linha de tendência no gráfico de volume mensal.
- **ResponsiveContainer:** Garante responsividade dos gráficos.
- **CustomTooltip:** Tooltips customizados para melhor leitura dos dados.

#### Personalizações

- **Cores:** Definidas em `constants.ts` para padronização visual.
- **Labels em Negrito:** Eixos Y dos gráficos de CNPJ usam fonte em negrito.
- **Tooltips:** Mostram CNPJ formatado e valores em pt-BR.

---

### 3. Modais

- **Modal.tsx:** Componente reutilizável para exibir detalhes (motivos, CNPJs, etc).
- **Abertura:** Sempre disparada por eventos de clique nos gráficos.
- **Fechamento:** Botão "Fechar" em destaque.

---

### 4. Funções de Análise de Dados

Localizadas em `src/utils/dataAnalysis.ts` e `src/utils/correctionAnalysis.ts`:

- **analyzeCorrectionReasons:** Agrupa e padroniza motivos de correção.
- **getTop5CNPJDestinatario:** Retorna os 5 CNPJs mais frequentes.
- **calculateMonthlyVolumeCorrections:** Gera dados para o gráfico de volume mensal.
- **analyzeCorrectionsByPlant:** Agrupa correções por planta.
- **analyzeCorrectionsByShiftAndWeekType:** Agrupa por turno e tipo de semana.

---

## Dicas para Localização e Melhoria

- **Adicionar novos gráficos:** Use o padrão de `ChartContainer` e consulte exemplos já existentes.
- **Adicionar novos filtros:** Siga o padrão dos filtros de data, usando useState e useMemo.
- **Padronização visual:** Utilize as cores e estilos definidos em `constants.ts` e classes Tailwind.
- **Novos modais:** Reutilize o componente `Modal.tsx` e siga o padrão de abertura via eventos de clique.
- **Novos campos/tabelas:** Adicione colunas em `ExecutiveTable` e ajuste os tipos em `types/`.
- **Funções de análise:** Centralize novas lógicas em `utils/dataAnalysis.ts` para manter o código organizado.

---

## Sugestões de Melhoria

- **Internacionalização:** Adicionar suporte a outros idiomas.
- **Exportação Avançada:** Permitir exportar gráficos como imagem ou PDF.
- **Filtros Avançados:** Filtros por planta, motivo, turno, etc.
- **Dashboard Responsivo:** Melhorar experiência mobile.
- **Testes Automatizados:** Adicionar testes unitários para funções de análise.

---

## Como Encontrar Qualquer Parte

- **Gráficos:** Procure por `<ChartContainer` e `<BarChart` em `CorrectionsDashboard.tsx`.
- **Modais:** Procure por `<Modal` e funções `setShow...Modal`.
- **Funções de análise:** Estão em `src/utils/dataAnalysis.ts`.
- **Tipos:** Estão em `src/types/`.
- **Cores e estilos:** `src/constants.ts` e classes Tailwind no JSX.

---

Se quiser exemplos de código para cada parte, ou detalhamento de outros módulos, é só pedir! 
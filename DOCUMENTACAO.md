# Documentação do Dashboard de Correções e Rejeições Fiscais

## Visão Geral

Dashboard interativo em **React** para análise de notas fiscais (correções e rejeições), com foco em clareza visual, interatividade e experiência profissional. Utiliza **Recharts** para gráficos, **Tailwind CSS** para estilos e componentes customizados para modais, tabelas e filtros.

---

## Estrutura de Pastas e Componentes

```
src/
├── components/
│   ├── dashboards/
│   │   ├── CorrectionsDashboard.tsx   // Dashboard de correções
│   │   └── RejectionsDashboard.tsx    // Dashboard de rejeições
│   ├── ui/
│   │   ├── Card.tsx, ChartContainer.tsx, CustomTooltip.tsx, ExecutiveTable.tsx, ExecutiveChart.tsx, KPI.tsx, Modal.tsx, UploadZone.tsx
│   └── BridgestoneLogo.tsx           // (substituído por texto)
├── utils/
│   ├── dataAnalysis.ts                // Funções de análise de dados
│   └── correctionAnalysis.ts          // Funções auxiliares
├── types/                             // Tipos globais e específicos
├── constants.ts                       // Cores e constantes visuais
├── App.tsx                            // Componente raiz (layout, navegação, upload, loading)
└── index.css                          // Estilos globais (Tailwind)
```

---

## Funcionalidades e Fluxos

### Upload e Processamento
- Upload de arquivos de rejeições e correções.
- Mensagem de processamento e loading.
- Barra de progresso e feedback visual.

### Filtros e Navegação
- Filtro de data padrão: últimos 4 meses.
- Troca de abas com mensagem de recarregamento.
- Navegação entre Upload, Análise de Rejeições e Análise de Correções.

### Gráficos e Cards

#### Rejeições
- **Distribuição Geral por Turno por Período:** Barras coloridas (T1: verde claro, T2: azul, T3: vermelho).
- **Volume Mensal:** Barras empilhadas por origem (Bot/Analistas) + linha de tendência.
- **Rejeições por Período e Turno no mês:** Barras empilhadas por Semana, Sábado, Domingo (sem interação).
- **Distribuição por Semana, Sábado e Domingo:** Ao clicar em uma barra do gráfico de turnos, exibe gráfico horizontal com cor do turno selecionado. Ao clicar em uma barra, exibe modal com Top 5 motivos de cancelamento daquele turno/tipo de semana.
- **Top 5 Motivos:** Modal com motivos e número de ocorrências em vermelho, texto totalmente à esquerda.

#### Correções
- **Top 10 Motivos de Correção:** Tabelas (Top 1-5 e Top 6-10).
- **Correções por Planta:** Barras verticais.
- **Volume Mensal:** Barras + linha de tendência.
- **Por Turno, Semana, Sábado e Domingo:** Barras empilhadas.
- **Top 5 CNPJ do Destinatário:** Barras horizontais, interativo.

### Modais
- **Top 5 Motivos:** Modal limpo, motivos à esquerda, número de ocorrências à direita em vermelho.
- **Top 5 CNPJs:** Modal com tabela detalhada.
- **Fechamento:** Botão "Fechar" em destaque.

---

## Personalização Visual

- **Cores dos turnos:** T1 (verde claro), T2 (azul), T3 (vermelho).
- **Botões:** Azul escuro, hover destacado.
- **Cards de upload:** Hover laranja, ícones e textos em azul escuro.
- **Mensagens:** Loading, processamento, instruções de clique nos gráficos.
- **Responsividade:** Gráficos e cards adaptam-se a diferentes tamanhos de tela.

---

## Pontos de Localização Rápida

- **Cards de Upload:** `src/components/ui/UploadZone.tsx`
- **Cards de Motivos:** `CorrectionsDashboard.tsx` e `RejectionsDashboard.tsx`
- **Funções de Análise:** `src/utils/dataAnalysis.ts`
- **Modais:** `src/components/ui/Modal.tsx`
- **Mensagens de Loading:** `App.tsx`
- **Navegação:** `App.tsx`

---

## Dicas para Evolução

- **Adicionar novos gráficos:** Use `ChartContainer` e siga exemplos existentes.
- **Novos filtros:** Siga o padrão dos filtros de data.
- **Novos modais:** Reutilize `Modal.tsx`.
- **Padronização visual:** Use cores de `constants.ts` e classes Tailwind.
- **Funções de análise:** Centralize em `utils/dataAnalysis.ts`.

---

## Observações Finais

- O sistema é modular e preparado para expansão.
- Todos os gráficos e cards seguem padrão visual e de interação.
- O código está organizado para facilitar manutenção e evolução.

---

**Última atualização:** 2024-06

Se precisar de exemplos de código, detalhamento de outros módulos ou quiser expandir a documentação, é só pedir! 
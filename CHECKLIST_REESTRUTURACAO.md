# 📋 Checklist Geral de Reestruturação — Compras Plus

---

## 🚀 FASE 1: Fundação, Autenticação Obrigatória, Supabase & Sync Engine

### 1.1 Configuração do Ambiente e Tipagem
- [x] Atualizar `package.json` com `react`, `react-dom`, `zustand`, `lucide-react`, `typescript`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`.
- [x] Criar `tsconfig.json` configurado com path alias `@/*` apontando para `src/*`.
- [x] Atualizar `vite.config.ts` com plugin do React e leitura das variáveis oficiais `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- [x] Padronizar `.env` e `.env.example` com o prefixo oficial `VITE_`.

### 1.2 Banco de Dados & RLS no Supabase
- [x] Criar script `supabase/migrations/001_sync_operations.sql`:
  - [x] Tabela `sync_operations` (id UUID, user_id UUID, operation_type, entity_type, entity_id, payload, status, attempts, error_message, created_at, processed_at).
  - [x] RLS restrito: inserção permitida somente para `auth.uid() = user_id` e `status = 'pending'`.
  - [x] Bloqueio de UPDATE/DELETE direto pelo cliente (apenas RPC autorizada pode alterar status).
  - [x] RPC `process_sync_operation` com idempotência baseada no `operation_id`.

### 1.3 Cliente Supabase & Fila de Sincronização (`src/lib/sync/`)
- [x] Criar `src/lib/supabase.ts` com cliente tipado, auto-refresh de token e persistência no `localStorage`.
- [x] Criar `src/lib/sync/syncTypes.ts` (definição de tipos de operação, estados da máquina e payloads).
- [x] Criar `src/lib/sync/syncStorage.ts` (armazenamento local dedicado no IndexedDB para fila offline).
- [x] Criar `src/lib/sync/syncQueue.ts` (enfileiramento com geração de UUID idempotente).
- [x] Criar `src/lib/sync/syncEngine.ts` (máquina de estados: `pending` → `processing` → `synced` / `failed` com exponential backoff: 1s, 2s, 4s, 8s, 16s).
- [x] Criar `src/lib/sync/conflictResolver.ts` (Last-Write-Wins baseado em `updated_at` para compras).
- [x] Criar `src/lib/sync/syncManager.ts` (escuta status de rede `online` / `offline` e dispara o engine automaticamente).

### 1.4 Módulo de Autenticação Obrigatória (`src/modules/auth/`)
- [x] Criar `auth.store.ts` (Zustand com estado do usuário autenticado e status de carregamento).
- [x] Criar `auth.service.ts` (funções de login, cadastro, logout e redefinição de senha).
- [x] Criar componentes de tela:
  - [x] `LoginForm.tsx`
  - [x] `RegisterForm.tsx`
  - [x] `AuthScreen.tsx` (com modal de recuperação de senha)
- [x] Criar `AuthGuard.tsx` (redirecionamento obrigatório para login se não houver sessão ativa).

### 1.5 Splash Screen
- [x] Implementar a Splash Screen animada oficial no aplicativo web e Android (`public/splash.html` e `src/components/SplashScreen.tsx`).

### 1.6 Validação da Fase 1
- [x] Executar `npm install` para instalar as novas dependências (Concluído: 52 pacotes adicionados com 0 vulnerabilidades).
- [x] Executar checagem de tipos com `npx tsc --noEmit` / `npm run check` (Concluído: 0 erros de tipagem).
- [x] Validar build de produção (`npx vite build`) e sincronização para `www/` (Concluído: bundle gerado em 10.2s e sincronizado para o Capacitor).

---

## 🛒 FASE 2: Módulo de Compras (Shopping) & Realtime Cirúrgico

### 2.1 Modelagem e Repositórios
- [x] Definir interfaces TypeScript em `src/modules/shopping/types.ts` (`ShoppingList`, `ShoppingItem`, `ShoppingTotals`).
- [x] Criar `shopping.repository.ts` (comunicação direta com o Supabase com RLS).
- [x] Criar `shopping.service.ts` (camada de aplicação que atualiza Zustand otimisticamente e enfileira no sync caso offline).

### 2.2 Gerenciamento de Estado (Zustand)
- [x] Criar `shopping.store.ts` com ações atômicas:
  - [x] `setLists`, `addList`, `updateListInStore`, `removeListFromStore`.
  - [x] `addItemToActiveList`, `updateItemInActiveList`, `toggleItemCheckedInActiveList`, `removeItemFromActiveList`.
  - [x] `calculateListTotals` integrado para computar total previsto, realizado e percentual orçamentário.

### 2.3 Componentes React (Substituição de `ListDetailView.js` e `DashboardView.js`)
- [x] Criar `ShoppingListCard.tsx` (card com métricas, barra de orçamento e progresso).
- [x] Criar `ShoppingItemRow.tsx` (item com checkbox, controles de quantidade, preço e subtotal).
- [x] Criar `AddItemModal.tsx` (modal com sugestões inteligentes e categorias).
- [x] Criar `CreateListModal.tsx` (criação rápida de listas com orçamento e loja).
- [x] Criar `ShoppingSummaryBar.tsx` (barra inferior com total no carrinho e botão de finalização).
- [x] Criar `ShoppingListView.tsx` (substituição completa do monólito `ListDetailView.js` de 75 KB).
- [x] Criar `ShoppingDashboard.tsx` (substituição completa do monólito `DashboardView.js` de 60 KB).

### 2.4 Realtime Cirúrgico
- [x] Criar hook `useShoppingRealtime.ts` escutando eventos de `INSERT`, `UPDATE` e `DELETE` na tabela `listas`.
- [x] Atualização cirúrgica na store do Zustand sem recarregar listas completas.

### 2.5 Validação da Fase 2
- [x] Checagem de tipos estrita com `npx tsc --noEmit` (0 erros).
- [x] Build de produção limpo com `npx vite build` (8.17s).
- [x] Sincronização automatizada para `www/` do Capacitor Android.

---

## 💰 FASE 3: Módulo Financeiro, Relatórios Analíticos & RPC com Idempotência

### 3.1 Migração SQL & RPC Transacional
- [x] Criar script `supabase/migrations/004_rpc_shopping.sql`:
  - [x] Função `complete_shopping_list(p_operation_id UUID, p_list_id TEXT, p_payment_method TEXT, p_category TEXT)`.
  - [x] Validação estrita de `auth.uid() = user_id`.
  - [x] Idempotência nativa via `sync_operations` (impede cobranças duplicadas em retries).
  - [x] Atomicidade nativa: encerramento da lista, registro em `historico_compras`, lançamento no ledger de `carteira_entradas` e rollback automático em exceções.

### 3.2 Subdomínios do Módulo Financeiro (`src/modules/finance/`)
- [x] `types.ts`: tipagem completa de `EntryType`, `EntryStatus` (recebido, a_receber, pago, a_pagar), `due_date` e `is_recurrent`.
- [x] `finance.repository.ts`: suporte completo a lançamentos autenticados com status, vencimento e recorrência.
- [x] `finance.store.ts`: Zustand com derivação rigorosa de saldo realizado e previsões pendentes.
- [x] `WalletView.tsx`: modal fiel ao **Print 4** com toggle Entrada/Despesa, Situação (Já Pago/A Pagar) e Recorrente.
- [x] `ReportsView.tsx`: tela fiel aos **Prints 1 e 2** com:
  - [x] Filtros do Período por Ano, Mês e Dia.
  - [x] Cards de Total Gasto Real, Orçamento Total e Economia no Período.
  - [x] Seletor em pílulas dos 12 meses (Jan a Dez) para filtragem rápida.
  - [x] Balanço do Período com gráficos nativos em SVG: Entradas vs Saídas (barras) e Despesas por Categoria (rosca/donut).

### 3.3 Módulo Shopping — Serviços Faltantes Conectados (`src/modules/shopping/`)
- [x] `shopping.service.ts`:
  - [x] Chamada da RPC `complete_shopping_list` com UUID idempotente.
  - [x] Chamada da RPC `connect_shared_list_by_code` para conectar listas por código de convite.
  - [x] `editListDetails` para atualizar nome, loja, orçamento e categoria.
- [x] `ConnectCodeModal.tsx`: modal do botão verde-limão `[ 🔗 Conectar Código ]` (**Print 3**).
- [x] `EditListModal.tsx`: modal acionado pelo botão de lápis `[ ✏ ]` nos cards de lista.
- [x] `ShoppingListCard.tsx`: layout fiel ao **Print 3** (ícone lilás/azul, progresso suave, `[ ✏ ]`, `[ 🗑 ]` e `[ Abrir > ]`).
- [x] `ShoppingDashboard.tsx`: saudação personalizada `Olá Vinicius 👋`, botão verde-limão, pílulas com contadores e Card Herói "TOTAL PREVISTO" com barra verde neon (**Print 3**).

### 3.4 Shell & Anúncios
- [x] `AdBanner.tsx`: banner de teste AdMob ("Nice job! This is a 320x50 test ad") visível nos prints.
- [x] `App.tsx`: navegação integrada (Listas, Carteira, Balanço, Painel), pílula do usuário Vinicius e exibição do banner.

### 3.5 Validação da Fase 3
- [x] Checagem de tipos estrita com `npx tsc --noEmit` (0 erros).
- [x] Compilação do bundle de produção limpa via `npm run build` (7.43s).
- [x] Sincronização automática para `www/` do Capacitor Android.

---

## 📱 FASE 4: Dashboard, Shell Mobile-First, Capacitor & Polimento PWA

### 4.1 Shell da Aplicação & Navegação
- [x] Header com indicador dinâmico de sincronização (Online / Sincronizando / Modo Offline / Erro).
- [x] Bottom Navigation Bar mobile-first ergonômica com alternância rápida entre Listas, Carteira e Painel.
- [x] Criar `DashboardView.tsx` consolidando compras ativas, economia acumulada, listas concluídas e atalhos rápidos.

### 4.2 Camada Nativa Isolada (`src/lib/native/`)
- [x] `platform.ts` (detecção de Web, PWA ou Android Capacitor).
- [x] `admob.ts` (serviço Capacitor AdMob isolado com fallback transparente na web).

### 4.3 Sincronização & Deep Clean Nuclear
- [x] Remoção definitiva da pasta `legacy/` (550 KB de arquivos HTML/JS obsoletos eliminados).
- [x] Remoção de monólitos legados em `src/views/` (75 KB `ListDetailView.js`, 60 KB `DashboardView.js`, etc.) e `src/services/`.
- [x] `scripts/prepare-www.js` reescrito para limpar `www/` e sincronizar exclusivamente os artefatos de `dist/`.
- [x] Validação final completa com TypeScript e Vite build sem erros.

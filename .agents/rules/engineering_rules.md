# Regras de Engenharia e Arquitetura - ComprasPlus

Este documento define as regras de arquitetura, padrões e soluções de contorno (workarounds) que **DEBEM SER ESTRITAMENTE SEGUIDOS** por qualquer desenvolvedor ou agente IA que interagir com o código-fonte do `ComprasPlus`.

---

## 1. Arquitetura Offline-First (SyncEngine + Zustand)

O projeto usa uma abordagem "Local-First" para garantir que o app funcione offline.
- **Estado Local (`Zustand`)**: Toda mutação da interface (ex: `updateList`) deve alterar o estado do Zustand *imediatamente* (Optimistic UI).
- **Fila de Sincronização (`SyncEngine`)**: Imediatamente após a atualização do Zustand, a mutação deve ser adicionada à fila do `SyncEngine` usando `syncEngine.addOperation()`.
- **Prevenção de Race Conditions**:
  - Evite rodar fetches completos (ex: `fetchLists` no `DashboardView`) logo após transições de tela se o `SyncEngine` ainda estiver processando.
  - O `fetchLists` possui uma trava: `if (syncEngine.isProcessing) return;`. Não a remova. Ela previne que o banco de dados (que pode estar milissegundos atrasado) sobrescreva o estado local com dados desatualizados (ex: revertendo uma lista recém-reaberta para "concluída").

## 2. Banco de Dados e Supabase RLS

### Operadores JSONB e UUIDs no Postgres
Sempre que precisar comparar o ID do usuário autenticado (`auth.uid()`) dentro de uma coluna `JSONB` usando o operador de continência (`@>`), **É OBRIGATÓRIO** fazer o cast para `TEXT`.
- **Incorreto**: `(shared_users @> jsonb_build_array(jsonb_build_object('id', auth.uid())))`
- **Correto**: `(shared_users @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text)))`
*Motivo: O Postgres pode interpretar o `uuid` estritamente, fazendo com que a comparação em JSON falhe silenciosamente, resultando em erro 42501 (Insufficient Privilege) durante as sincronizações.*

### Bypasses de Triggers de Segurança
Para evitar sequestros (hijacking), temos a trigger `prevent_owner_id_change` que bloqueia edições em `owner_id`, `shared_users` e `share_code` por quem não é dono.
Se uma função de RPC precisar legitimamente alterar esses campos (ex: `join_shopping_list` para se adicionar à lista de usuários compartilhados), use a variável de sessão local da transação:
```sql
  -- Sinaliza para a trigger que a ação é legítima
  PERFORM set_config('app.joining_list', 'true', true);
  -- UPDATE
```

## 3. Integração Mobile (Capacitor)

Este projeto usa o `@capacitor/app` para gerar os builds Android/iOS.
- **Botão Voltar Nativo (Android Hardware Back Button)**: 
  - O Capacitor nativamente fecha o app se a história web for a raiz.
  - Para evitar fechamentos inesperados, o listener em `App.tsx` intercepta o `backButton` e delega a navegação via Zustand (`useNavigationStore`).
  - Se estiver no Root (`DASHBOARD`), o evento de voltar é silenciosamente ignorado (evitando a saída não intencional). **Não remova este comportamento.**
- **Sincronização Nativa**:
  - Toda vez que uma dependência `@capacitor/*` for instalada ou alterada no `package.json`, rodar obrigatoriamente `npx cap sync android` após o `npm run build`.

## 4. UI/UX e Estilização

- **Navegação Virtual**: A navegação do App não usa URLs (`react-router-dom`). Ela usa views montadas condicionalmente baseadas em `useNavigationStore`. Modifique apenas a string do `currentView` para navegar.
- **Micro-interações e Cores**: Utilize as variáveis de CSS definidas no `index.css` (ex: `var(--surface)`, `var(--primary)`). Evite hardcoding de cores ou classes tailwind não padronizadas que quebrem a harmonia do Dark/Light Mode.

## 5. Limpeza de Payloads no Client

O PostgREST/Supabase não atualiza chaves em JSON que não forem especificadas, mas o envio de dados que você não tem permissão para atualizar engatilhará triggers de segurança.
- Ao enviar um `UPDATE` via `SyncEngine`, remova campos imutáveis do payload antes do disparo:
```typescript
delete safePayload.owner_id;
delete safePayload.created_at;
delete safePayload.isShared;
```

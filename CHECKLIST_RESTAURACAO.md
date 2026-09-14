# Checklist de Restauração — Compras PLUS 🛒
> Baseado no código real e oficial do GitHub (`origin/main`, commit `6bb692a`).
> ⚠️ **Modo 100% Local:** Nada é enviado para o GitHub (`git push` bloqueado).

---

## 1. Limpeza da Navegação e Roteador
- [x] Remover a aba inventada "Ranking" do `src/index.html` e `src/router/index.js`.
- [x] Restaurar as abas oficiais:
  - 🛒 **Listas** (`/dashboard`)
  - 💰 **Carteira** (`/carteira`)
  - 📊 **Histórico** (`/historico`)
  - 👤 **Perfil** (`/perfil`)
  - 🛡️ **Admin** (`/admin` — condicional apenas se o usuário for admin).

---

## 2. Carteira Financeira (`view-carteira`)
- [x] Criar `src/services/walletService.js` (Supabase + cache IndexedDB).
- [x] Construir a tela de Carteira:
  - Resumo: Total de Entradas, Gastos em Compras e Saldo Líquido Atual.
  - Barra proporcional de breakdown (Receitas vs Despesas).
  - Lista de lançamentos com badges: **Já Recebido** (verde) vs **A Receber** (amarelo).
  - Modal para cadastrar nova entrada (Salário, Renda Extra, Investimentos, Presente, Outros, valor, status e data).
  - Filtro por mês/ano e exclusão de entradas.

---

## 3. Concluir / Finalizar Compra (`sheet-concluir-compra`)
- [x] Adicionar o botão **"Concluir Compra"** no cabeçalho/ação da lista (`ListDetailView.js`).
- [x] Modal de conclusão:
  - Confirmação do valor final pago no caixa do mercado.
  - Data e confirmação do supermercado/loja.
  - Opção: *"Abater valor do saldo da Carteira"*.
- [x] Salvar em `purchase_history`, abater da Carteira e arquivar a lista.

---

## 4. Histórico de Compras e Balanço (`view-historico`)
- [x] Criar `src/services/historyService.js`.
- [x] Construir a tela de Histórico (`HistoryView.js`):
  - Balanço geral de gastos no período (Total Gasto Real, Orçamento Total, Economia / Saldo do Período).
  - Gráfico de barras interativo por mês (evolução de gastos com escala visual de 12 meses).
  - Timeline de recibos de compras anteriores com sanfona expansível de itens discriminados.
  - Filtros por ano, mês e dia.
  - Ações: Compartilhar comprovante detalhado no WhatsApp e excluir registro com confirmação.

---

## 5. Sistema Completo de Compartilhamento de Listas
- [x] Criar `src/services/shareService.js`.
- [x] Bottom Sheet de Compartilhar:
  - Permissões: **Modo Aberto (Colaborativo)** vs **Modo Fechado (Somente Leitura)**.
  - Convite direto por e-mail.
  - Código `LST-XXXXX` para WhatsApp (com botão de renovar e link formatado).
  - Lista de pessoas com acesso e botão de revogar.
- [x] Bottom Sheet no Dashboard para **"Entrar em Lista com Código"** e suporte ao link `?convite=LST-...`.

---

## 6. Perfil Real e Sincronização em Nuvem (`view-perfil`)
- [x] Construir a tela de Perfil:
  - Exibir e editar Nome e **Telefone WhatsApp** (com máscara `(XX) XXXXX-XXXX`).
  - Botão **"Sincronizar Agora"** para forçar sync entre IndexedDB e Supabase.
  - Indicador de status (Online / Offline).
  - Logout seguro.

---

## 7. Painel Administrativo de Leads (`view-admin`)
- [x] Rota protegida `/admin` (apenas para `isAdmin()`).
- [x] Listagem de usuários/leads (Nome, Telefone WhatsApp, E-mail, Consentimento, Data).
- [x] Busca instantânea e botão de **Exportar para CSV**.

---

## 8. Blindagem do AdMob Nativo
- [x] Portar lógica para `src/services/admobService.js`.
- [x] Ocultar banner nativo automaticamente ao abrir modais/sheets e reexibir ao fechar (com MutationObserver e métodos `hideBanner`/`resumeBanner`).
- [x] Suporte a anúncios Intersticiais (com overlay de demonstração na Web e chamada direta ao Capacitor no Android).
- [x] Banner web e card nativo promocional nos slots reservados.

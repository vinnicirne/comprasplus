# Regra: Protocolo de Segurança Total

**Gatilho Operacional:** Quando o usuário digitar exatamente `PROTOCOLO DE SEGURANÇA`, o assistente DEVE OBRIGATORIAMENTE assumir o papel descrito abaixo e executar o protocolo de forma rigorosa.

---

**PROTOCOLO DE SEGURANÇA TOTAL v1.0**  
**Sistemas Desenvolvidos por IA**

---

### Gatilho
Quando o usuário digitar exatamente:

```
PROTOCOLO DE SEGURANÇA
```

A IA assume imediatamente o papel de:

**Security Auditor + QA + Pentester + Code Reviewer + DevOps Auditor + Business Logic Analyst**

e executa o protocolo completo de forma sistemática, transparente e auditável.

---

### Princípios Fundamentais (não negociáveis)

1. Nunca declarar o sistema “seguro” apenas porque nenhum problema foi encontrado.
2. Sempre registrar:
   - O que foi testado
   - O que **não** pôde ser testado
   - Limitações técnicas ou de acesso
3. Toda vulnerabilidade deve seguir o ciclo completo:
   ```
   DETECTAR → CONFIRMAR → CLASSIFICAR → CORRIGIR → TESTAR → REGRESSÃO → CONFIRMAR CORREÇÃO
   ```
4. A IA só pode marcar uma vulnerabilidade como **CORRIGIDA** após:
   - Aplicar a correção
   - Criar (quando possível) teste de regressão
   - Reexecutar o vetor original
   - Confirmar que o problema foi eliminado
5. Preferir evidências reproduzíveis (curl, scripts, testes automatizados). Análise estática sem confirmação deve ser marcada como “não confirmado”.
6. Priorizar sempre: autenticação, autorização, dados sensíveis e lógica de negócio.

---

### Estrutura de Execução

#### FASE 0 — Preparação
- Confirmar acesso ao código, ambiente e credenciais necessárias
- Definir branch/commit atual
- Criar arquivo `SECURITY_AUDIT.md` (ou atualizar se já existir)
- Inicializar o **Security Ledger**

#### FASE 0.5 — Escopo, Classificação de Dados e Priorização
- Mapear ativos críticos (auth, pagamento, dados pessoais, admin, etc.)
- Classificar dados:
  - Público
  - Interno
  - Confidencial
  - Restrito / PII / Financeiro / Segredos
- Definir o que está **in-scope** e **out-of-scope**
- Priorizar ordem de ataque (mais crítico primeiro)

#### FASE 1 — Reconhecimento do Sistema
- Stack, frameworks, versões e dependências
- Frontend / Backend / APIs / Banco
- Serviços externos (Supabase, Firebase, Vercel, Stripe, etc.)
- Edge Functions, Workers, Cron Jobs, Webhooks
- Variáveis de ambiente e secrets
- Rotas públicas vs privadas
- Autenticação e autorização
- Uploads e Storage
- Integrações externas

#### FASE 2 — Arquitetura e Superfície de Ataque
- Diagrama mental de fluxos críticos
- Pontos de entrada
- Trust boundaries
- Superfície de ataque total

#### FASE 3 — Auditoria de Código (Arquivo por Arquivo + Linha por Linha)
Verificar especialmente:
- Secrets expostos / hardcoded
- Credenciais, tokens, chaves de API
- Código morto, TODOs críticos, console.log
- Imports e serviços não utilizados
- SQL Injection, XSS, CSRF, SSRF, IDOR/BOLA, RCE
- Path Traversal, Command Injection, Prototype Pollution
- Open Redirect, Mass Assignment
- Broken Access Control, Authentication Bypass
- JWT mal configurado, Session issues
- Privilege Escalation
- Validação e sanitização insuficientes
- Rate limiting ausente
- Exposição excessiva de dados

#### FASE 3.5 — Business Logic & Race Conditions
- Manipulação de preço, quantidade, cupons, estoque
- Bypass de limites de uso / freemium
- Race conditions em operações críticas (pagamento, criação de recursos, etc.)
- Workflow incompleto ou pulável
- Double-spend / double-action

#### FASE 4 — Banco de Dados (especialmente Supabase)
- RLS e Policies
- SECURITY DEFINER
- Funções RPC
- Exposição de tabelas e views
- Acesso anônimo vs autenticado
- Enumeração de IDs
- Manipulação de dados de terceiros
- Storage policies e buckets
- URLs assinadas
- Vazamento de dados via queries

#### FASE 5 — APIs
Mapear todos os métodos (GET, POST, PUT, PATCH, DELETE, OPTIONS) e testar:
- Autenticação e autorização
- Validação de input
- Rate limiting
- Payloads maliciosos e campos inesperados
- IDs manipulados
- Acesso horizontal e vertical
- Respostas com dados excessivos
- Mass Assignment

#### FASE 6 — Autenticação
Testar exaustivamente:
- Login / Logout / Refresh
- Token expirado / revogado
- Refresh token reuse
- Session fixation
- Password reset (token reuse, enumeration)
- Conta desativada / soft-deleted
- MFA bypass (se existir)
- Concurrent sessions
- Logout em todos os dispositivos

#### FASE 7 — Autorização
Matriz obrigatória:
```
Usuário comum → recurso de outro usuário
Usuário A → alterar dados do Usuário B
Não autenticado → endpoint protegido
Autenticado → função administrativa
Usuário bloqueado → continuar usando sessão
```

#### FASE 8 — Frontend
- XSS
- Secrets / tokens no bundle ou localStorage
- Rotas protegidas apenas no frontend
- Dados administrativos escondidos só com CSS
- CSP, CORS, headers de segurança
- Tratamento de erros e exposição de dados
- Dependências vulneráveis no client

#### FASE 9 — Infraestrutura
- HTTPS / TLS
- Headers de segurança (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, etc.)
- Cookies (Secure, HttpOnly, SameSite)
- CORS
- Exposição de .env, arquivos de configuração, endpoints admin
- Buckets e Storage
- IAM e permissões excessivas
- Edge Functions
- Logs e observabilidade

#### FASE 9.5 — Logging, Monitoramento e Detecção
- Logs contendo dados sensíveis
- Ausência de logs de autenticação/autorização
- Falta de rate limiting + alertas
- Capacidade de detectar brute force, enumeração e anomalias

#### FASE 10 — Dependências e Supply Chain
- Pacotes vulneráveis (incluindo transitivos)
- Pacotes abandonados ou suspeitos
- Typosquatting
- Scripts postinstall perigosos
- Integridade de lockfiles
- Dependências desnecessárias

#### FASE 11 — E2E / QA Real
A IA deve usar o sistema como usuário real:
```
Cadastro → Login → Recuperação de senha → Perfil → Upload → CRUD → Logout
```
E testar:
- Recurso próprio
- Recurso de outro usuário
- Recurso inexistente / excluído
- Recurso sem permissão

#### FASE 12 — Abuse Testing
- IDs: 1, 2, 999999, -1, null, "", "admin", UUIDs inválidos
- Strings enormes, JSON incompleto, tipos errados
- Campos inesperados / duplicados
- Valores negativos / nulos
- Arrays e objetos gigantes

#### FASE 13 — Performance e Estabilidade
- N+1 queries
- Memory leaks
- Race conditions
- Retry infinito
- Operações pesadas no frontend
- Timeouts e concorrência

#### FASE 14 — Correção
- Corrigir todas as vulnerabilidades CRITICAL e HIGH
- Documentar cada correção
- Criar testes de regressão quando possível

#### FASE 14.5 — Validação de Correções
- Reexecutar os vetores originais
- Confirmar que foram fechados
- Atualizar status no Security Ledger

#### FASE 15 — Regressão
- Rodar suite completa de testes após correções
- Verificar se novas vulnerabilidades foram introduzidas

#### FASE 16 — Auditoria Final
- Revisar tudo que foi feito
- Listar limitações e itens não testados
- Calcular Security Score

#### FASE 17 — Relatório Final
Gerar relatório completo com:
- Resumo executivo
- Security Score
- Status final: **APROVADO** ou **REPROVADO**
- Lista completa do Security Ledger
- Recomendações restantes
- O que não pôde ser testado

---

### Security Ledger (formato obrigatório)

```
SECURITY AUDIT — [Nome do Projeto] — [Data] — Commit: [hash]

CRITICAL
├── SEC-001
├── SEC-002

HIGH
├── SEC-003

MEDIUM
├── SEC-004

LOW
├── SEC-005

INFO
├── SEC-006
```

Cada item deve conter:

```
ID: SEC-XXX
Categoria: 
Severidade: CRITICAL | HIGH | MEDIUM | LOW | INFO
CVSS (aproximado): 
Exploitability: Fácil | Médio | Difícil
Arquivo / Linha / Função:
Descrição:
Impacto:
Dados afetados:
Evidência (reproduzível):
Como reproduzir:
Por que acontece:
Correção recomendada:
Correção aplicada:
Teste de validação:
Status: ABERTO | CORRIGIDO | ACEITO COM RISCO | FALSO POSITIVO
Risco residual:
```

---

### Critérios de Aprovação / Reprovação

- **REPROVADO** se existir qualquer CRITICAL ou HIGH não corrigido.
- **APROVADO COM RESSALVAS** se existirem apenas MEDIUM/LOW com plano de mitigação documentado.
- **APROVADO** somente se:
  - Nenhum CRITICAL ou HIGH aberto
  - Cobertura de testes crítica ≥ 90%
  - Limitações claramente documentadas

---

### Security Score (exemplo)

```
Score = 100
- CRITICAL: -25 cada
- HIGH: -15 cada
- MEDIUM: -5 cada
- LOW: -2 cada
- Itens não testados críticos: -10 cada
```

Score mínimo recomendado para produção: **80**

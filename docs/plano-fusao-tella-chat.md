# Plano — fusão Tella Chat → Balconista Pro

## Contexto

Decisão tomada em 2026-08-12: o Balconista Pro (React + Vite + Supabase,
estrutura montada nesta mesma sessão) vira a base do produto fundido. O
Tella Chat (`Expervivencia-chat-prd`, repo `C:\Users\gta\Documents\GitHub\Expervivencia-chat-prd`)
é hoje só ambiente de teste/demo — sem tenants reais — então dá pra
recortar peças dele sem se preocupar com migração de dados de cliente
por enquanto. Mantém o nome **Balconista Pro**.

Levantamento completo do Tella Chat (multi-tenancy, WhatsApp, encarte,
treinamento, especialista IA) feito via exploração de código em
2026-08-12 — resumo abaixo, detalhes de arquivo por arquivo disponíveis
se precisar depois.

## O que o Tella Chat tem que vale a pena trazer

### 1. Modelo multi-tenant (organizations + users) — trazer, é o maior ganho

Hoje o Balconista Pro só tem `balconista_profiles (id, role, farmacia_nome)`
— um perfil solto por pessoa, sem conceito de "organização". Isso já
não aguenta CRM/WhatsApp (que precisa de contatos, tickets e conexões
isolados por farmácia). O Tella Chat resolve isso com:

- `organizations`: `id, name, slug, plan, status, max_users, max_connections, ...`
- `users`: `auth_id → auth.users, organization_id, role (user|admin|super_admin)`
- Toda tabela de domínio carrega `organization_id` e isolamento é via RLS.

**Adaptação pro Balconista**: evoluir `balconista_profiles` pra esse
modelo de duas camadas — `balconista_orgs` (a farmácia) +
`balconista_members` (pessoas dentro da farmácia, com role). O `role`
que já existe (`admin`/`client`) vira o nível "Balconista" (você vs.
farmácia), e dentro de cada org pode ter sub-roles depois se precisar
de múltiplos atendentes por farmácia.

**Achado no código-fonte**: as definições de plano (`max_users`,
features como `campanhas`/`encarte`/`api_access`) ficam salvas em
**localStorage do navegador**, não no banco — e não achei nenhum
gate real checando essas features em runtime. É decoração hoje, não
licenciamento de verdade. Se formos cobrar por plano, isso precisa
nascer certo desta vez (feature flags no banco, checadas no backend).

### 2. Helpdesk WhatsApp completo — trazer, é o diferencial de produto

`connections`, `contacts`, `tags`, `tickets`, `messages`,
`whatsapp_groups`, `campaigns`, `schedules`, `quick_replies`,
`internal_notes` — CRM omnichannel via Evolution API (WhatsApp) + Meta
oficial + Instagram/Messenger, orientado a eventos via **Supabase
Realtime** (não polling).

O "cérebro" disso inteiro já está em **n8n, exportado como JSON** em
`Expervivencia-chat-prd/n8n-workflows/` — portátil de verdade:
- Recebimento: Evolution, WhatsApp Oficial, Messenger (3 webhooks)
- Envio: espelha os 3 canais
- Limpeza de mídia (cron diário)

Documentação já escrita e reaproveitável quase direto:
`docs/ARCHITECTURE.md`, `docs/roles.md`, `docs/database_schema.md`,
`docs/rls_and_security.md`, `docs/N8N-WORKFLOWS.md`, `docs/services.md`.

**Achado de segurança pra não repetir**: existe uma chave `apikey`
fallback **hardcoded no código-fonte** (`src/services/n8n.ts` e outros)
usada quando a env var não está setada. Não replicar esse padrão — no
Balconista, se a env var não existir, falha alto e claro.

### 3. Console de super admin cross-tenant — trazer, mais maduro que o que já fiz

O `Gerenciar Clientes` que construí agora é básico (criar + listar). O
`SuperAdminPage.tsx` do Tella Chat já tem: editar, suspender, deletar
org, e um fluxo de onboarding que cria org + admin + conexão WhatsApp
inicial num passo só (`orgService.onboardClient`). Vale portar esse
fluxo de onboarding combinado quando entrarmos na Fase 1.

### 4. Encarte — decidir qual das três versões vira a definitiva

Contando agora: tecvancel-studio já tem um pipeline de encarte próprio
(`supabase/functions/trigger-encarte-generation`), o Tella Chat tem
outro (Gemini/Imagen 3 via n8n, documentado em
`docs/encarte_farma_n8n_setup.md` — mas o workflow n8n em si **não**
está exportado como `.json`, só documentado, então precisaria ser
recriado). Não faz sentido manter três. Decisão fica pra quando
formos construir o módulo de Encarte do Balconista de verdade — não
precisa resolver agora.

### 5. Treinamento — não portar como está, reconstruir

`TreinamentoPage.tsx` no Tella Chat é **inteiramente estático** — 4
cursos hardcoded, sem geração por IA, sem tabela no banco. Não
economiza trabalho nenhum trazer isso; quando formos construir o
módulo de treinamento do Balconista, é melhor já nascer com o
microlearning gerado por IA que tínhamos pensado no roadmap.

## O que fica pra trás (aposentar)

- **`PharmacySpecialistPage.tsx`** (RAG com OpenAI gpt-4o + Supabase
  vector store, tabela `especialista_conhecimento`) — **confirmado
  seguro de aposentar**: nenhum outro componente/serviço depende dele.
  O Balconista mantém o pipeline n8n próprio (já testado a fundo nesta
  sessão: 116 doenças, 5 agentes especialistas, 100% Claude).
- Arquivos duplicados `.jsx`/`.tsx` (`AuthContext.jsx`,
  `ThemeContext.jsx`, `main.jsx`) — sobra de migração JS→TS, não
  carregar isso pro Balconista.
- `react-router-dom` como dependência morta (o app não usa router de
  verdade, é `useState` + `switch`) — o Balconista já usa React Router
  de verdade, então isso nem se aplica, só não repetir o padrão.

## Banco de dados do produto fundido — decidido: usar o do Tella Chat

Confirmado em 2026-08-12: o projeto Supabase do Tella Chat está na
**mesma conta** usada pro tecvancel-studio/Balconista — só não tinha
nome customizado, aparecia como "jonhycash@gmail.com's Project" na
lista (`npx supabase projects list`). Ref real:
**`wejzydpxyghddjekokgd`**. Confirmado via REST API que as tabelas
`organizations`, `users`, `tickets`, `connections`, `contacts`,
`messages`, `campaigns`, `ai_settings` existem lá.

⚠️ O `supabase/.temp/project-ref` cacheado no checkout local do
Tella Chat (`jidcuijphuilvkbqsryh`) está **desatualizado/stale** — não
resolve mais por DNS. Não usar esse valor; usar `wejzydpxyghddjekokgd`.

**Decisão**: o schema mais completo (multi-tenant + CRM WhatsApp) já
está em `wejzydpxyghddjekokgd` — em vez de recriar tudo do zero no
projeto que o Balconista usa hoje (`lhewiunnbtpbfxipnwmj`, dividido
com o tecvancel-studio), o produto fundido passa a rodar em cima do
banco do Tella Chat. **Executado em 2026-08-12:**

- ✅ `balconista_profiles` + `is_balconista_admin()` migrados pra
  `wejzydpxyghddjekokgd` (`supabase link --project-ref wejzydpxyghddjekokgd`
  + `supabase db push`).
- ✅ Edge Function `balconista-create-client` redeployada lá.
- ✅ `.env.local` do Balconista Pro apontando pra
  `VITE_SUPABASE_URL=https://wejzydpxyghddjekokgd.supabase.co`.
- ✅ Sua conta (`daldegan.d@gmail.com`) já existia nesse projeto como
  `super_admin` da org "Exper Chat Pro" (`users.auth_id
  40380dda-2b32-4f81-8a37-76cc45506fca`) — só adicionei o perfil
  `balconista_profiles` (`role: admin`) pra ela, sem criar conta nova.
- Login testado e confirmado no navegador contra o banco novo.
- `tecvancel-studio` continua sozinho em `lhewiunnbtpbfxipnwmj` — não
  é mais compartilhado com o Balconista.

⚠️ **Correção importante**: esse projeto **não é ambiente de teste** —
tem 12 organizações ativas (Cora Farma, Drogaria Farma Fappi, Farmácia
Pague Pouco, Droga Itu, Rede Mais Rolândia, Drogaria Ramos e outras),
64 mil+ mensagens e 338 tickets reais. Confirmado com o usuário em
2026-08-12 que segue sendo tratado como ambiente de teste pra fins de
desenvolvimento, mas **qualquer alteração estrutural daqui pra frente
(Fase 1 em diante) precisa ser aditiva e reversível** — nada de
`DROP`/`TRUNCATE` em tabelas existentes (`organizations`, `users`,
`tickets`, `messages`, etc.) sem confirmação explícita.

**Pendência de limpeza (baixa prioridade)**: `balconista_profiles` +
a Edge Function ainda existem no projeto antigo
(`lhewiunnbtpbfxipnwmj`), com 1 perfil admin e 1 cliente de teste
("Farmácia Teste Balconista"). Não afeta nada, mas pode ser removido
quando sobrar tempo.

## Ordem sugerida (fases)

1. **Modelo multi-tenant**: `balconista_orgs` + `balconista_members`,
   substituindo `balconista_profiles`; evoluir Gerenciar Clientes pro
   padrão de onboarding do SuperAdminPage.
2. **Helpdesk WhatsApp**: portar schema (`connections`, `contacts`,
   `tickets`, `messages`, `campaigns`...) + os workflows n8n já
   exportados + as páginas React (`AtendimentosPage`, `ChatWindow`,
   `TicketPanel`, `ConnectionsPanel`), adaptando ao visual/tema do
   Balconista.
3. **Encarte** — depois de decidir qual pipeline vira o definitivo.
4. **Treinamento** — construído do zero, não portado.

Cada fase entra como uma sessão de planejamento própria (Plan Mode)
quando chegar a vez — este documento é o mapa, não o plano de
implementação linha a linha.

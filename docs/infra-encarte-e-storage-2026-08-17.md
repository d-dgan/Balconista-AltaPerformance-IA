# Infra do Encarte + Storage — sessão 2026-08-17

> Log de tudo que foi investigado/corrigido nesta sessão, pra retomar
> depois sem precisar redescobrir tudo do zero. Próximo assunto pendente:
> questão de CNPJ (não relacionado a este documento).

## Contexto de partida

Console do navegador mostrando vários erros em cascata (404 de RPC/tabela,
403 de RLS, 500 de webhook n8n, imagem que não carregava). Foi uma
investigação longa, um problema puxando o outro. Resumo por assunto.

---

## 1. Supabase (`wejzydpxyghddjekokgd`) — RLS e tabelas faltando

Confirmado que `.env.local` já apontava pro banco certo
(`wejzydpxyghddjekokgd`, o mesmo documentado em `plano-fusao-tella-chat.md`
como definitivo). O problema não era banco errado — eram peças que o
front-end (`aiService.ts`, `encarteService.ts`) já esperava mas nunca
tinham sido criadas nesse banco:

- **`ai_settings`**: a tabela existia (RLS ligado) mas **sem nenhuma
  policy** — todo insert/update do front-end caía em 403.
- **`get_ai_settings_safe(org_id)`**: função RPC nunca existia (404).
- **`flyer_history`**: tabela nunca existia (404).

**Corrigido em** `supabase/migrations/20260816120000_ai_settings_and_flyer_history.sql`
(aditivo, aplicado direto no banco remoto via Management API já que Docker
não está instalado localmente pra `supabase db push`). Segue o padrão já
usado no projeto (`get_my_org_id()`, `is_super_admin()`, policy "Super
Admin Global Access").

## 2. Logo das farmácias — migrado pro Cloudflare R2

- Bucket `client-logos` do **Supabase Storage nunca tinha sido criado**
  (upload dava 400).
- Decisão do usuário: usar **Cloudflare R2** em vez de criar o bucket no
  Supabase (mais limite grátis). Reaproveita o bucket `chat-evolution-media`
  já usado pela Evolution API (mídia do WhatsApp), sob o prefixo
  `client-logos/`.
- Acesso público: **Public Development URL** do bucket (já estava
  habilitado) — `https://pub-301074ebcb5b484db9efaefcad0b84cf.r2.dev`.
- Upload não pode ir direto do browser (chave R2 é secreta) — criado
  `api/upload-logo.ts` (Vercel serverless function) que valida a sessão
  Supabase do chamador (organization_id ou super_admin) e faz o PUT no R2
  usando `aws4fetch`.
- `src/services/aiService.ts` (`uploadClientLogo`/`deleteClientLogo`)
  reescrito pra chamar essa function em vez do Supabase Storage.
- Env vars adicionadas no Vercel (produção):
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCOUNT_ENDPOINT`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
  `R2_PUBLIC_BASE_URL`.
- **Limpeza de dado real**: 7 farmácias (Cora Farma, Drogaria Farma Fappi,
  Farmácia Pague Pouco, Farmácia Super Popular, Droga Itu, Rede Mais
  Rolândia, Farmácia Líder) tinham `logo_url` apontando pro projeto
  Supabase morto (`jidcuijphuilvkbqsryh`, confirmado sem DNS). Confirmado
  com o usuário, `logo_url` zerado pras 7 — ficam sem logo até re-upload.

## 3. Bugs pequenos de front-end

- `public/notification.mp3` não existia (404) — gerado um bipe curto via
  ffmpeg.
- `public/sw.js`: `cache.put()` lançava `TypeError` em respostas `206`
  (partial content, comum em range request de áudio/vídeo) — agora só
  cacheia `status === 200`.
- `index.html`: adicionada `<meta name="mobile-web-app-capable">` (a
  `apple-mobile-web-app-capable` sozinha está deprecated).

## 4. Gerador de Encarte — reconstrução completa do pipeline de IA

### O que estava quebrado

`encarteService.ts` apontava pra `n8n.expervivenciafarma.com.br/webhook/imagensia`
— uma **terceira instância n8n**, órfã, não documentada em nenhum `.env`
deste projeto (diferente da antiga `tellamarketing.com.br` e da atual
`chat-n8n-main`/ORAQLE VPS). O workflow real (achado depois em
`n8n.tellamarketing.com.br`, workflow "Encarte Farma IA") nunca tinha sido
terminado: nó de busca de foto do produto com API key placeholder
(`SUA_GOOGLE_API_KEY_AQUI`), e o grafo tinha dois ramos desconectados —
mesmo corrigindo a key, a resposta nunca chegava no front-end.

### Solução: workflow novo na instância de produção

Criado o workflow **"Balconista - Gerador de Encarte"** direto no
`chat-n8n-main` (ORAQLE VPS, a instância oficial hoje) via API do n8n
(`N8N_NEW_API_KEY` do `.env`). JSON exportado (sem segredos) em
[`n8n-workflows/balconista-gerador-de-encarte.json`](../n8n-workflows/balconista-gerador-de-encarte.json).

- **Workflow ID**: `782u22eQ6Mv7YiYE`
- **Webhook**: `https://chat-n8n-main.wcvao0.easypanel.host/webhook/imagensia`
  (`encarteService.ts` já aponta pra cá)
- **Auth**: exige `Authorization: Bearer <supabase access_token>` — o
  workflow valida a sessão (`/auth/v1/user`), busca o perfil do usuário
  (`users.organization_id`/`role`) e só segue se `organization_id` bater
  com `org.id` do payload ou o usuário for `super_admin`. Evita uma
  farmácia gastar a cota de Gemini/SerpApi de outra.
- **Chaves por organização**: busca `ai_settings.gemini_api_key` e
  `.serpapi_key` da própria farmácia (via `SUPABASE_SERVICE_ROLE_KEY`,
  não a RPC — o n8n não tem sessão de usuário, service role bypassa RLS
  direto). Se a farmácia não configurou as duas chaves em
  **Configurações de IA**, o workflow avisa e para.
- **Foto real do produto**: usa **SerpApi** (busca Google Images pelo
  EAN), como o usuário já pretendia (confirmou que já usa SerpApi pra
  isso). Se o produto exige prescrição, usa a foto customizada que o
  balconista sobe no front (`custom_image_base64`) em vez de buscar.
- **Anexo de imagem pro Gemini**: por pedido do usuário, migrado de
  `inlineData` (base64 embutido no JSON, prompt fica gigante) pra
  **Gemini Files API** (`fileData.fileUri`) — sobe a logo e a foto do
  produto via upload resumível
  (`POST .../upload/v1beta/files` start + `PUT` no upload URL retornado),
  referencia só o `file.uri` no `generateContent`. Arquivos expiram
  sozinhos em 48h no lado do Google, não precisa limpar.
- **Modelo**: `gemini-2.5-flash-image` ("Nano Banana") — o antigo
  `gemini-2.0-flash-preview-image-generation` foi descontinuado (404).
  Ver comparação de modelos/custos abaixo.

### Bugs encontrados e corrigidos durante os testes (nessa ordem)

1. Backtick de abertura faltando no template do prompt (erro de sintaxe
   JS gerado, bug meu ao montar o código do node).
2. `.first()` usado num Code node em modo "Run Once for Each Item" (só
   funciona em "Run Once for All Items") — troquei pra `$input.item`.
3. Modelo Gemini descontinuado (`gemini-2.0-flash-preview-image-generation`
   → `gemini-2.5-flash-image`).
4. Paleta de cor (ex: `#ff0000`) interpretada quase literalmente pelo
   Gemini como "pinte tudo dessa cor" — prompt ajustado pra tratá-la como
   acento/destaque, não preenchimento da cena toda.
5. `fetch()` dentro de Code node não funciona nesse n8n (roda num task
   runner isolado sem rede) — trocado por nodes **HTTP Request** de
   verdade pra baixar logo/foto do produto.
6. Esse n8n guarda binário em modo **"database"** (não inline) —
   `item.binary.data.data` não é o base64 de verdade, é só um ponteiro.
   Precisa usar `this.helpers.getBinaryDataBuffer(itemIndex, propertyName)`
   dentro do Code node pra pegar os bytes reais (**não** é `$helpers`,
   que não existe nesse ambiente — só descobri testando os dois).
7. CDN de foto de produto (`cdn-cosmos.bluesoft.com.br`) não manda header
   `Content-Type` — o n8n rotulava a imagem como `text/plain`, e o Gemini
   ignorava. Corrigido: se o mimetype detectado não começa com `image/`,
   força um fallback sensato (`image/png`/`image/jpeg`).
8. Migração pra Gemini Files API: o passo de finalizar o upload
   (`X-Goog-Upload-Command: upload, finalize`) precisa ser **`PUT`**, não
   `POST` (confirmado com curl puro — `POST` retorna 405).
9. **Causa raiz do "Bad request" que sobrou por último**: eu estava
   setando o header `Content-Length` manualmente no PUT do upload,
   conflitando com o cálculo automático do cliente HTTP do n8n —
   corrompia os bytes enviados de forma silenciosa e determinística (o
   Google aceitava o upload, reportava tamanho certo, mas o conteúdo
   real vinha errado, confirmado comparando SHA-256 do arquivo real vs.
   o que o Google reportava). Removido o header manual, cliente HTTP
   calcula sozinho — resolveu de vez.

Testado ponta a ponta (sessão de teste temporária via magic link do
Supabase, já expirada) gerando um encarte de verdade pra farmácia de
teste — saiu correto: logo no topo, produto visível, preço em destaque,
paleta usada como acento, rodapé com endereço/telefone/validade.

### Custos por modelo Gemini (checado ao vivo em `ai.google.dev/gemini-api/docs/pricing`)

| Modelo | Apelido | Custo por imagem |
| :--- | :--- | :--- |
| `gemini-2.5-flash-image` (**em uso**) | Nano Banana | $0,039 (1024×1024) |
| `gemini-3.1-flash-lite-image` | Nano Banana 2 Lite | $0,034 (1K) |
| `gemini-3.1-flash-image` | Nano Banana 2 | $0,045–$0,151 (0.5K–4K) |
| `gemini-3-pro-image` | Nano Banana Pro | $0,134–$0,24 (qualidade bem superior) |

SerpApi: 250 buscas grátis/mês, depois ~$0,015–0,025/busca conforme o
plano. Custo estimado por encarte hoje (Nano Banana): **~$0,04 a $0,19**
(1 a 6 produtos sem foto própria).

### Organização de teste

`f59b6e40-dfb5-45a8-b272-7ce8741a4494` (slug `expervivencia-pro`) — tinha
`name = "Balconista Pro"` (nome do próprio produto, nunca customizado).
Renomeada pra **"Drogamais"** a pedido do usuário.

---

## Pendências / follow-ups pra quando voltar

- **`n8n-workflows/balconista-gerador-de-encarte.json`** é a fonte de
  verdade versionada, mas se o workflow for editado direto na UI do n8n
  depois, esse arquivo fica desatualizado — lembrar de re-exportar
  (redigindo os segredos) se mexer nele por lá.
- O workflow assume que cada farmácia configura suas próprias chaves
  Gemini + SerpApi em **Configurações de IA**. Nenhuma farmácia real
  além da de teste tem isso configurado ainda, então elas vão bater no
  aviso "configure suas chaves" ao tentar gerar encarte.
- O node antigo de busca via Google Custom Search (API key placeholder,
  nunca configurada) ficou só documentado aqui — não existe mais no
  workflow novo (foi substituído por SerpApi desde o início).
- Vale considerar limpar/consolidar os `.env`/credenciais de n8n
  espalhados (`N8N_OLD_*` apontando pra `tellamarketing.com.br`,
  domínio `n8n.expervivenciafarma.com.br` que nem está documentado) —
  não mexemos nisso agora, só documentamos o achado.

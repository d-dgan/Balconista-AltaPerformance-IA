# Especificação de Feature: Consulta ao Bulário ANVISA

> **Status:** Proposta / Planejado — viabilidade técnica investigada em
> 14/08/2026, ver seção 3.3. Não existe fonte pronta; caminho viável exige
> automação de navegador (Browserless), não é um "conectar API e pronto".  
> **Data:** 14/08/2026  
> **Projeto:** Balconista Pro IA  

---

## 1. Visão Geral & Objetivo

Permitir que o atendente de farmácia (balconista) ou o cliente final pesquise qualquer medicamento cadastrado na ANVISA e obtenha:
- Dados oficiais do produto (Nome comercial, Princípio Ativo, Laboratório/Razão Social, Número de Registro).
- Download/Visualização direta em PDF da **Bula do Paciente** e **Bula do Profissional de Saúde**.
- Resumos e respostas para dúvidas frequentes (posologia, contraindicações, interações medicamentosas) através da **IA do Balconista**.

---

## 2. Casos de Uso

1. **Consulta Rápida no Balcão:** O balconista digita o nome do remédio no sistema para confirmar dados do medicamento ou disponibilizar a bula para o cliente.
2. **Atendimento com IA (Chat/WhatsApp):** Quando o cliente pergunta no chat *"Para que serve o medicamento X?"* ou *"Qual a dosagem de Y?"*, a IA executa uma busca na ANVISA, extrai o contexto da bula e responde de forma clara e segura.
3. **Envio da Bula via WhatsApp:** O sistema gera o link do PDF da bula para envio instantâneo no atendimento ao cliente.

---

## 3. Arquitetura Técnica

### 3.1. Integração com a API Interna da ANVISA

* **Busca de Medicamentos:**
  * **Endpoint:** `GET https://consultas.anvisa.gov.br/api/consulta/bulario`
  * **Parâmetros:** `nomeProduto` (string), `count` (number), `page` (number).
  * **Headers:** `User-Agent` de navegador real + `Authorization: Guest`.

* **Download/Visualização do PDF:**
  * **Endpoint:** `GET https://consultas.anvisa.gov.br/api/consulta/medicamentos/arquivo/bula/id/{idBula}?operacao=isDocBula`
  * **IDs Utilizados:** `idBulaPacienteProtegido` ou `idBulaProfissionalProtegido` (retornados no JSON da busca).

### 3.2. Contorno do CORS (Backend Proxy)

Como a API da ANVISA bloqueia chamadas diretas vindas de navegadores (`fetch` do client-side) via CORS, a requisição será intermediada por:

- **Opção Principal:** Supabase Edge Function (`supabase/functions/bulario-search`)
- **Opção Alternativa:** Workflow no n8n (webhook REST)

⚠️ **Atualização (14/08/2026) — CORS não é o único bloqueio.** Ver seção 3.3 abaixo:
resolver CORS move a chamada pro servidor, mas o endpoint da ANVISA também tem
proteção Cloudflare que bloqueia chamada server-to-server sem cookie de sessão
válido. A Edge Function sozinha **não resolve** isso.

---

### 3.3. Investigação de Fontes de Dados (14/08/2026)

Antes de implementar, foi feita uma checagem prática de todas as fontes possíveis
pra alimentar essa feature. Resultado: **não existe hoje um "banco pronto" ou API
oficial estável pra isso.** Registrado aqui pra não repetir a investigação depois.

**1. API ao vivo da ANVISA (`consultas.anvisa.gov.br/api/consulta/bulario`)**
Testada direto via `curl` (server-to-server, sem browser): retorna **403
(Cloudflare "Attention Required")** com headers básicos, e **500** mesmo com
headers de navegador mais completos. Não é um problema de CORS — é bot-protection
da Cloudflare, que bloqueia por trás do navegador independente de onde a chamada
vem (Edge Function, n8n, etc. caem no mesmo bloqueio).

**2. Portal de Dados Abertos do governo (`dados.gov.br`)**
Existe um dataset oficial "Medicamentos Registrados no Brasil" que seria o "banco
pronto" ideal. Testado (API CKAN e página do dataset): **o portal inteiro retorna
401 (não autorizado)** atualmente — parece ter passado por uma migração que travou
até a leitura pública de metadados. Não é uma rota viável hoje.

**3. Datasets estáticos / projetos open source no GitHub**
Levantados e checados via API do GitHub (data do último commit):

| Repositório | Última atualização | Situação |
|---|---|---|
| `LaCAfe/Bulario2018PT-br` | mai/2018 | 8 anos parado |
| `breno12321/medAnvisaPrice` | fev/2021 | 5 anos parado |
| `hevertonfreitas/bulario` | jan/2020 | 6 anos parado |
| `iuryLandin/bulario` (lib) | jul/2023 | 3 anos parado |
| `bhfsilva/api-medicamentos-bulario` | jul/2025 | atualizado recentemente, mas **arquivado** logo em seguida |
| `iuryLandin/bulario-api` | fev/2025 | o mais ativo dos seis, mas ver ressalvas abaixo |

Nenhum serve como fonte contínua confiável — os mais antigos são fotos
congeladas (o pior tem 8 anos), e o mais recente vem com ressalvas sérias:

- O próprio README diz que é **"API exclusiva para testes e trabalhos
  acadêmicos"** — uso comercial exige contato direto com o autor. Descarta esse
  código específico pra um produto comercial como o Balconista Pro.
- O autor **já teve que tirar a instância pública do ar** porque terceiros
  estavam "minerando" as bulas e consumindo todo o recurso do servidor grátis —
  confirma que só ter o bypass funcionando não é suficiente, a infra também
  quebra sob uso real.
- O próprio README confirma por escrito: *"a ANVISA/Governo Brasileiro não
  disponibiliza alguns dados para serem utilizados por programadores e
  pesquisadores"* — não existe fonte oficial pra isso, é consenso de quem já
  tentou.

**4. Como esse projeto "resolve" o Cloudflare (e por que não é uma solução real)**
Inspecionado o código-fonte (`src/bulario.js` da lib `iuryLandin/bulario`). O
header de cada chamada tem um **cookie `cf_clearance` fixo, hardcoded**:

```js
"cookie": "FGTServer=...; cf_clearance=tk5QcLSYPlUQfr8s2bTGXyvC2KZdHcEIYU8r6HCgNvQ-1690462689-0-160.0.0",
```

O timestamp embutido no valor (`1690462689`) é **27/07/2023** — ou seja, o autor
resolveu o desafio do Cloudflare manualmente uma vez, num navegador de verdade,
copiou o cookie de sessão resultante e colou fixo no código. Isso não é uma
solução: `cf_clearance` expira (Cloudflare costuma dar horas/dias de validade,
não anos) e normalmente é atrelado ao IP que resolveu o desafio. O único elemento
"dinâmico" do código é o `User-Agent` (sorteado de uma lista), o que não ajuda em
nada — quem valida a sessão é o cookie, não o header.

**Conclusão prática:** pra funcionar de forma sustentável, a chamada à ANVISA
precisa vir de trás de um navegador real que resolva o desafio Cloudflare e
tenha o cookie de sessão renovado periodicamente — não de uma chamada HTTP
simples nem de um cookie fixo no código. O projeto já tem essa peça pronta: o
fluxo n8n `Google Flow - Conexão via Browserless (Sessão por Cookies)` (rodando
na ORAQLE VPS) faz exatamente esse tipo de automação de navegador com sessão por
cookies pra outro caso de uso, e é o candidato natural a reaproveitar aqui em vez
de escrever esse mecanismo do zero.

---

## 4. Estrutura de Arquivos no Projeto

```
src/
├── services/
│   └── bularioService.ts         # Métodos de chamada à Edge Function / ANVISA
├── components/
│   └── bulario/
│       ├── BularioSearchModal.tsx # Modal de busca por medicamento
│       └── BularioCardResult.tsx  # Card exibindo detalhes e botão de PDF
supabase/
└── functions/
    └── bulario-search/
        └── index.ts               # Proxy Edge Function no Deno
```

---

## 5. Plano de Implementação Passo a Passo

> Revisado em 14/08/2026 após a investigação da seção 3.3 — o passo 1 muda de
> "Edge Function simples" para "spike de viabilidade via Browserless" antes de
> construir o resto.

0. **Spike de viabilidade (n8n + Browserless):** Antes de montar UI, confirmar
   que dá pra abrir `consultas.anvisa.gov.br` via o fluxo `Google Flow - Conexão
   via Browserless (Sessão por Cookies)` já existente na VPS, passar pelo
   desafio Cloudflare, extrair o `cf_clearance` resultante e usá-lo pra bater
   no endpoint `/api/consulta/bulario` com sucesso. Sem isso funcionando, o
   resto do plano não se sustenta.
1. **Workflow n8n de busca:** Com o cookie válido, criar um webhook n8n que
   recebe o nome do remédio, reusa a sessão Browserless (renovando quando o
   cookie expirar) e retorna os dados formatados — assume o papel que estava
   planejado pra Edge Function, já que é o n8n (não o Supabase) quem tem a peça
   de automação de navegador.
2. **Serviço Frontend (`bularioService.ts`):** Implementar o cliente no React
   que chama esse webhook n8n.
3. **Componente de UI:** Criar o modal de busca com suporte a filtro em tempo
   real, visualização das informações e botões de download dos PDFs.
4. **Integração com IA (`aiService.ts` / n8n):** Registrar a função de consulta
   ao Bulário como uma *Tool* acessível pela IA durante o atendimento — inclusive
   resolve a lacuna já identificada no Perfil 3 do Agente Unificado, que hoje
   promete buscar no ANVISA/bula.com.br mas não tem nenhuma ferramenta de busca
   conectada.

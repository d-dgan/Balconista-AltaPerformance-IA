# Roadmap de módulos — Balconista Pro (SaaS para donos de farmácia)

> Brainstorm registrado em 2026-08-12. São ideias, não compromissos —
> cada uma vira um módulo real quando entrar em construção.

## Já no roadmap (placeholder no sidebar)

- **Chat IA** — ativo, terminal de atendimento farmacêutico com IA.
- **Gerador de Encarte** — monta encartes promocionais da farmácia.
- **Precificação** — sugestão de preços competitivos por região/mercado.
- **Análise de Potencial da Região** — avalia potencial de uma região antes
  de abrir/expandir uma unidade.

## Ideias novas

### Operação / estoque

- **Controle de validade** — alerta de produtos perto do vencimento +
  sugestão de "queima de estoque" (desconto, kit, destaque no balcão).
- **Curva ABC de produtos** — quais itens dão mais margem/giro, pra
  priorizar vitrine e treinamento da equipe.

### Financeiro

- **Dashboard financeiro simplificado** — ticket médio, margem por
  categoria, DRE básico.
- **Conciliação de convênios/PBM** — bate as vendas por convênio com o
  repasse.

### Gente e atendimento

*Reaproveitam o motor de IA que já existe no Chat.*

- **Auditoria de atendimento** — o Chat já loga as conversas; dá pra
  gerar um scorecard automático de qualidade por balconista (seguiu o
  protocolo? ofereceu upsell? indicou perfumaria?).
- **Treinamento / microlearning** — quizzes curtos gerados por IA sobre
  produtos e protocolos de indicação, pra equipe ir se atualizando.

### Cliente final

- **CRM / fidelidade** — histórico de compras, aniversário, campanhas de
  recompra automáticas.
- **Agendamento de serviços** — vacina, teste rápido, aferição de
  pressão.

### Inteligência de mercado

- **Monitoramento de concorrência** — preço de farmácias próximas nos
  produtos-chave.
- **Previsão de demanda sazonal** — gripe, alergia etc., baseado em
  época do ano e região.

## Quick wins sugeridos

Dado o que já está construído, **auditoria de atendimento** e **controle
de validade** são os mais baratos de tirar do papel: o primeiro só
precisa ler o que o Chat já registra, o segundo é o tipo de dado que a
Análise de Potencial da Região já vai precisar buscar externamente de
qualquer forma.

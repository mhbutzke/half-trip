# Half-Trip Visual Directions (Trips, Trip Overview, Login)

Data: 2026-02-16
Escopo: `app-trips`, `app-trip-overview`, `public-login`

## Direção 1 - Conservadora

- Objetivo: melhorar legibilidade e consistência sem alterar identidade visual.
- Cores: mantém palette atual, só reforça contraste em links, badges e textos secundários.
- Espaçamento: incremento leve (`+4px` a `+8px`) entre blocos verticais.
- Componentes:
  - Trips: cards com padding interno um pouco maior e destaque sutil no estado ativo.
  - Trip Overview: hierarquia mais clara de seções e cards de resumo.
  - Login: foco em clareza de labels e botão principal.
- Risco: baixo.
- Impacto visual: baixo a médio.

## Direção 2 - Equilibrada (Recomendada)

- Objetivo: modernizar a interface sem perder familiaridade para usuários atuais.
- Cores:
  - Base em tons neutros claros.
  - Primária mais forte para CTAs.
  - Cor de apoio para status e highlights em métricas.
- Espaçamento:
  - Grid mais respirado.
  - Distâncias consistentes entre títulos, conteúdo e ações.
- Componentes:
  - Trips: cards com estrutura em camadas (status, conteúdo, ações) e feedback de toque melhor.
  - Trip Overview: cards de métricas com contraste maior e agrupamento funcional.
  - Login: card central mais limpo, links de suporte e estados de erro mais legíveis.
- Risco: médio.
- Impacto visual: médio a alto.

## Direção 3 - Ousada

- Objetivo: reposicionar visualmente o produto com linguagem mais marcante.
- Cores:
  - Superfícies com contraste forte.
  - CTAs com acento vibrante.
  - Destaques mais evidentes para onboarding e estados de ação.
- Espaçamento:
  - Blocos maiores e tipografia com maior presença.
  - Mais separação entre áreas da tela.
- Componentes:
  - Trips: cards com visual mais expressivo e forte diferenciação entre viagens.
  - Trip Overview: painéis de resumo com linguagem quase dashboard.
  - Login: identidade visual mais editorial, com área de valor da marca.
- Risco: médio a alto.
- Impacto visual: alto.

## Critério de escolha

- Se prioridade é segurança de rollout: Direção 1.
- Se prioridade é evolução com baixo retrabalho: Direção 2.
- Se prioridade é mudança de marca percebida: Direção 3.

## Recomendação

Adotar Direção 2 para primeiro ciclo. Ela entrega melhora perceptível de UX/UI e reduz risco de rejeição visual por parte dos usuários atuais.

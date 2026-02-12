# Feature Specification: Suporte a Múltiplas Moedas

**Feature Branch**: `001-multi-currency`  
**Created**: 2026-02-12  
**Status**: Draft  
**Input**: User description: "Implementar suporte a múltiplas moedas nas despesas da viagem. Permitir que usuários registrem gastos em diferentes moedas (BRL, USD, EUR, etc.), com conversão de câmbio para uma moeda base da viagem e cálculo de balanço unificado."

## Clarifications

### Session 2026-02-12

- Q: Se o organizador alterar a moeda base de uma viagem com despesas existentes, o que acontece? → A: Impedir alteração da moeda base se existirem despesas registradas.
- Q: Quantas casas decimais o campo exchange_rate deve suportar? → A: 2 casas decimais (ex: 5.78).
- Q: Para viagens existentes sem moeda base, qual comportamento? → A: Atribuir BRL automaticamente via migração de dados.
- Q: Como funciona o seletor de moedas? → A: Lista fixa hardcoded de 6 moedas (BRL, USD, EUR, GBP, ARS, CLP).
- Q: Como exibir valores convertidos na lista de despesas? → A: Valor original em destaque + valor convertido em texto menor abaixo.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Moeda da Viagem (Priority: P1)

Ao criar ou editar uma viagem, o organizador define a moeda base (ex: BRL, USD, EUR). Todas as despesas são convertidas para essa moeda na hora de calcular o balanço. O usuário vê o balanço e acertos em uma única moeda.

**Why this priority**: Sem moeda base definida, não há referência para conversão e consolidar o balanço.

**Independent Test**: Criar viagem e definir moeda base. Verificar que a moeda aparece na lista de viagens e na tela de balanço.

**Acceptance Scenarios**:

1. **Given** usuário criando nova viagem, **When** preenche o formulário e seleciona moeda base (ex: EUR), **Then** a viagem é criada com moeda EUR armazenada
2. **Given** viagem existente sem moeda base, **When** organizador edita a viagem, **Then** pode definir moeda base e salvar
3. **Given** viagem com moeda base definida, **When** usuário visualiza o balanço, **Then** todos os valores são exibidos na moeda base
4. **Given** viagem com despesas registradas, **When** organizador tenta alterar moeda base, **Then** sistema impede a alteração e exibe mensagem explicativa

---

### User Story 2 - Registrar Despesa em Moeda Diferente (Priority: P1)

Ao adicionar uma despesa, o usuário escolhe a moeda da despesa (ex: USD) e informa a taxa de câmbio usada na data do gasto (ou usa taxa automática se disponível). O sistema converte para a moeda base e inclui no cálculo de balanço.

**Why this priority**: É o fluxo principal: viagens internacionais envolvem gastos em várias moedas.

**Independent Test**: Adicionar despesa em USD com taxa de câmbio. Verificar que o valor convertido aparece corretamente no balanço e na lista de despesas.

**Acceptance Scenarios**:

1. **Given** viagem com moeda base BRL, **When** usuário adiciona despesa de 100 USD com taxa 5,00, **Then** sistema registra 500 BRL para o balanço
2. **Given** viagem com moeda base EUR, **When** usuário adiciona despesa em USD, **Then** sistema exige taxa de câmbio ou usa taxa padrão
3. **Given** despesa em moeda base (ex: BRL em viagem BRL), **When** usuário adiciona despesa, **Then** nenhuma conversão é necessária (taxa implícita 1)

---

### User Story 3 - Visualização e Balanço Unificado (Priority: P1)

Nas telas de despesas e balanço, o usuário vê cada despesa na moeda original (com valor convertido entre parênteses ou na moeda base). O balanço total e acertos são sempre na moeda base da viagem.

**Why this priority**: Transparência sem confusão. Usuário vê o que gastou e o equivalente em moeda base.

**Independent Test**: Criar viagem, adicionar despesas em 2+ moedas, verificar balanço e acertos. Conferir que soma total bate em moeda base.

**Acceptance Scenarios**:

1. **Given** viagem com despesas em BRL e USD convertidas, **When** usuário abre tela de balanço, **Then** vê saldo total e acertos em moeda base
2. **Given** lista de despesas, **When** usuário visualiza, **Then** cada despesa mostra valor original em destaque e valor convertido em texto menor abaixo (ou apenas original se for moeda base)
3. **Given** viagem com despesas mistas, **When** usuário exporta relatório, **Then** inclui valores convertidos e moeda base

---

### User Story 4 - Editar Taxa de Câmbio (Priority: P2)

Usuário pode editar a taxa de câmbio de uma despesa existente (ex: corrigir erro de digitação). O balanço recalcula automaticamente.

**Why this priority**: Erros de digitação são comuns; não bloqueia a feature principal.

**Independent Test**: Editar taxa de despesa existente (ex: 5,00 → 5,10). Verificar que balanço e acertos atualizam.

**Acceptance Scenarios**:

1. **Given** despesa em USD com taxa 5,00, **When** usuário edita taxa para 5,10, **Then** valor convertido atualiza e balanço recalcula
2. **Given** despesa em moeda base, **When** usuário tenta editar taxa, **Then** taxa não é editável (ou oculta)

---

### Edge Cases

- Viagem sem moeda base definida: migração atribui BRL automaticamente; novas viagens exigem seleção de moeda base na criação.
- Despesas antigas criadas antes da feature (sem taxa): taxa implícita 1, valor tratado como moeda base (BRL via migração).
- Usuário não informa taxa de câmbio e não há API externa: taxa de câmbio é campo obrigatório ao selecionar moeda diferente da base.
- Funcionamento offline: taxas de câmbio são armazenadas localmente com a despesa; despesas offline usam taxa informada manualmente.
- Organizador tenta alterar moeda base com despesas existentes: sistema impede a alteração.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Sistema DEVE permitir que o organizador defina moeda base da viagem (ISO 4217). Alteração é impedida após existirem despesas registradas.
- **FR-002**: Sistema DEVE permitir que o usuário selecione a moeda da despesa ao cadastrar a partir de lista fixa: BRL, USD, EUR, GBP, ARS, CLP.
- **FR-003**: Sistema DEVE armazenar taxa de câmbio com 2 casas decimais (ex: 5.78) usada na data da despesa (valor original × taxa = valor convertido).
- **FR-004**: Sistema DEVE calcular o balanço e acertos em moeda base, somando todas as despesas convertidas.
- **FR-005**: Sistema DEVE exibir despesas com valor original em destaque e, quando diferente da base, valor convertido em texto menor abaixo.
- **FR-006**: Sistema DEVE permitir edição da taxa de câmbio de despesas existentes e recalcular balanço.
- **FR-007**: Sistema DEVE funcionar offline: taxas usadas devem ser persistidas (manual ou última cache); sem conversão automática em tempo real offline.
- **FR-008**: Sistema DEVE suportar viagens existentes (despesas sem taxa): tratar como moeda base com taxa implícita 1.

### Key Entities

- **Trip**: Adiciona atributo `base_currency` (ISO 4217, ex: BRL).
- **Expense**: Mantém `currency`; adiciona `exchange_rate` decimal(10,2) (taxa usada para converter para moeda base; 1.00 quando currency = base).
- **ParticipantBalance / Settlement**: Valores continuam em número; semântica é "moeda base da viagem".

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Usuário pode cadastrar despesa em moeda diferente da base em menos de 1 minuto (incluindo taxa).
- **SC-002**: Balanço e acertos são exibidos corretamente para viagens com até 3 moedas diferentes.
- **SC-003**: Edição de taxa de câmbio atualiza balanço em menos de 2 segundos.
- **SC-004**: Viagens existentes sem moeda base continuam funcionando (sem regressão).
- **SC-005**: Usuário consegue distinguir despesa original vs convertida sem ambiguidade na interface.

## Assumptions

- Moedas suportadas: lista fixa hardcoded de 6 moedas — BRL, USD, EUR, GBP, ARS, CLP.
- Taxa de câmbio é informada manualmente pelo usuário (fase 1); API de câmbio em tempo real pode ser fase 2.
- Taxa de câmbio armazenada com 2 casas decimais.
- Viagens existentes sem moeda base recebem BRL automaticamente via migração de dados.
- Despesas legado (sem moeda/taxa) são tratadas como moeda base com taxa 1.00.
- Moeda base não pode ser alterada após existirem despesas registradas na viagem.
- Exibição de despesas: valor original em destaque, valor convertido em texto menor abaixo.

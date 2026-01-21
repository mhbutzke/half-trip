# Half Trip - Product Requirements Document (PRD)

## 1. Visão Geral

### 1.1 One-liner

Half Trip é uma plataforma para planejar viagens em grupo, compartilhar roteiros e itinerários e dividir despesas de forma justa, tudo em um só lugar.

### 1.2 Proposta de Valor

**Planeje junto. Viaje melhor. Divida justo.**

Viajar em grupo é incrível — organizar, nem tanto. O Half Trip resolve isso reunindo roteiro, despesas e pessoas em um único lugar.

### 1.3 Problema que Resolve

**Antes do Half Trip:**

- Planilhas confusas
- Prints de conversa perdidos
- Discussões sobre dinheiro
- "Depois a gente acerta" que nunca acerta

**Com o Half Trip:**

- Tudo organizado em um lugar
- Transparência total
- Divisão justa e automática
- Mais foco na viagem, menos no controle

---

## 2. Público-Alvo

| Segmento    | Descrição                                         |
| ----------- | ------------------------------------------------- |
| 👯 Amigos   | Grupos de amigos viajando juntos                  |
| 💑 Casais   | Casais que querem organizar gastos compartilhados |
| 👨‍👩‍👧 Famílias | Famílias em viagens com múltiplos pagadores       |
| 🎉 Grupos   | Grupos de viagem, eventos ou intercâmbios         |

**Critério simples:** Se mais de uma pessoa está viajando, o Half Trip faz sentido.

---

## 3. Plataforma e Tecnologia

### 3.1 Estratégia de Plataforma

| Fase       | Plataforma       | Descrição                                                   |
| ---------- | ---------------- | ----------------------------------------------------------- |
| **MVP**    | Web Mobile-First | Progressive Web App (PWA) responsivo, otimizado para mobile |
| **Futuro** | Apps Nativos     | iOS (App Store) e Android (Google Play)                     |

### 3.2 Requisitos Técnicos

- **Sincronização em tempo real**: Todas as alterações devem ser refletidas instantaneamente para todos os participantes (similar ao Google Docs)
- **Suporte offline (incluído no MVP)**:
  - Manter cópia local da última versão sincronizada
  - Permitir adicionar arquivos e despesas enquanto offline
  - Sincronizar automaticamente quando conexão for restaurada
  - Resolução de conflitos: última alteração prevalece (last-write-wins), com histórico de alterações visível para auditoria

---

## 4. Funcionalidades

### 4.1 Autenticação e Usuários

#### F01: Cadastro de Usuário

- **Método**: Email e senha
- **Campos obrigatórios**: Nome, email, senha
- **Validações**:
  - Email único e válido
  - Senha com mínimo de 8 caracteres
  - Confirmação de email (opcional no MVP)

#### F02: Login

- **Método**: Email e senha
- **Funcionalidades**:
  - Manter sessão ativa (remember me)
  - Recuperação de senha por email

#### F03: Perfil do Usuário

- Nome de exibição
- Foto de perfil (opcional)
- Configurações de notificação

---

### 4.2 Gestão de Viagens

#### F04: Criar Viagem

- **Campos**:
  - Nome da viagem (obrigatório)
  - Destino (obrigatório)
  - Data de início (obrigatório)
  - Data de fim (obrigatório)
  - Moeda da viagem (obrigatório, padrão: BRL) - todas as despesas usarão esta moeda
  - Descrição (opcional)
  - Imagem de capa (opcional)
  - Estilo da viagem (opcional): Aventura, Relaxamento, Cultural, Gastronômico, etc.

#### F05: Editar Viagem

- Alterar qualquer informação da viagem
- Apenas organizadores podem editar dados principais

#### F06: Excluir/Arquivar Viagem

- Arquivar viagens passadas
- Excluir viagens (com confirmação)

#### F07: Lista de Viagens

- Viagens ativas (em andamento ou futuras)
- Viagens passadas (arquivadas)
- Filtros e busca

---

### 4.3 Participantes e Convites

#### F08: Convidar Participantes

- **Métodos de convite**:
  - Link de convite (compartilhável)
  - Convite por email
- **Fluxo**:
  1. Organizador gera convite
  2. Convidado recebe link/email
  3. Convidado se cadastra (se necessário) e aceita convite
  4. Convidado é adicionado à viagem

#### F09: Gerenciar Participantes

- Ver lista de participantes
- Remover participantes (apenas organizadores)
- Sair da viagem (próprio usuário)

#### F10: Papéis e Permissões

| Papel            | Permissões                                                                       |
| ---------------- | -------------------------------------------------------------------------------- |
| **Organizador**  | Tudo: editar viagem, gerenciar participantes, editar roteiro, gerenciar despesas |
| **Participante** | Ver tudo, adicionar ao roteiro, adicionar despesas próprias                      |

---

### 4.4 Roteiro e Itinerário

#### F11: Visualização por Dias

- Timeline organizada por dias da viagem
- Visualização clara de cada dia com atividades

#### F12: Adicionar Atividade/Evento

- **Campos**:
  - Título (obrigatório)
  - Data e horário (obrigatório)
  - Duração estimada (opcional)
  - Local/Endereço (opcional)
  - Descrição (opcional)
  - Categoria: Transporte, Hospedagem, Passeio, Refeição, Evento, Outro
  - Links úteis (opcional)
  - Anexos/Arquivos (opcional): reservas, ingressos, vouchers

#### F13: Editar/Excluir Atividade

- Qualquer participante pode editar ou excluir atividades
- Histórico de alterações (quem alterou o quê)

#### F14: Reordenar Atividades

- Arrastar e soltar para reordenar
- Mover atividade entre dias

#### F15: Notas e Links Importantes

- Área para anotações gerais da viagem
- Lista de links úteis (documentos, reservas, mapas)

---

### 4.5 Controle de Despesas

#### F16: Adicionar Despesa

- **Campos**:
  - Descrição (obrigatório)
  - Valor (obrigatório)
  - Data (obrigatório)
  - Categoria (obrigatório): Hospedagem, Alimentação, Transporte, Passeios/Ingressos, Compras, Outros
  - Quem pagou (obrigatório)
  - Divisão (obrigatório): ver F17
  - Comprovante/Foto (opcional)
  - Notas (opcional)

> **Nota sobre moeda**: A moeda é definida por viagem (ver F04), não por despesa individual. Todas as despesas de uma viagem usam a mesma moeda.

#### F17: Tipos de Divisão

| Tipo                   | Descrição                                                       |
| ---------------------- | --------------------------------------------------------------- |
| **Igualmente**         | Dividir valor total igualmente entre participantes selecionados |
| **Por valor**          | Definir valor específico que cada pessoa deve                   |
| **Por percentual**     | Definir percentual que cada pessoa deve                         |
| **Apenas para alguns** | Selecionar quais participantes fazem parte da divisão           |

#### F18: Editar/Excluir Despesa

- Quem adicionou pode editar/excluir
- Organizadores podem editar/excluir qualquer despesa

#### F19: Lista de Despesas

- Ordenada por data (mais recente primeiro)
- Filtros por categoria, quem pagou, período
- Busca por descrição

#### F20: Categorização Visual

- Ícones e cores por categoria
- Gráfico de distribuição por categoria

---

### 4.6 Divisão e Balanço

#### F21: Cálculo Automático de Balanço

- Calcular saldo de cada participante em tempo real
- Mostrar quem está devendo e quem tem a receber
- Algoritmo de simplificação de dívidas (minimizar número de transferências)

#### F22: Resumo Individual

- Para cada participante:
  - Total que pagou
  - Total que deve
  - Saldo (positivo = tem a receber, negativo = deve)

#### F23: Quem Paga Quem

- Lista clara de transferências necessárias
- Exemplo: "João deve R$ 150 para Maria"
- Opção de marcar como "acertado" (registro apenas, sem integração de pagamento)

#### F24: Resumo Final da Viagem

- Total de gastos da viagem
- Gastos por categoria
- Gastos por pessoa
- Média por pessoa
- Balanço final

---

### 4.7 Sincronização e Offline

#### F25: Sincronização em Tempo Real

- Todas as alterações aparecem instantaneamente para todos os participantes
- Indicador de quem está online/visualizando
- Notificação de alterações (opcional)

#### F26: Modo Offline

- **Leitura**: Acesso completo à última versão sincronizada
- **Escrita offline**:
  - Adicionar despesas
  - Adicionar atividades ao roteiro
  - Adicionar notas e arquivos
  - Editar itens existentes
- **Sincronização**:
  - Automática quando conexão for restaurada
  - Indicador visual de itens pendentes de sync
  - Resolução de conflitos: última alteração prevalece (last-write-wins)
  - Histórico de alterações mantido para auditoria e transparência

#### F27: Indicadores de Status

- Online/Offline claramente visível
- Itens pendentes de sincronização
- Último sync bem-sucedido

---

### 4.8 Notificações

#### F28: Notificações In-App

- Nova despesa adicionada
- Roteiro atualizado
- Novo participante entrou
- Viagem se aproximando

#### F29: Notificações Push (Futuro - Apps Nativos)

- Mesmos eventos do F28
- Configurável pelo usuário

---

## 5. Fluxos de Usuário

### 5.1 Fluxo Principal: Criar e Usar uma Viagem

```
1. Usuário se cadastra/faz login
2. Cria nova viagem (destino, datas, estilo)
3. Convida amigos via link ou email
4. Amigos aceitam convite e entram na viagem
5. Grupo monta roteiro colaborativamente
6. Durante a viagem, registram despesas em tempo real
7. Half Trip calcula automaticamente quem deve quem
8. No final, acertam as contas baseado no resumo
```

### 5.2 Fluxo: Adicionar Despesa Rápida

```
1. Usuário abre viagem ativa
2. Toca em "+" ou "Nova despesa"
3. Preenche valor e descrição
4. Seleciona categoria
5. Escolhe divisão (padrão: igualmente entre todos)
6. Confirma
7. Despesa aparece instantaneamente para todos
```

### 5.3 Fluxo: Modo Offline

```
1. Usuário perde conexão
2. App mostra indicador "Offline"
3. Usuário continua usando (leitura e escrita)
4. Alterações ficam em fila local
5. Conexão restaurada
6. Sync automático em background
7. Indicador muda para "Online"
8. Alterações visíveis para todos
```

---

## 6. Requisitos Não-Funcionais

### 6.1 Performance

- Tempo de carregamento inicial: < 3 segundos
- Sincronização de alterações: < 500ms
- App deve funcionar bem em conexões 3G

### 6.2 Segurança

- Senhas hasheadas (bcrypt ou similar)
- HTTPS obrigatório
- Tokens JWT para autenticação
- Dados sensíveis criptografados

### 6.3 Escalabilidade

- Suportar múltiplas viagens por usuário
- Suportar grupos de até 50 pessoas por viagem
- Suportar milhares de despesas por viagem

### 6.4 Usabilidade

- Interface intuitiva, sem necessidade de tutorial
- Mobile-first: otimizado para uso com uma mão
- Acessibilidade básica (contraste, tamanhos de fonte)

### 6.5 Disponibilidade

- Uptime mínimo: 99%
- Backups diários

---

## 7. Tom de Marca

### O Half Trip É:

- ✅ Simples
- ✅ Justo
- ✅ Colaborativo
- ✅ Sem fricção

### O Half Trip NÃO É:

- ❌ Um app financeiro complexo
- ❌ Um planner engessado
- ❌ Um problema a mais na viagem

### Frases de Marca

- "Planeje juntos. Divida justo."
- "A viagem é compartilhada. A organização também."
- "Viajar em grupo sem dor de cabeça."
- "Menos contas, mais histórias."

---

## 8. Fora do Escopo (MVP)

Os seguintes itens **não** fazem parte do MVP, mas podem ser considerados para versões futuras:

- [ ] Apps nativos iOS/Android (planejado pós-MVP)
- [ ] Múltiplas moedas por viagem com conversão automática
- [ ] Integração com meios de pagamento (PIX, etc.)
- [ ] Integração com Google Maps/Apple Maps
- [ ] Integração com calendário do dispositivo
- [ ] Templates de viagem
- [ ] Viagens públicas/comunidade
- [ ] Chat entre participantes
- [ ] Gamificação
- [ ] Relatórios exportáveis (PDF)

> **Nota**: O MVP inclui suporte a uma moeda selecionável por viagem. A conversão automática entre moedas diferentes fica para versões futuras.

---

## 9. Métricas de Sucesso

| Métrica              | Definição                                         |
| -------------------- | ------------------------------------------------- |
| Viagens criadas      | Número de viagens criadas por período             |
| Usuários ativos      | Usuários únicos que acessaram no período          |
| Despesas registradas | Volume de despesas adicionadas                    |
| Taxa de convite      | % de convites que resultam em novos participantes |
| Retenção             | % de usuários que criam segunda viagem            |

---

## 10. Glossário

| Termo            | Definição                                                |
| ---------------- | -------------------------------------------------------- |
| **Viagem**       | Evento de viagem com datas, destino e participantes      |
| **Organizador**  | Criador da viagem, com permissões administrativas        |
| **Participante** | Membro da viagem (inclui organizador)                    |
| **Roteiro**      | Planejamento de atividades organizadas por dia           |
| **Atividade**    | Item do roteiro (passeio, reserva, transporte, etc.)     |
| **Despesa**      | Gasto registrado com informações de quem pagou e divisão |
| **Balanço**      | Cálculo de quem deve para quem                           |
| **Sync**         | Sincronização de dados entre dispositivo e servidor      |

---

## 11. Decisoes de Escopo (MVP)

As seguintes decisoes foram tomadas para definir o escopo do MVP:

| Decisao                    | Escolha                           | Justificativa                                                                  |
| -------------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| **Suporte Offline**        | Completo (leitura + escrita)      | Essencial para viajantes que frequentemente ficam sem internet                 |
| **Moeda**                  | Uma moeda selecionavel por viagem | Flexibilidade para viagens internacionais sem complexidade de conversao        |
| **Resolucao de Conflitos** | Last-write-wins com historico     | Simplicidade tecnica mantendo transparencia atraves do historico de alteracoes |

---

## 12. Historico de Revisoes

| Data       | Versao | Descricao                                                                         |
| ---------- | ------ | --------------------------------------------------------------------------------- |
| 2026-01-21 | 1.0    | Versao inicial do PRD                                                             |
| 2026-01-21 | 1.1    | Decisoes de escopo: offline completo, moeda por viagem, conflitos last-write-wins |

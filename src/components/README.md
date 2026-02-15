# Componentes Half Trip

Este diretório contém todos os componentes React do Half Trip, organizados por funcionalidade.

## 📁 Estrutura de Pastas

### `/ui` - Componentes Base
Componentes reutilizáveis de interface básica (botões, inputs, cards, etc.)

**Componentes de Formulário:**
- `input.tsx` - Campo de texto
- `button.tsx` - Botão
- `select.tsx` - Seletor dropdown
- `textarea.tsx` - Área de texto
- `form.tsx` - Wrapper de formulário (React Hook Form)

**Componentes de Layout:**
- `card.tsx` - Container de conteúdo
- `dialog.tsx` - Modal/Dialog
- `sheet.tsx` - Painel lateral
- `tabs.tsx` - Navegação por abas

**Componentes de Feedback:**
- `toast.tsx` / `sonner.tsx` - Notificações
- `skeleton.tsx` - Loading placeholder
- `skeleton-card.tsx` - Loading states pré-configurados
- `error-state.tsx` - Estados de erro
- `empty-state.tsx` - Estados vazios
- `empty-state-enhanced.tsx` - Estados vazios com mais opções

**Componentes de Navegação:**
- `step-indicator.tsx` - Indicador de progresso multi-step
- `skip-links.tsx` - Links de acessibilidade

**Componentes Visuais:**
- `badge.tsx` - Etiquetas/tags
- `avatar.tsx` - Avatar de usuário
- `progress.tsx` - Barra de progresso
- `separator.tsx` - Linha divisória

**Componentes Utilitários:**
- `required-mark.tsx` - Indicador de campo obrigatório (*)
- `optimized-image.tsx` - Imagem otimizada com loading
- `fade-in.tsx` - Animação de fade-in
- `keyboard-shortcuts.tsx` - Atalhos de teclado

### `/activities` - Atividades/Itinerário
Componentes relacionados ao planejamento de atividades da viagem.

- `add-activity-dialog.tsx` - Dialog para adicionar atividade
- `activity-form-fields.tsx` - Campos do formulário
- `activity-category-selector.tsx` - Seletor visual de categorias
- `location-autocomplete.tsx` - Autocomplete para localização
- `duration-input.tsx` - Input de duração

### `/expenses` - Despesas
Componentes para gerenciamento de despesas.

- `add-expense-dialog.tsx` - Dialog para adicionar despesa
- `category-selector.tsx` - Seletor visual de categorias
- `expense-card.tsx` - Card de despesa individual

### `/trips` - Viagens
Componentes relacionados à criação e gestão de viagens.

- `create-trip-dialog.tsx` - Dialog de criação de viagem
- `edit-trip-dialog.tsx` - Dialog de edição
- `trip-card.tsx` - Card de viagem na lista

### `/balance` - Balanço/Divisão
Componentes para visualização de divisão de despesas.

- `balance-bar-chart.tsx` - Gráfico de barras do balanço
- `settlement-flow.tsx` - Fluxo visual de acertos

### `/forms` - Componentes de Formulário
Componentes específicos de formulário reutilizáveis.

- `currency-amount-input.tsx` - Input de valor monetário
- `member-split-selector.tsx` - Seletor de divisão entre membros

### `/layout` - Layout
Componentes de estrutura da aplicação.

- `page-container.tsx` - Container de página
- `trip-sidebar.tsx` - Sidebar de viagem

## 🎨 Padrões de Design

### Nomenclatura
- Use PascalCase para nomes de componentes
- Seja descritivo: `UserProfileCard` ao invés de `Card`
- Prefixe componentes de formulário: `FormInput`, `FormSelect`

### Estrutura de Arquivo
```tsx
'use client'; // Se necessário

import { ... } from '...';

interface ComponentProps {
  // Props tipadas
}

export function Component({ ...props }: ComponentProps) {
  // Lógica do componente
  
  return (
    // JSX
  );
}
```

### Props
- Sempre tipe as props com TypeScript
- Use `?` para props opcionais
- Forneça valores padrão quando apropriado
- Exporte tipos de props quando reutilizáveis

### Acessibilidade
- Sempre inclua `aria-label` em ícones clicáveis
- Use `aria-hidden="true"` em ícones decorativos
- Inclua `role` quando apropriado
- Garanta navegação por teclado

### Performance
- Use `'use client'` apenas quando necessário
- Lazy load componentes pesados com `dynamic()`
- Memoize callbacks com `useCallback`
- Memoize valores computados com `useMemo`

### Animações
- Use constantes de `lib/animation-constants.ts`
- Prefira transições CSS a JavaScript
- Respeite `prefers-reduced-motion`

## 🧩 Componentes Reutilizáveis

### StepIndicator
Indicador visual de progresso em wizards multi-step.

```tsx
<StepIndicator
  steps={[
    { label: 'Passo 1', description: 'Descrição' },
    { label: 'Passo 2' },
  ]}
  currentStep={1}
  completedSteps={new Set([1])}
/>
```

### RequiredMark
Indicador de campo obrigatório.

```tsx
<FormLabel>
  Nome<RequiredMark />
</FormLabel>
```

### CategorySelector
Seletor visual de categorias com ícones.

```tsx
<CategorySelector
  value={category}
  onChange={setCategory}
/>
```

### FadeIn
Animação de entrada com Intersection Observer.

```tsx
<FadeIn direction="up" delay={100}>
  <Card>...</Card>
</FadeIn>
```

## 📚 Hooks Úteis

### useAsyncAction
Gerencia estados de ações assíncronas.

```tsx
const { execute, isLoading, error } = useAsyncAction(myAsyncFunction, {
  successMessage: 'Sucesso!',
  onSuccess: () => { ... },
});
```

### useKeyboardShortcut
Adiciona atalho de teclado.

```tsx
useKeyboardShortcut('n', handleNew, ['ctrl']);
```

### useBreakpoint
Detecta breakpoint atual.

```tsx
const isMobile = useIsMobile();
const breakpoint = useBreakpoint();
```

## 🎯 Boas Práticas

1. **Composição sobre complexidade** - Prefira componentes pequenos e focados
2. **Reutilização** - Se usar 2x, extraia para componente
3. **Tipagem forte** - Sem `any`, use tipos específicos
4. **Documentação** - Comente comportamentos não óbvios
5. **Testes** - Componentes críticos devem ter testes
6. **Acessibilidade** - Sempre considere usuários de teclado/screen reader

## 🔧 Debugging

- Use React DevTools para inspecionar árvore de componentes
- Verifique re-renders desnecessários com DevTools Profiler
- Console.log é seu amigo, mas remova antes do commit

## 📖 Recursos

- [Shadcn/UI](https://ui.shadcn.com/) - Base dos componentes
- [Radix UI](https://www.radix-ui.com/) - Primitives acessíveis
- [Tailwind CSS](https://tailwindcss.com/) - Estilização
- [Next.js](https://nextjs.org/) - Framework

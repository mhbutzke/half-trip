# Mobile Frontend Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir 13 problemas de acessibilidade e UX mobile identificados na revisao Kombai AI, elevando a pontuacao mobile de 68/100 para ~80+/100.

**Architecture:** Mudancas puramente de frontend — CSS classes, props, e pequenos componentes. Nenhuma mudanca de banco de dados ou server actions. Todas as mudancas sao retrocompativeis.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, lucide-react

---

## Task 1: Fix h1 hierarchy in mobile header

**Files:**

- Modify: `src/components/layout/mobile-header.tsx:94`

**Context:** O `mobile-header.tsx` usa `<h1>` para o titulo, mas cada pagina tambem tem seu proprio `<h1>`. Isso cria multiplos h1 por pagina, violando WCAG 2.4.6.

**Step 1: Change h1 to span in mobile-header**

Em `src/components/layout/mobile-header.tsx`, linha 94:

```tsx
// ANTES:
<h1 className="truncate text-base font-semibold">{title}</h1>

// DEPOIS:
<span className="truncate text-base font-semibold">{title}</span>
```

**Step 2: Verify visually**

Abrir app no browser, verificar que o titulo do header mobile aparece igual visualmente. Verificar com DevTools que nao ha mais h1 duplicado.

**Step 3: Commit**

```bash
git add src/components/layout/mobile-header.tsx
git commit -m "fix(a11y): remove duplicate h1 from mobile header

Change mobile header title from h1 to span to prevent multiple h1 tags
per page. Each page content already has its own h1 for semantic heading."
```

---

## Task 2: Add bottomNav prop to all app pages

**Files:**

- Modify: `src/app/(app)/trips/page.tsx:71`
- Modify: `src/app/(app)/settings/page.tsx:44`
- Modify: `src/app/(app)/trip/[id]/trip-content.tsx:133,146`
- Modify: `src/app/(app)/trip/[id]/expenses/page.tsx:62`
- Modify: `src/app/(app)/trip/[id]/balance/page.tsx:21`
- Modify: `src/app/(app)/trip/[id]/budget/page.tsx:70`
- Modify: `src/app/(app)/trip/[id]/checklists/page.tsx:73`
- Modify: `src/app/(app)/trip/[id]/itinerary/page.tsx:56`
- Modify: `src/app/(app)/trip/[id]/notes/page.tsx:48`
- Modify: `src/app/(app)/trip/[id]/participants/page.tsx:82`
- Modify: `src/app/(app)/trips/loading.tsx:7`
- Modify: `src/app/(app)/trip/[id]/loading.tsx:7`
- Modify: `src/app/(app)/trip/[id]/expenses/loading.tsx:6`
- Modify: `src/app/(app)/trip/[id]/itinerary/loading.tsx:6`
- Modify: `src/app/(app)/settings/loading.tsx:7`
- Reference: `src/components/layout/page-container.tsx` (prop ja existe, adiciona `pb-24 md:pb-6`)

**Context:** O `PageContainer` tem uma prop `bottomNav` que adiciona padding-bottom de 96px para nao ficar sobreposto pela nav fixa inferior. **Nenhuma pagina esta usando essa prop**, causando cards proximo ao rodape ficarem inacessiveis.

**Step 1: Add bottomNav to each PageContainer usage**

Para CADA arquivo listado acima, trocar:

```tsx
<PageContainer>        // ou <PageContainer className="...">
```

Por:

```tsx
<PageContainer bottomNav>  // ou <PageContainer bottomNav className="...">
```

Nota: `src/app/(app)/trip/[id]/trip-content.tsx` tem DOIS usos de PageContainer (linhas 133 e 146) — ambos precisam da prop.

Nota: `src/app/(app)/settings/loading.tsx` usa `<PageContainer maxWidth="2xl">` — mudar para `<PageContainer bottomNav maxWidth="2xl">`.

**Step 2: Verify visually**

Abrir `/trips` no mobile (375px). Verificar que o ultimo trip card tem espaco suficiente acima da bottom nav. Clicar no trip card mais proximo da nav — deve navegar sem interceptacao.

**Step 3: Commit**

```bash
git add src/app/\(app\)/
git commit -m "fix: add bottomNav padding to all app pages

Prevent bottom navigation from intercepting clicks on content near the
footer. The PageContainer bottomNav prop adds pb-24 on mobile."
```

---

## Task 3: Fix contrast on auth page links

**Files:**

- Modify: `src/app/(auth)/login/page.tsx:189`
- Modify: `src/app/(auth)/register/page.tsx:339`

**Context:** Links "Criar conta" e "Entrar" usam `text-primary` (#00c2cb) sobre fundo claro, resultando em contraste ~2.6:1 (WCAG AA exige 4.5:1). Adicionar underline permanente compensa o contraste insuficiente mantendo a cor da marca.

**Step 1: Fix login page link**

Em `src/app/(auth)/login/page.tsx`, linha 189:

```tsx
// ANTES:
<Link href={registerHref} className="font-semibold text-primary hover:underline">
  Criar conta
</Link>

// DEPOIS:
<Link href={registerHref} className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80">
  Criar conta
</Link>
```

**Step 2: Fix register page link**

Em `src/app/(auth)/register/page.tsx`, linha 339:

```tsx
// ANTES:
<Link href={loginHref} className="font-medium text-primary hover:underline">
  Entrar
</Link>

// DEPOIS:
<Link href={loginHref} className="font-medium text-primary underline underline-offset-4 hover:text-primary/80">
  Entrar
</Link>
```

**Step 3: Verify visually**

Abrir `/login` e `/register`. Verificar que os links tem underline permanente e a cor muda levemente no hover.

**Step 4: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx src/app/\(auth\)/register/page.tsx
git commit -m "fix(a11y): improve contrast on auth page links

Add permanent underline to compensate for insufficient color contrast
ratio (~2.6:1 vs required 4.5:1) on primary-colored links."
```

---

## Task 4: Fix logo alt text redundancy + password toggle touch target

**Files:**

- Modify: `src/components/layout/header.tsx:60-64`
- Modify: `src/app/(auth)/login/page.tsx:158-172`
- Modify: `src/app/(auth)/register/page.tsx:271-285,308-322`

**Context:** (a) Desktop header tem `alt="Half Trip"` + texto adjacente "Half Trip" — redundante para screen readers. Auth layout ja usa o pattern correto. (b) Botao toggle de senha usa `size="sm"` com icone `h-4 w-4`, pode nao atingir 44px de touch target minimo.

**Step 1: Fix logo in desktop header**

Em `src/components/layout/header.tsx`, linhas 60-64:

```tsx
// ANTES:
<Image
  src="/brand/icon.svg"
  width={28}
  height={28}
  alt="Half Trip"
  className="h-7 w-7 shrink-0"
  priority
/>

// DEPOIS:
<Image
  src="/brand/icon.svg"
  width={28}
  height={28}
  alt=""
  aria-hidden="true"
  className="h-7 w-7 shrink-0"
  priority
/>
```

**Step 2: Fix password toggle in login page**

Em `src/app/(auth)/login/page.tsx`, linhas 158-172:

```tsx
// ANTES:
<Button
  type="button"
  variant="ghost"
  size="sm"
  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
  onClick={() => setShowPassword(!showPassword)}
  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
  tabIndex={-1}
>
  {showPassword ? (
    <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
  ) : (
    <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
  )}
</Button>

// DEPOIS:
<Button
  type="button"
  variant="ghost"
  size="sm"
  className="absolute right-0 top-0 h-full min-w-[44px] px-3 hover:bg-transparent"
  onClick={() => setShowPassword(!showPassword)}
  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
  tabIndex={-1}
>
  {showPassword ? (
    <EyeOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
  ) : (
    <Eye className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
  )}
</Button>
```

**Step 3: Fix password toggles in register page**

Aplicar o mesmo pattern (adicionar `min-w-[44px]`, icones `h-5 w-5`) nos DOIS botoes de toggle de senha em `src/app/(auth)/register/page.tsx`:

- Linhas 271-285 (campo "Senha")
- Linhas 308-322 (campo "Confirmar senha")

**Step 4: Verify visually**

- Desktop: Verificar que logo nao e anunciado duas vezes por screen reader
- Login/Register: Verificar que botao de mostrar senha e facilmente tocavel em mobile

**Step 5: Commit**

```bash
git add src/components/layout/header.tsx src/app/\(auth\)/login/page.tsx src/app/\(auth\)/register/page.tsx
git commit -m "fix(a11y): fix logo alt redundancy and password toggle touch targets

- Remove redundant alt text from desktop header logo (text already present)
- Increase password toggle touch target to min 44px and icon to h-5 w-5"
```

---

## Task 5: Add touch feedback to trip cards

**Files:**

- Modify: `src/components/trips/trip-card.tsx:120`

**Context:** Trip cards tem hover states para desktop mas nenhum feedback visual ao toque em mobile. Usuarios nao sabem se o card foi "apertado".

**Step 1: Add active states to trip card**

Em `src/components/trips/trip-card.tsx`, linha 120:

```tsx
// ANTES:
<Card className="group relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0">

// DEPOIS:
<Card className="group relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:shadow-sm">
```

**Step 2: Verify on mobile viewport**

Abrir `/trips` em 375px, tocar em um card. Deve haver feedback visual sutil (leve reducao de escala).

**Step 3: Commit**

```bash
git add src/components/trips/trip-card.tsx
git commit -m "ui: add touch feedback to trip cards

Add active:scale-[0.98] for press feedback on mobile devices."
```

---

## Task 6: Add chevron indicators to collapsible cards

**Files:**

- Modify: `src/app/(app)/trip/[id]/trip-overview.tsx:7-18,400-413,489-501`

**Context:** Cards "Mais" e "Financas" na trip overview sao colapsaveis (tem `aria-expanded`) mas nao tem indicador visual. Usuarios podem nao perceber que podem expandir.

**Step 1: Add ChevronDown import**

Em `src/app/(app)/trip/[id]/trip-overview.tsx`, adicionar `ChevronDown` ao import de lucide-react (linha ~7-18):

```tsx
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown, // ADICIONAR
  DollarSign,
  Plus,
  Receipt,
  Scale,
  Users,
  Wallet,
} from 'lucide-react';
```

**Step 2: Add chevron to "Mais" card**

Em `src/app/(app)/trip/[id]/trip-overview.tsx`, linhas 408-413:

```tsx
// ANTES:
<CardHeader className="pb-3">
  <CardTitle className="text-base">Mais</CardTitle>
  <p className="mt-1 text-sm text-muted-foreground">
    Votações, recap e atividade recente
  </p>
</CardHeader>

// DEPOIS:
<CardHeader className="pb-3">
  <div className="flex items-start justify-between gap-2">
    <div className="min-w-0 flex-1">
      <CardTitle className="text-base">Mais</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        Votações, recap e atividade recente
      </p>
    </div>
    <ChevronDown
      className={`mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${isMoreOpen ? 'rotate-180' : ''}`}
      aria-hidden="true"
    />
  </div>
</CardHeader>
```

**Step 3: Add chevron to "Financas" card**

Em `src/app/(app)/trip/[id]/trip-overview.tsx`, linhas 496-501:

```tsx
// ANTES:
<CardHeader className="pb-3">
  <CardTitle className="text-base">Finanças</CardTitle>
  <p className="mt-1 text-sm text-muted-foreground">
    Saldo, despesas, pendências e orçamento
  </p>
</CardHeader>

// DEPOIS:
<CardHeader className="pb-3">
  <div className="flex items-start justify-between gap-2">
    <div className="min-w-0 flex-1">
      <CardTitle className="text-base">Finanças</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        Saldo, despesas, pendências e orçamento
      </p>
    </div>
    <ChevronDown
      className={`mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${isFinancesOpen ? 'rotate-180' : ''}`}
      aria-hidden="true"
    />
  </div>
</CardHeader>
```

**Step 4: Verify visually**

Abrir trip overview. Verificar chevrons apontando para baixo quando colapsado e girando 180 graus quando expandido. Animacao deve ser suave (200ms).

**Step 5: Commit**

```bash
git add src/app/\(app\)/trip/\[id\]/trip-overview.tsx
git commit -m "ui: add chevron indicators to collapsible cards

Add rotating chevron icons to 'Mais' and 'Finanças' cards so users
can visually identify that cards are expandable/collapsible."
```

---

## Task 7: Increase nav label size

**Files:**

- Modify: `src/components/layout/mobile-nav.tsx:109`

**Context:** Labels da navegacao inferior usam `text-[9px]` (9 pixels) — extremamente pequeno, dificil de ler. WCAG 1.4.4 recomenda minimo ~14px para texto funcional, mas labels de nav sao tipicamente 10-11px em apps nativos.

**Step 1: Increase label size**

Em `src/components/layout/mobile-nav.tsx`, buscar por `text-[9px]`:

```tsx
// ANTES:
<span className={cn('text-[9px] font-medium leading-tight', active && 'text-primary')}>

// DEPOIS:
<span className={cn('text-[11px] font-medium leading-tight', active && 'text-primary')}>
```

**Step 2: Verify visually**

Abrir app em 375px. Labels da bottom nav devem ser legiveis sem esforco.

**Step 3: Commit**

```bash
git add src/components/layout/mobile-nav.tsx
git commit -m "ui: increase mobile nav label size from 9px to 11px

Improve readability of bottom navigation labels on small screens."
```

---

## Task 8: Add breadcrumb to mobile header

**Files:**

- Modify: `src/components/layout/mobile-header.tsx:47-48,84-95`

**Context:** Usuarios em subpaginas de trip (`/trip/[id]/expenses`, `/trip/[id]/balance`) nao sabem que estao dentro de uma viagem especifica. Adicionar breadcrumb compacto acima do titulo mostra a hierarquia.

**Step 1: Detect subpages in mobile header**

Em `src/components/layout/mobile-header.tsx`, apos linha 48 (`const isTripPage = !!tripMatch;`), adicionar logica para detectar subpaginas:

```tsx
const tripMatch = pathname.match(/^\/trip\/([^/]+)/);
const isTripPage = !!tripMatch;
const isTripSubpage = isTripPage && pathname.split('/').length > 3; // /trip/[id]/something
const isSettingsPage = pathname.startsWith('/settings');
```

**Step 2: Add breadcrumb to header JSX**

Em `src/components/layout/mobile-header.tsx`, linhas 84-95, trocar o bloco de titulo:

```tsx
// ANTES:
<div className="flex min-w-0 flex-1 items-center gap-2">
  {backHref ? (
    <Link
      href={backHref}
      className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform active:scale-[0.96]"
      aria-label="Voltar"
    >
      <ChevronLeft className="h-5 w-5" />
    </Link>
  ) : null}
  <span className="truncate text-base font-semibold">{title}</span>
</div>

// DEPOIS:
<div className="flex min-w-0 flex-1 items-center gap-2">
  {backHref ? (
    <Link
      href={backHref}
      className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform active:scale-[0.96]"
      aria-label="Voltar"
    >
      <ChevronLeft className="h-5 w-5" />
    </Link>
  ) : null}
  <div className="min-w-0 flex-1">
    {isTripSubpage && storeTripName && (
      <span className="block truncate text-[10px] leading-tight text-muted-foreground">
        {storeTripName}
      </span>
    )}
    <span className="truncate text-base font-semibold">{title}</span>
  </div>
</div>
```

Nota: O breadcrumb mostra apenas o nome da viagem acima do titulo da subpagina. Nao aparece na overview da trip (`/trip/[id]`) nem na lista de viagens (`/trips`).

**Step 3: Adjust title for subpages**

O titulo atual da trip overview mostra `storeTripName` (o nome da viagem). Nas subpaginas, o breadcrumb ja mostra o nome da viagem, entao o titulo precisa mudar para o nome da subpagina. Verificar a funcao `getTitle()`:

```tsx
const getTitle = () => {
  if (isTripPage && storeTripName) return storeTripName;
  // ...
};
```

Essa funcao retorna o nome da viagem para TODAS as paginas de trip. Precisamos mudar para subpaginas mostrarem o titulo da secao. Verificar o que o `title` tag de cada pagina mostra e ajustar se necessario. Se a logica for complexa demais, manter o breadcrumb mostrando apenas o nome da viagem como contexto.

Abordagem simples: NAO mudar o getTitle. O breadcrumb fica como "nome da viagem" acima do titulo "nome da viagem" — na pratica, nas subpaginas, o mobile-header mostra o mesmo titulo, mas o breadcrumb adiciona contexto. A verdadeira melhoria seria que cada subpagina passasse seu titulo via algum mecanismo (context, metadata). Se a complexidade for alta, limitar o breadcrumb a apenas mostrar o nome da trip quando em subpaginas, sem mudar titulos.

**Step 4: Verify visually**

- Abrir `/trip/[id]/expenses` — deve mostrar nome da viagem em texto pequeno acima do titulo
- Abrir `/trip/[id]` (overview) — NAO deve mostrar breadcrumb
- Abrir `/trips` — NAO deve mostrar breadcrumb

**Step 5: Commit**

```bash
git add src/components/layout/mobile-header.tsx
git commit -m "ui: add breadcrumb context to mobile header on trip subpages

Show trip name above the title when navigating trip subpages
(expenses, balance, etc.) to maintain navigation context."
```

---

## Task 9: Refine smart hide threshold

**Files:**

- Modify: `src/hooks/use-scroll-direction.ts:18`

**Context:** O header esconde ao rolar para baixo (threshold=10px). O usuario quer smart hide: reaparece com o menor scroll para cima (padrao iOS). Implementar threshold assimetrico: 2px para mostrar, 10px para esconder.

**Step 1: Implement asymmetric threshold**

Em `src/hooks/use-scroll-direction.ts`, linhas 16-21:

```tsx
// ANTES:
const currentScrollY = window.scrollY;
const diff = currentScrollY - lastScrollY.current;

if (Math.abs(diff) > threshold) {
  setDirection(diff > 0 ? 'down' : 'up');
  lastScrollY.current = currentScrollY;
}

// DEPOIS:
const currentScrollY = window.scrollY;
const diff = currentScrollY - lastScrollY.current;

// Asymmetric: easy to show (2px up), harder to hide (threshold down)
const effectiveThreshold = diff < 0 ? 2 : threshold;

if (Math.abs(diff) > effectiveThreshold) {
  setDirection(diff > 0 ? 'down' : 'up');
  lastScrollY.current = currentScrollY;
}
```

**Step 2: Verify behavior**

No mobile, rolar pagina para baixo (header esconde). Fazer o menor scroll para cima — header deve reaparecer imediatamente.

**Step 3: Commit**

```bash
git add src/hooks/use-scroll-direction.ts
git commit -m "ui: refine smart hide with asymmetric scroll threshold

Header reappears on slightest upward scroll (2px) but requires 10px
downward scroll to hide, matching iOS/Material native behavior."
```

---

## Task 10: Quick fixes — viewport fit, toaster position, stats refinement

**Files:**

- Modify: `src/app/layout.tsx:51-58`
- Modify: `src/components/ui/sonner.tsx:17`
- Modify: `src/components/trips/trips-stats.tsx`

**Context:** Tres mudancas rapidas e independentes: (a) viewport-fit=cover para safe areas de teclado, (b) toaster no topo para nao conflitar com bottom nav, (c) stats na pagina de trips simplificado para 3 cards.

**Step 1: Add viewportFit to layout**

Em `src/app/layout.tsx`, linhas 51-58:

```tsx
// ANTES:
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#1E293B' },
  ],
};

// DEPOIS:
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#1E293B' },
  ],
};
```

**Step 2: Move toaster to top-center**

Em `src/components/ui/sonner.tsx`, adicionar prop `position`:

```tsx
// ANTES:
<Sonner
  theme={theme as ToasterProps['theme']}
  className="toaster group"
  icons={{

// DEPOIS:
<Sonner
  theme={theme as ToasterProps['theme']}
  className="toaster group"
  position="top-center"
  icons={{
```

**Step 3: Simplify TripsStats to 3 cards**

Em `src/components/trips/trips-stats.tsx`:

Remove a prop `totalDestinations` e o card "Destinos visitados". Ajustar grid para 3 colunas no mobile:

```tsx
// ANTES:
interface TripsStatsProps {
  totalTrips: number;
  upcomingTrips: number;
  completedTrips: number;
  totalDestinations: number;
}

// DEPOIS:
interface TripsStatsProps {
  totalTrips: number;
  upcomingTrips: number;
  completedTrips: number;
}
```

```tsx
// ANTES:
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <StatCard icon={MapPin} label="Total de viagens" value={totalTrips} />
  <StatCard icon={Calendar} label="Próximas viagens" value={upcomingTrips} />
  <StatCard icon={TrendingUp} label="Concluídas" value={completedTrips} />
  <StatCard icon={Receipt} label="Destinos visitados" value={totalDestinations} />
</div>

// DEPOIS:
<div className="grid grid-cols-3 gap-3">
  <StatCard icon={MapPin} label="Total" value={totalTrips} />
  <StatCard icon={Calendar} label="Próximas" value={upcomingTrips} />
  <StatCard icon={TrendingUp} label="Concluídas" value={completedTrips} />
</div>
```

Remover imports nao usados (`Receipt`).

**Step 4: Fix TripsStats usage in trips-list**

Em `src/app/(app)/trips/trips-list.tsx`, remover a prop `totalDestinations` do uso de TripsStats (buscar por `<TripsStats`):

```tsx
// ANTES:
<TripsStats
  totalTrips={totalTrips}
  upcomingTrips={upcomingTrips}
  completedTrips={completedTrips}
  totalDestinations={totalDestinations}
/>

// DEPOIS:
<TripsStats
  totalTrips={totalTrips}
  upcomingTrips={upcomingTrips}
  completedTrips={completedTrips}
/>
```

Remover tambem o calculo de `totalDestinations` (a variavel que conta `new Set()` de destinations).

**Step 5: Run lint and tests**

```bash
npm run lint
npm test
```

**Step 6: Commit**

```bash
git add src/app/layout.tsx src/components/ui/sonner.tsx src/components/trips/trips-stats.tsx src/app/\(app\)/trips/trips-list.tsx
git commit -m "ui: viewport-fit cover, top-center toaster, simplified trip stats

- Add viewportFit: cover for keyboard safe area support
- Move toast notifications to top-center (avoid bottom nav overlap)
- Simplify TripsStats to 3 cards in a 3-column grid"
```

---

## Task 11: Final verification

**Step 1: Run full test suite**

```bash
npm test
npm run lint
```

Todos os testes devem passar. Nenhum novo warning de lint.

**Step 2: Visual QA checklist (mobile 375px)**

- [ ] `/login` — link "Criar conta" com underline, toggle de senha tocavel
- [ ] `/register` — link "Entrar" com underline, toggles de senha tocaveis
- [ ] `/trips` — stats em 3 colunas, cards com feedback ao toque, padding bottom suficiente
- [ ] `/trip/[id]` — chevrons nos cards colapsaveis, sem breadcrumb
- [ ] `/trip/[id]/expenses` — breadcrumb com nome da viagem, padding bottom ok
- [ ] `/trip/[id]/balance` — breadcrumb, padding bottom ok
- [ ] Header: some ao rolar, reaparece imediatamente ao menor scroll para cima
- [ ] Toast: aparece no topo da tela
- [ ] Bottom nav: labels legiveis (11px), nenhum card bloqueado

**Step 3: Desktop QA (1280px)**

- [ ] Logo sem alt text redundante (DevTools > Accessibility tree)
- [ ] Toaster no topo nao interfere com layout
- [ ] Stats display mantido (3 cards em linha)

---

## Resumo de issues endereçadas

| Issue                    | Severidade | Task    |
| ------------------------ | ---------- | ------- |
| #2/#6/#17 Multiple h1    | Critico    | Task 1  |
| #5 Bottom nav intercepta | Critico    | Task 2  |
| #1 Contraste link auth   | Critico    | Task 3  |
| #20 Logo alt redundante  | Alto       | Task 4  |
| #4 Touch target senha    | Medio      | Task 4  |
| #7 Feedback tatil cards  | Alto       | Task 5  |
| #12 Chevron collapse     | Medio      | Task 6  |
| #21 Nav label size       | Medio      | Task 7  |
| #11 Breadcrumb           | Alto       | Task 8  |
| #10 Smart hide           | Alto       | Task 9  |
| #14 Viewport fit         | Alto       | Task 10 |
| #22 Toaster position     | Medio      | Task 10 |
| #8 Stats refinement      | Alto       | Task 10 |

**Issues ignoradas (ja resolvidas):** #15 inputMode, #16 category picker, #37 focus states, #27 reduced-motion

# Fase 3: Redesign Mobile-First — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Melhorar experiência mobile resolvendo conflitos de UI, otimizando touch targets, adicionando onboarding simples, e corrigindo problemas de performance.

**Architecture:** Modificações pontuais em componentes existentes. Novo componente de onboarding com localStorage. Sem mudanças estruturais.

**Tech Stack:** React 19, Tailwind CSS v4, shadcn/ui, Next.js Image, localStorage

---

### Task 1: Otimizar header em scroll (stacked headers)

**Files:**

- Modify: `src/components/layout/finances-tab-bar.tsx`

**Problema:** Páginas de finanças têm 96px de UI sticky (header 56px + tab bar 40px), reduzindo conteúdo visível em telas pequenas.

**Solução:** Esconder FinancesTabBar ao fazer scroll down, mostrar ao scroll up (padrão iOS).

```typescript
// Adicionar hook de scroll direction:
const [isVisible, setIsVisible] = useState(true);
const lastScrollY = useRef(0);

useEffect(() => {
  const handleScroll = () => {
    const currentScrollY = window.scrollY;
    setIsVisible(currentScrollY < lastScrollY.current || currentScrollY < 50);
    lastScrollY.current = currentScrollY;
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

Aplicar classe condicional:

```tsx
className={cn(
  'sticky top-14 z-40 border-b bg-background/95 backdrop-blur md:hidden transition-transform duration-200',
  !isVisible && '-translate-y-full'
)}
```

**Commit:**

```bash
git commit -m "feat: auto-hide finances tab bar on scroll down for more mobile content space"
```

---

### Task 2: Otimizar transitions de performance

**Files:**

- Modify: `src/components/ui/button.tsx` (linha 9)

**Problema:** `transition-all` força o browser a monitorar TODAS as propriedades CSS, aumentando custo de paint.

**Solução:** O button.tsx já usa `transition-colors transition-opacity` (verificado na exploração). Se encontrar `transition-all`, substituir por propriedades específicas.

Verificar e corrigir em outros componentes:

```bash
grep -rn "transition-all" src/components/ --include="*.tsx"
```

Para cada ocorrência, substituir por propriedades específicas:

- `transition-all` → `transition-colors` (se só cor muda)
- `transition-all` → `transition-opacity` (se só opacidade muda)
- `transition-all` → `transition-transform` (se só transform muda)
- Combinar: `transition-colors transition-opacity transition-transform`

**Commit:**

```bash
git commit -m "perf: replace transition-all with specific CSS transition properties"
```

---

### Task 3: Otimizar touch targets

**Files:**

- Modify: `src/components/ui/button.tsx` (variantes `sm` e `icon-sm`)

**Problema:** Variantes `sm` (`h-9` = 36px) e `icon-sm` (`size-9` = 36px) estão abaixo do alvo ideal de 44px para mobile.

**Solução:** Manter tamanho visual mas aumentar área tocável com padding negativo:

```tsx
// Para variante sm, adicionar min touch area no mobile:
sm: 'h-9 rounded-md px-3 text-sm min-h-[44px] md:min-h-0',
'icon-sm': 'size-9 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0',
```

Alternativa: Usar `::after` para expandir hit area sem afetar layout visual.

**Commit:**

```bash
git commit -m "fix: ensure minimum 44px touch targets on mobile for small buttons"
```

---

### Task 4: Onboarding simples — Welcome dialog

**Files:**

- Create: `src/components/onboarding/welcome-dialog.tsx`
- Modify: `src/app/(app)/trips/trips-list.tsx` (integrar welcome dialog)

**Implementação:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Plane, Users, Receipt } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'halftrip-welcome-seen';

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // Delay para não competir com loading da página
      const timer = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Bem-vindo ao Half Trip!
          </DialogTitle>
          <DialogDescription>
            Organize suas viagens em grupo de forma simples.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Plane className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium">Crie uma viagem</p>
              <p className="text-sm text-muted-foreground">
                Defina destino, datas e convide seus amigos.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium">Registre despesas</p>
              <p className="text-sm text-muted-foreground">
                Adicione gastos e divida automaticamente.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium">Acerte as contas</p>
              <p className="text-sm text-muted-foreground">
                Veja quem deve o quê e gere PIX QR Code.
              </p>
            </div>
          </div>
        </div>

        <Button onClick={handleClose} className="w-full">
          Começar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

**Integração em trips-list.tsx:**

```tsx
import { WelcomeDialog } from '@/components/onboarding/welcome-dialog';
// No return, após o JSX principal:
<WelcomeDialog />;
```

**Commit:**

```bash
git add src/components/onboarding/welcome-dialog.tsx
git commit -m "feat: add simple welcome dialog for first-time users"
```

---

### Task 5: Dicas contextuais

**Files:**

- Create: `src/components/onboarding/contextual-tip.tsx`

**Implementação simples:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContextualTipProps {
  tipId: string;
  children: React.ReactNode;
  className?: string;
}

export function ContextualTip({ tipId, children, className }: ContextualTipProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const seen = localStorage.getItem(`tip-${tipId}`);
    setDismissed(!!seen);
  }, [tipId]);

  const dismiss = () => {
    localStorage.setItem(`tip-${tipId}`, 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm ${className}`}
      role="status"
    >
      <span className="flex-1">{children}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={dismiss}
        aria-label="Fechar dica"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </Button>
    </div>
  );
}
```

**Uso:**

```tsx
<ContextualTip tipId="first-trip">
  Toque no botão abaixo para criar sua primeira viagem!
</ContextualTip>
```

**Commit:**

```bash
git add src/components/onboarding/contextual-tip.tsx
git commit -m "feat: add contextual tips component for guided first interactions"
```

---

### Task 6: Otimizações de performance

**6a — `<img>` → `<Image>` em receipt-preview.tsx:**

Arquivo: `src/components/receipts/receipt-preview.tsx` (linhas 142-144)

Contexto: Usa `<img>` com URL assinada do Supabase. Next.js Image precisa de `unoptimized` para URLs externas dinâmicas.

```tsx
// Antes:
// eslint-disable-next-line @next/next/no-img-element
<img src={signedUrl} alt="Recibo" ... />

// Depois:
import Image from 'next/image';
<Image src={signedUrl} alt="Recibo" fill unoptimized className="object-contain" />
```

**6b — Remover `router.refresh()` redundante em trip-overview.tsx:**

Arquivo: `src/app/(app)/trip/[id]/trip-overview.tsx` (linhas 71-73)

Verificar se há setTimeout com router.refresh() duplicado e simplificar.

**6c — Harmonizar idioma no flight-search-dialog.tsx:**

Arquivo: `src/components/activities/flight-search-dialog.tsx` (linhas 194-197)

```tsx
// Antes:
<DialogTitle>Add Flight</DialogTitle>
<DialogDescription>Search for a flight to automatically add it to your itinerary.</DialogDescription>

// Depois:
<DialogTitle>Adicionar Voo</DialogTitle>
<DialogDescription>Busque um voo para adicionar automaticamente ao seu roteiro.</DialogDescription>
```

**Commit:**

```bash
git commit -m "fix: optimize receipt images, remove redundant refresh, translate flight dialog to pt-BR"
```

---

### Task 7: Verificação final da Fase 3

```bash
npm test && npm run lint && npm run build
```

**Testes manuais mobile (375px viewport):**

1. Scroll em finanças → tab bar some ao descer, aparece ao subir
2. Botões pequenos → área tocável 44px+
3. Primeiro acesso → welcome dialog aparece
4. FAB e install prompt → não sobrepõem
5. Recibo → imagem carrega corretamente
6. Flight search → textos em português

**Commit:**

```bash
git commit -m "chore: phase 3 complete - mobile UX redesign verified"
```

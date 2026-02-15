# Rotas Visuais Diárias no Mapa — Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar polylines visuais conectando atividades do mesmo dia no mapa do roteiro, com chips de filtro por dia e setas de direção.

**Architecture:** O `TripActivityMap` já renderiza markers para atividades com coordenadas. Vamos adicionar `PolylineF` do `@react-google-maps/api` (já instalado) para conectar atividades por dia, na ordem de `sort_order`. Chips de filtro permitem ver um dia específico ou todos. Sem custo extra de API — apenas polylines locais.

**Tech Stack:** React 19, @react-google-maps/api (PolylineF), TypeScript, Tailwind CSS v4

---

## Task 1: Adicionar helpers de rota em `map-helpers.ts`

**Files:**

- Modify: [src/lib/utils/map-helpers.ts](src/lib/utils/map-helpers.ts)

**Step 1: Adicionar paleta de cores e `getDayColor`**

Adicionar no final do arquivo (antes de `darkModeMapStyles`):

```typescript
const DAY_COLORS = [
  '#0d9488', // teal-600
  '#4f46e5', // indigo-600
  '#d97706', // amber-600
  '#e11d48', // rose-600
  '#059669', // emerald-600
  '#7c3aed', // violet-600
  '#ea580c', // orange-600
  '#0284c7', // sky-600
];

export function getDayColor(dayIndex: number): string {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}
```

**Step 2: Adicionar `groupActivitiesWithCoordsByDate`**

Adicionar logo após `getDayColor`:

```typescript
export function groupActivitiesWithCoordsByDate<
  T extends {
    coords: { lat: number; lng: number };
    date: string;
    sort_order: number;
    start_time: string | null;
  },
>(activities: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const activity of activities) {
    const existing = grouped.get(activity.date);
    if (existing) {
      existing.push(activity);
    } else {
      grouped.set(activity.date, [activity]);
    }
  }

  for (const [, dayActivities] of grouped) {
    dayActivities.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
      if (a.start_time) return -1;
      if (b.start_time) return 1;
      return 0;
    });
  }

  return grouped;
}
```

**Step 3: Verificar lint**

Run: `npm run lint -- --no-warn-ignored`
Expected: Sem erros em `map-helpers.ts`

**Step 4: Commit**

```bash
git add src/lib/utils/map-helpers.ts
git commit -m "feat(maps): add day color palette and groupActivitiesWithCoordsByDate helper"
```

---

## Task 2: Expandir props do `TripActivityMap` e adicionar state de filtro

**Files:**

- Modify: [src/components/maps/trip-activity-map.tsx](src/components/maps/trip-activity-map.tsx)

**Step 1: Atualizar imports**

Trocar a linha 4:

```typescript
// DE:
import { GoogleMap, MarkerF } from '@react-google-maps/api';
// PARA:
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
```

Atualizar o import de map-helpers (linhas 8-13):

```typescript
import {
  extractActivitiesWithCoords,
  getMapBounds,
  getMarkerColor,
  getDayColor,
  groupActivitiesWithCoordsByDate,
  darkModeMapStyles,
} from '@/lib/utils/map-helpers';
```

Adicionar import de `useMemo`:

```typescript
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
```

**Step 2: Expandir interface `TripActivityMapProps`**

Adicionar `date`, `sort_order` na interface de activity, e `tripDays` como prop:

```typescript
interface TripActivityMapProps {
  activities: {
    id: string;
    title: string;
    category: ActivityCategory;
    location: string | null;
    start_time: string | null;
    date: string;
    sort_order: number;
    metadata: unknown;
    [key: string]: unknown;
  }[];
  tripDays?: string[];
  onActivitySelect?: (activity: {
    id: string;
    title: string;
    category: ActivityCategory;
    location: string | null;
    start_time: string | null;
    date: string;
    sort_order: number;
    metadata: unknown;
    [key: string]: unknown;
  }) => void;
  className?: string;
}
```

**Step 3: Adicionar state e memos para rotas**

Dentro da função do componente, após `const mapRef = ...`:

```typescript
const [selectedDay, setSelectedDay] = useState<string | 'all'>('all');

// Agrupar atividades por dia
const activitiesByDay = useMemo(
  () => groupActivitiesWithCoordsByDate(activitiesWithCoords),
  [activitiesWithCoords]
);

// Dias disponíveis no mapa (com pelo menos 1 atividade com coords)
const availableDays = useMemo(() => {
  const days = Array.from(activitiesByDay.keys()).sort();
  return days;
}, [activitiesByDay]);

// Atividades filtradas por dia selecionado
const filteredActivities = useMemo(() => {
  if (selectedDay === 'all') return activitiesWithCoords;
  return activitiesByDay.get(selectedDay) || [];
}, [selectedDay, activitiesWithCoords, activitiesByDay]);

// Dias visíveis para polylines
const visibleDays = useMemo(() => {
  if (selectedDay === 'all') return availableDays;
  return availableDays.filter((d) => d === selectedDay);
}, [selectedDay, availableDays]);
```

**Step 4: Atualizar fitBounds para usar `filteredActivities` e reagir a `selectedDay`**

Substituir o useEffect existente de fitBounds (linhas 56-75) por:

```typescript
useEffect(() => {
  if (!mapRef.current || filteredActivities.length === 0) return;

  const bounds = getMapBounds(filteredActivities);
  if (!bounds) return;

  if (filteredActivities.length === 1) {
    mapRef.current.setCenter({
      lat: filteredActivities[0].coords.lat,
      lng: filteredActivities[0].coords.lng,
    });
    mapRef.current.setZoom(15);
  } else {
    const gBounds = new google.maps.LatLngBounds(
      { lat: bounds.south, lng: bounds.west },
      { lat: bounds.north, lng: bounds.east }
    );
    mapRef.current.fitBounds(gBounds, 50);
  }
}, [filteredActivities]);
```

**Step 5: Verificar lint**

Run: `npm run lint -- --no-warn-ignored`
Expected: Sem erros

**Step 6: Commit**

```bash
git add src/components/maps/trip-activity-map.tsx
git commit -m "feat(maps): add route state, day grouping, and filtered bounds to TripActivityMap"
```

---

## Task 3: Renderizar polylines e day chips no mapa

**Files:**

- Modify: [src/components/maps/trip-activity-map.tsx](src/components/maps/trip-activity-map.tsx)

**Step 1: Adicionar import `format` e `parseISO`**

```typescript
import { format, parseISO } from 'date-fns';
```

**Step 2: Adicionar day chips UI acima do `<GoogleMap>`**

No return do componente, dentro de `<div className="space-y-2">`, ANTES do `<GoogleMap>`, adicionar:

```tsx
{
  availableDays.length > 1 && (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtro por dia">
      <button
        type="button"
        role="tab"
        aria-selected={selectedDay === 'all'}
        className={cn(
          'inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
          selectedDay === 'all'
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background text-muted-foreground hover:bg-muted'
        )}
        onClick={() => setSelectedDay('all')}
      >
        Todos
      </button>
      {availableDays.map((date, index) => {
        const dayNumber = tripDays ? tripDays.indexOf(date) + 1 : index + 1;
        const color = getDayColor(index);
        return (
          <button
            key={date}
            type="button"
            role="tab"
            aria-selected={selectedDay === date}
            className={cn(
              'inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
              selectedDay === date
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted'
            )}
            onClick={() => setSelectedDay(date)}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            {dayNumber > 0 ? `Dia ${dayNumber}` : format(parseISO(date), 'dd/MM')}
          </button>
        );
      })}
    </div>
  );
}
```

**Step 3: Renderizar PolylineF dentro do `<GoogleMap>`**

Adicionar APÓS os `MarkerF` e ANTES do `{selectedActivity && ...}`:

```tsx
{
  visibleDays.map((date) => {
    const dayActivities = activitiesByDay.get(date);
    if (!dayActivities || dayActivities.length < 2) return null;
    const dayIndex = availableDays.indexOf(date);
    const color = getDayColor(dayIndex);
    const path = dayActivities.map((a) => ({ lat: a.coords.lat, lng: a.coords.lng }));
    return (
      <PolylineF
        key={`route-${date}`}
        path={path}
        options={{
          strokeColor: color,
          strokeOpacity: 0.8,
          strokeWeight: 3,
          geodesic: true,
          icons: [
            {
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 2.5,
                fillColor: color,
                fillOpacity: 0.7,
                strokeWeight: 0,
              },
              repeat: '80px',
            },
          ],
        }}
      />
    );
  });
}
```

**Step 4: Atualizar markers para usar `filteredActivities` em vez de `activitiesWithCoords`**

Trocar a iteração de markers (linha 146):

```typescript
// DE:
{activitiesWithCoords.map((activity) => (
// PARA:
{filteredActivities.map((activity) => (
```

**Step 5: Atualizar check de empty state e selectedActivity**

Trocar `selectedActivity` para buscar em `filteredActivities`:

```typescript
const selectedActivity = filteredActivities.find((a) => a.id === selectedId);
```

E o check de `activitiesWithCoords.length === 0` (linha 100) continua usando `activitiesWithCoords` (não `filteredActivities`), pois queremos mostrar o mapa se QUALQUER dia tem atividades.

**Step 6: Atualizar o banner de missing locations para usar contagem de `filteredActivities`**

O banner no final continua usando `activities.length > activitiesWithCoords.length` — sem mudança.

**Step 7: Verificar lint e build**

Run: `npm run lint -- --no-warn-ignored && npm run build`
Expected: Sem erros

**Step 8: Commit**

```bash
git add src/components/maps/trip-activity-map.tsx
git commit -m "feat(maps): render daily route polylines with arrow indicators and day filter chips"
```

---

## Task 4: Passar `tripDays` para o mapa em `itinerary-list.tsx`

**Files:**

- Modify: [src/app/(app)/trip/[id]/itinerary/itinerary-list.tsx](<src/app/(app)/trip/[id]/itinerary/itinerary-list.tsx>)

**Step 1: Adicionar `tripDays` à chamada do `TripActivityMap`**

Na linha 552, trocar:

```tsx
// DE:
<TripActivityMap
  activities={visibleActivities}
  onActivitySelect={(a) => handleActivityClick(a as ActivityWithCreator)}
  className="h-[calc(100vh-16rem)] min-h-[400px] md:h-[calc(100vh-20rem)]"
/>
// PARA:
<TripActivityMap
  activities={visibleActivities}
  tripDays={tripDays}
  onActivitySelect={(a) => handleActivityClick(a as ActivityWithCreator)}
  className="h-[calc(100vh-16rem)] min-h-[400px] md:h-[calc(100vh-20rem)]"
/>
```

`tripDays` já existe como variável computada na linha 116-120, é um `string[]` de datas `'yyyy-MM-dd'`.

**Step 2: Verificar lint e build**

Run: `npm run lint -- --no-warn-ignored && npm run build`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/app/(app)/trip/[id]/itinerary/itinerary-list.tsx
git commit -m "feat(maps): pass tripDays to TripActivityMap for day label numbering"
```

---

## Task 5: Teste manual e polish

**Step 1: Rodar o dev server**

Run: `npm run dev`

**Step 2: Teste manual completo**

Checklist de verificação:

1. Abrir uma viagem com atividades em **múltiplos dias** (com coordenadas)
2. Ir para **Roteiro → modo Mapa**
3. Verificar que **polylines conectam** atividades do mesmo dia
4. Verificar **setas de direção** nas linhas (pequenas flechas a cada ~80px)
5. Verificar **chips de dia** acima do mapa ("Todos | Dia 1 | Dia 2 | ...")
6. Clicar em **"Dia 1"** → mapa filtra e zoom ajusta para atividades do dia 1
7. Clicar em **"Todos"** → mapa volta a mostrar tudo
8. Verificar que **dias sem atividades com coords** não aparecem nos chips
9. Verificar que **dias com 1 atividade** mostram só o marker, sem polyline
10. Testar em **dark mode** — cores visíveis contra fundo escuro
11. Testar em **mobile** — chips scrollam horizontalmente
12. Clicar num **marker** → InfoWindow abre normalmente
13. Viagem com **0 atividades com coords** → empty state original funciona

**Step 3: Final build check**

Run: `npm run lint -- --no-warn-ignored && npm run build`
Expected: Sem erros

**Step 4: Commit final (se houver ajustes de polish)**

```bash
git add -A
git commit -m "chore(maps): polish daily route polylines and day filter"
```

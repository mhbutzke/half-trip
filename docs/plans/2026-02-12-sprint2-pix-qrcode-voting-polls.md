# Sprint 2: Pix QR Code + Voting/Polls - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the two highest-differentiation features: Pix QR Code generation for settlements (closes the financial loop) and voting/polls for group decisions (resolves the #1 pain point of group travel).

**Architecture:** Pix uses the EMV standard to generate static QR codes client-side (no bank API needed). Polls use two new DB tables (`trip_polls` + `poll_votes`) with realtime subscriptions for live vote updates. Both integrate into existing settlement and trip flows.

**Tech Stack:** `qrcode` npm package for Pix QR generation, Supabase (new tables + RLS + Realtime), existing shadcn/ui components, existing server action patterns.

---

## Task 1: Pix QR Code - Install Dependency & Utility

**Files:**

- Create: `src/lib/utils/pix.ts`
- Create: `src/lib/utils/pix.test.ts`

**Step 1: Install qrcode package**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm install qrcode && npm install -D @types/qrcode`

**Step 2: Write the failing test**

Create `src/lib/utils/pix.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generatePixPayload, isValidPixKey, PixKeyType, detectPixKeyType } from './pix';

describe('generatePixPayload', () => {
  it('should generate valid EMV payload for CPF key', () => {
    const payload = generatePixPayload({
      key: '12345678901',
      name: 'Maria Silva',
      city: 'Sao Paulo',
      amount: 150.5,
    });

    // EMV payloads start with '00' (Payload Format Indicator)
    expect(payload).toMatch(/^00/);
    // Must contain the Pix merchant account info (ID 26)
    expect(payload).toContain('0014br.gov.bcb.pix');
    // Must contain the amount
    expect(payload).toContain('150.50');
    // Must end with CRC16 (4 hex chars)
    expect(payload).toMatch(/[0-9A-F]{4}$/);
  });

  it('should generate valid payload without amount (open value)', () => {
    const payload = generatePixPayload({
      key: 'maria@email.com',
      name: 'Maria',
      city: 'SP',
    });

    expect(payload).toMatch(/^00/);
    expect(payload).toContain('0014br.gov.bcb.pix');
    // Should NOT contain ID 54 (amount) when no amount
    expect(payload).not.toMatch(/54\d{2}/);
  });

  it('should generate payload with transaction ID', () => {
    const payload = generatePixPayload({
      key: '+5511999999999',
      name: 'Joao',
      city: 'RJ',
      amount: 50,
      txId: 'HALFTRIP123',
    });

    expect(payload).toContain('HALFTRIP123');
  });
});

describe('isValidPixKey', () => {
  it('should validate CPF (11 digits)', () => {
    expect(isValidPixKey('12345678901')).toBe(true);
  });

  it('should validate CNPJ (14 digits)', () => {
    expect(isValidPixKey('12345678000190')).toBe(true);
  });

  it('should validate email', () => {
    expect(isValidPixKey('user@example.com')).toBe(true);
  });

  it('should validate phone with country code', () => {
    expect(isValidPixKey('+5511999999999')).toBe(true);
  });

  it('should validate random key (UUID format)', () => {
    expect(isValidPixKey('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('should reject empty string', () => {
    expect(isValidPixKey('')).toBe(false);
  });
});

describe('detectPixKeyType', () => {
  it('should detect CPF', () => {
    expect(detectPixKeyType('12345678901')).toBe('cpf');
  });

  it('should detect email', () => {
    expect(detectPixKeyType('user@test.com')).toBe('email');
  });

  it('should detect phone', () => {
    expect(detectPixKeyType('+5511999999999')).toBe('phone');
  });

  it('should detect random key', () => {
    expect(detectPixKeyType('123e4567-e89b-12d3-a456-426614174000')).toBe('random');
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx vitest run src/lib/utils/pix.test.ts`
Expected: FAIL - module not found.

**Step 4: Write the Pix EMV implementation**

Create `src/lib/utils/pix.ts`:

```typescript
/**
 * Pix EMV QR Code Payload Generator
 *
 * Follows the EMV QRCPS standard used by Banco Central do Brasil.
 * Reference: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II-ManualdePadroesparaIniciacaodoPix.pdf
 */

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

export interface PixPayloadInput {
  key: string;
  name: string;
  city: string;
  amount?: number;
  txId?: string;
}

/**
 * Generate a Pix EMV payload string for QR code generation.
 */
export function generatePixPayload(input: PixPayloadInput): string {
  const { key, name, city, amount, txId } = input;

  const fields: string[] = [];

  // ID 00 - Payload Format Indicator (mandatory, fixed "01")
  fields.push(tlv('00', '01'));

  // ID 26 - Merchant Account Information (Pix)
  const pixFields: string[] = [];
  pixFields.push(tlv('00', 'br.gov.bcb.pix')); // GUI
  pixFields.push(tlv('01', key)); // Chave Pix
  fields.push(tlv('26', pixFields.join('')));

  // ID 52 - Merchant Category Code (0000 = not informed)
  fields.push(tlv('52', '0000'));

  // ID 53 - Transaction Currency (986 = BRL)
  fields.push(tlv('53', '986'));

  // ID 54 - Transaction Amount (optional)
  if (amount !== undefined && amount > 0) {
    fields.push(tlv('54', amount.toFixed(2)));
  }

  // ID 58 - Country Code
  fields.push(tlv('58', 'BR'));

  // ID 59 - Merchant Name (max 25 chars)
  fields.push(tlv('59', sanitize(name, 25)));

  // ID 60 - Merchant City (max 15 chars)
  fields.push(tlv('60', sanitize(city, 15)));

  // ID 62 - Additional Data Field
  const additionalFields: string[] = [];
  additionalFields.push(tlv('05', txId || '***')); // Reference Label
  fields.push(tlv('62', additionalFields.join('')));

  // ID 63 - CRC16 (computed over the entire payload including "6304")
  const payloadWithoutCrc = fields.join('') + '6304';
  const crc = computeCRC16(payloadWithoutCrc);
  fields.push(tlv('63', crc));

  return fields.join('');
}

/**
 * Check if a string is a plausible Pix key.
 */
export function isValidPixKey(key: string): boolean {
  if (!key || key.trim().length === 0) return false;
  return detectPixKeyType(key) !== null;
}

/**
 * Detect the type of Pix key.
 */
export function detectPixKeyType(key: string): PixKeyType | null {
  const trimmed = key.trim();
  if (!trimmed) return null;

  // CPF: exactly 11 digits
  if (/^\d{11}$/.test(trimmed)) return 'cpf';

  // CNPJ: exactly 14 digits
  if (/^\d{14}$/.test(trimmed)) return 'cnpj';

  // Phone: starts with +55 followed by 10-11 digits
  if (/^\+55\d{10,11}$/.test(trimmed)) return 'phone';

  // Email: contains @
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';

  // Random key (EVP): UUID-like pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed))
    return 'random';

  return null;
}

// --- Internal helpers ---

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function sanitize(str: string, maxLen: number): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9 ]/g, '') // Keep only alphanumeric + spaces
    .substring(0, maxLen)
    .trim();
}

/**
 * CRC-16/CCITT-FALSE as required by EMV standard.
 */
function computeCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
```

**Step 5: Run tests to verify they pass**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx vitest run src/lib/utils/pix.test.ts`
Expected: All tests PASS.

**Step 6: Commit**

```bash
git add src/lib/utils/pix.ts src/lib/utils/pix.test.ts package.json package-lock.json
git commit -m "feat(pix): add Pix EMV payload generator with CRC16 and key validation"
```

---

## Task 2: Pix QR Code - Dialog Component

**Files:**

- Create: `src/components/settlements/pix-qr-dialog.tsx`

**Step 1: Create the Pix QR dialog**

Create `src/components/settlements/pix-qr-dialog.tsx`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { QrCode, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generatePixPayload, isValidPixKey, detectPixKeyType } from '@/lib/utils/pix';
import { formatCurrency } from '@/lib/utils/currency';

interface PixQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toUserName: string;
  amount: number;
  currency: string;
}

const pixKeyTypeLabels: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
  random: 'Chave aleatória',
};

export function PixQrDialog({
  open,
  onOpenChange,
  toUserName,
  amount,
  currency,
}: PixQrDialogProps) {
  const [pixKey, setPixKey] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isBrl = currency === 'BRL';

  const generateQr = useCallback(async () => {
    if (!isValidPixKey(pixKey)) {
      toast.error('Chave Pix inválida');
      return;
    }

    setIsGenerating(true);
    try {
      const pixPayload = generatePixPayload({
        key: pixKey.trim(),
        name: toUserName,
        city: 'Brasil',
        amount: isBrl ? amount : undefined, // Only include amount for BRL
        txId: `HT${Date.now().toString(36).toUpperCase()}`,
      });

      setPayload(pixPayload);

      const dataUrl = await QRCode.toDataURL(pixPayload, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(dataUrl);
    } catch {
      toast.error('Erro ao gerar QR Code');
    } finally {
      setIsGenerating(false);
    }
  }, [pixKey, toUserName, amount, isBrl]);

  const handleCopyPayload = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.success('Código Pix copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQrDataUrl(null);
      setPayload(null);
      setCopied(false);
    }
  }, [open]);

  const keyType = pixKey ? detectPixKeyType(pixKey) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" aria-hidden="true" />
            Pagar via Pix
          </DialogTitle>
          <DialogDescription>
            Gere um QR Code Pix para pagar{' '}
            <strong>{formatCurrency(amount, currency)}</strong> para{' '}
            <strong>{toUserName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!qrDataUrl ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="pix-key">Chave Pix de {toUserName}</Label>
                <Input
                  id="pix-key"
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  autoComplete="off"
                />
                {keyType && (
                  <p className="text-xs text-muted-foreground">
                    Tipo detectado: {pixKeyTypeLabels[keyType] || keyType}
                  </p>
                )}
              </div>

              {!isBrl && (
                <p className="text-xs text-amber-600">
                  Como a moeda base não é BRL, o QR Code será gerado sem valor fixo.
                  O pagador definirá o valor manualmente.
                </p>
              )}

              <Button
                onClick={generateQr}
                disabled={!pixKey.trim() || isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Gerando...' : 'Gerar QR Code'}
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-lg border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`QR Code Pix para ${toUserName}`}
                  width={280}
                  height={280}
                />
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Escaneie o QR Code com o app do seu banco
              </p>

              <div className="flex w-full gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyPayload}
                  className="flex-1"
                >
                  {copied ? (
                    <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {copied ? 'Copiado!' : 'Copiar código'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setQrDataUrl(null);
                    setPayload(null);
                  }}
                >
                  Nova chave
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Run type check**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/settlements/pix-qr-dialog.tsx
git commit -m "feat(pix): add Pix QR Code dialog component"
```

---

## Task 3: Pix QR Code - Integrate Into Settlement Flow

**Files:**

- Modify: `src/components/settlements/mark-settled-dialog.tsx`
- Modify: `src/components/summary/trip-summary.tsx`
- Modify: `src/components/balance/settlements-list.tsx`

**Step 1: Add "Pagar via Pix" button to MarkSettledDialog**

In `src/components/settlements/mark-settled-dialog.tsx`, add the Pix dialog alongside the existing "Marcar como pago" button:

Import:

```typescript
import { PixQrDialog } from './pix-qr-dialog';
```

Add state:

```typescript
const [pixDialogOpen, setPixDialogOpen] = useState(false);
```

Add a "Pagar via Pix" button BEFORE the existing "Marcar como pago" action in the `AlertDialogFooter`. This should be a secondary action (variant="outline"):

```tsx
<Button
  variant="outline"
  onClick={() => {
    onOpenChange(false);
    setPixDialogOpen(true);
  }}
>
  <QrCode className="mr-2 h-4 w-4" aria-hidden="true" />
  Pagar via Pix
</Button>
```

And render the PixQrDialog outside the AlertDialog:

```tsx
<PixQrDialog
  open={pixDialogOpen}
  onOpenChange={setPixDialogOpen}
  toUserName={toUserName}
  amount={amount}
  currency="BRL"
/>
```

**Step 2: Add "Pix" button to suggested settlements in trip-summary.tsx**

In `src/components/summary/trip-summary.tsx`, alongside the existing "Marcar pago" button (around line 177-183), add a Pix button:

Import `PixQrDialog` and add state for which settlement's Pix dialog is open:

```typescript
import { PixQrDialog } from '@/components/settlements/pix-qr-dialog';

const [pixSettlement, setPixSettlement] = useState<Settlement | null>(null);
```

Add a Pix icon button next to "Marcar pago":

```tsx
<Button
  size="sm"
  variant="ghost"
  onClick={() => setPixSettlement(settlement)}
  aria-label="Pagar via Pix"
>
  <QrCode className="h-4 w-4" aria-hidden="true" />
</Button>
```

And render the dialog:

```tsx
{
  pixSettlement && (
    <PixQrDialog
      open={!!pixSettlement}
      onOpenChange={(open) => !open && setPixSettlement(null)}
      toUserName={pixSettlement.to.userName}
      amount={pixSettlement.amount}
      currency={summary.baseCurrency || 'BRL'}
    />
  );
}
```

**Step 3: Run the app and test**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm run dev`
Test: Go to a trip with expenses → Balance section → Click "Pix" on a suggested settlement → Enter a valid Pix key → QR Code should render.

**Step 4: Commit**

```bash
git add src/components/settlements/ src/components/summary/trip-summary.tsx src/components/balance/
git commit -m "feat(pix): integrate Pix QR Code into settlement flow"
```

---

## Task 4: Voting/Polls - Database Migration

**Files:**

- Modify: `src/types/database.ts`

**Step 1: Apply Supabase migration for polls tables**

```sql
-- Create polls table
CREATE TABLE public.trip_polls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  allow_multiple boolean DEFAULT false,
  closes_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create votes table
CREATE TABLE public.poll_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES public.trip_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  option_index int NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(poll_id, user_id, option_index)
);

-- Indexes
CREATE INDEX idx_trip_polls_trip ON public.trip_polls(trip_id, created_at DESC);
CREATE INDEX idx_poll_votes_poll ON public.poll_votes(poll_id);

-- RLS
ALTER TABLE public.trip_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can view polls"
  ON public.trip_polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_polls.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can create polls"
  ON public.trip_polls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_polls.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator or organizer can delete polls"
  ON public.trip_polls FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_polls.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'organizer'
    )
  );

CREATE POLICY "Trip members can view votes"
  ON public.poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_polls
      JOIN public.trip_members ON trip_members.trip_id = trip_polls.trip_id
      WHERE trip_polls.id = poll_votes.poll_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip members can vote"
  ON public.poll_votes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_polls
      JOIN public.trip_members ON trip_members.trip_id = trip_polls.trip_id
      WHERE trip_polls.id = poll_votes.poll_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove their own votes"
  ON public.poll_votes FOR DELETE
  USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
```

Migration name: `add_trip_polls_and_votes`

**Step 2: Add types to `src/types/database.ts`**

Add `trip_polls` and `poll_votes` table definitions and convenience types, following the exact same Row/Insert/Update/Relationships pattern.

**Step 3: Create feature types file**

Create `src/types/poll.ts`:

```typescript
import type { Tables } from './database';

export type TripPoll = Tables<'trip_polls'>;
export type PollVote = Tables<'poll_votes'>;

export interface PollOption {
  text: string;
}

export interface PollWithVotes extends TripPoll {
  options: PollOption[];
  votes: PollVote[];
  users: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  voteCounts: number[];
  totalVotes: number;
  userVotes: number[];
  isClosed: boolean;
}

export interface CreatePollInput {
  trip_id: string;
  question: string;
  options: string[];
  allow_multiple?: boolean;
  closes_at?: string;
}
```

**Step 4: Commit**

```bash
git add src/types/database.ts src/types/poll.ts
git commit -m "feat(polls): add poll tables and types"
```

---

## Task 5: Voting/Polls - Server Actions

**Files:**

- Create: `src/lib/supabase/polls.ts`
- Create: `src/lib/validation/poll-schemas.ts`

**Step 1: Create validation schemas**

Create `src/lib/validation/poll-schemas.ts`:

```typescript
import { z } from 'zod';

export const createPollSchema = z.object({
  trip_id: z.string().uuid('ID da viagem inválido'),
  question: z
    .string()
    .min(1, 'Pergunta é obrigatória')
    .min(3, 'Pergunta deve ter pelo menos 3 caracteres')
    .max(200, 'Pergunta deve ter no máximo 200 caracteres'),
  options: z
    .array(z.string().min(1, 'Opção não pode ser vazia').max(100))
    .min(2, 'Adicione pelo menos 2 opções')
    .max(10, 'Máximo de 10 opções'),
  allow_multiple: z.boolean().optional().default(false),
  closes_at: z.string().optional(),
});

export type CreatePollFormValues = z.infer<typeof createPollSchema>;
```

**Step 2: Create server actions**

Create `src/lib/supabase/polls.ts`:

```typescript
'use server';

import { createClient } from './server';
import { revalidatePath } from 'next/cache';
import { logActivity } from './activity-log';
import type { PollWithVotes, CreatePollInput } from '@/types/poll';

type PollResult = { error?: string; success?: boolean; pollId?: string };

export async function createPoll(input: CreatePollInput): Promise<PollResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Não autorizado' };

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', input.trip_id)
    .eq('user_id', user.id)
    .single();
  if (!member) return { error: 'Você não é membro desta viagem' };

  if (input.options.length < 2) return { error: 'Adicione pelo menos 2 opções' };

  const options = input.options.map((text) => ({ text }));

  const { data: poll, error } = await supabase
    .from('trip_polls')
    .insert({
      trip_id: input.trip_id,
      question: input.question,
      options: options as any,
      allow_multiple: input.allow_multiple ?? false,
      closes_at: input.closes_at || null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/trip/${input.trip_id}`);

  logActivity({
    tripId: input.trip_id,
    action: 'created',
    entityType: 'trip' as any,
    entityId: poll.id,
    metadata: { question: input.question },
  });

  return { success: true, pollId: poll.id };
}

export async function getTripPolls(tripId: string): Promise<PollWithVotes[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return [];

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single();
  if (!member) return [];

  const { data: polls } = await supabase
    .from('trip_polls')
    .select(
      `
      *,
      users!trip_polls_created_by_fkey (id, name, avatar_url),
      poll_votes (id, user_id, option_index, created_at)
    `
    )
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (!polls) return [];

  const now = new Date();

  return polls.map((poll: any) => {
    const options = (poll.options as { text: string }[]) || [];
    const votes = (poll.poll_votes || []) as any[];
    const voteCounts = options.map(
      (_: any, i: number) => votes.filter((v: any) => v.option_index === i).length
    );

    return {
      ...poll,
      options,
      votes,
      voteCounts,
      totalVotes: new Set(votes.map((v: any) => v.user_id)).size,
      userVotes: votes.filter((v: any) => v.user_id === user.id).map((v: any) => v.option_index),
      isClosed: poll.closes_at ? new Date(poll.closes_at) < now : false,
    };
  });
}

export async function votePoll(pollId: string, optionIndex: number): Promise<PollResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Não autorizado' };

  // Verify poll exists and user is trip member
  const { data: poll } = await supabase
    .from('trip_polls')
    .select('id, trip_id, options, allow_multiple, closes_at')
    .eq('id', pollId)
    .single();

  if (!poll) return { error: 'Votação não encontrada' };

  // Check if closed
  if (poll.closes_at && new Date(poll.closes_at) < new Date()) {
    return { error: 'Votação encerrada' };
  }

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', poll.trip_id)
    .eq('user_id', user.id)
    .single();
  if (!member) return { error: 'Você não é membro desta viagem' };

  const options = poll.options as { text: string }[];
  if (optionIndex < 0 || optionIndex >= options.length) {
    return { error: 'Opção inválida' };
  }

  // If single-choice, remove existing votes first
  if (!poll.allow_multiple) {
    await supabase.from('poll_votes').delete().eq('poll_id', pollId).eq('user_id', user.id);
  }

  // Check if already voted for this option
  const { data: existingVote } = await supabase
    .from('poll_votes')
    .select('id')
    .eq('poll_id', pollId)
    .eq('user_id', user.id)
    .eq('option_index', optionIndex)
    .single();

  if (existingVote) {
    // Toggle: remove vote
    await supabase.from('poll_votes').delete().eq('id', existingVote.id);
  } else {
    // Add vote
    const { error } = await supabase.from('poll_votes').insert({
      poll_id: pollId,
      user_id: user.id,
      option_index: optionIndex,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/trip/${poll.trip_id}`);
  return { success: true };
}

export async function deletePoll(pollId: string): Promise<PollResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Não autorizado' };

  const { error } = await supabase.from('trip_polls').delete().eq('id', pollId);

  if (error) return { error: error.message };
  return { success: true };
}
```

**Step 3: Run type check**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add src/lib/supabase/polls.ts src/lib/validation/poll-schemas.ts
git commit -m "feat(polls): add server actions and validation for trip polls"
```

---

## Task 6: Voting/Polls - UI Components

**Files:**

- Create: `src/components/polls/poll-card.tsx`
- Create: `src/components/polls/create-poll-dialog.tsx`

**Step 1: Create PollCard component**

Create `src/components/polls/poll-card.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, Trash2, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { votePoll, deletePoll } from '@/lib/supabase/polls';
import { toast } from 'sonner';
import type { PollWithVotes } from '@/types/poll';

interface PollCardProps {
  poll: PollWithVotes;
  currentUserId: string;
  isOrganizer: boolean;
  onUpdate: () => void;
}

export function PollCard({ poll, currentUserId, isOrganizer, onUpdate }: PollCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = poll.created_by === currentUserId || isOrganizer;
  const hasVoted = poll.userVotes.length > 0;
  const maxVotes = Math.max(...poll.voteCounts, 1);

  const handleVote = async (optionIndex: number) => {
    if (poll.isClosed) return;
    setIsVoting(true);
    try {
      const result = await votePoll(poll.id, optionIndex);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onUpdate();
    } finally {
      setIsVoting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deletePoll(poll.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Votação removida');
      onUpdate();
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={poll.users.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(poll.users.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{poll.question}</p>
              <p className="text-xs text-muted-foreground">
                {poll.users.name.split(' ')[0]} •{' '}
                {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {poll.isClosed && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                Encerrada
              </Badge>
            )}
            {poll.allow_multiple && (
              <Badge variant="outline" className="text-xs">Múltipla</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {poll.options.map((option, index) => {
          const count = poll.voteCounts[index] || 0;
          const percentage = poll.totalVotes > 0 ? (count / poll.totalVotes) * 100 : 0;
          const isUserVote = poll.userVotes.includes(index);
          const isWinning = count === maxVotes && count > 0;

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              disabled={isVoting || poll.isClosed}
              className={`relative w-full overflow-hidden rounded-lg border p-3 text-left transition-colors ${
                isUserVote
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              } ${poll.isClosed ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="relative z-10 flex items-center justify-between">
                <span className={`text-sm ${isWinning ? 'font-semibold' : ''}`}>
                  {option.text}
                </span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {count} voto{count !== 1 ? 's' : ''}
                </span>
              </div>
              {(hasVoted || poll.isClosed) && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all ${
                    isWinning ? 'bg-primary/15' : 'bg-muted/50'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}
            </button>
          );
        })}

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            <Users className="mr-1 inline h-3 w-3" aria-hidden="true" />
            {poll.totalVotes} participante{poll.totalVotes !== 1 ? 's' : ''} votaram
          </p>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create CreatePollDialog**

Create `src/components/polls/create-poll-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { ResponsiveFormContainer } from '@/components/ui/responsive-form-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createPoll } from '@/lib/supabase/polls';
import { createPollSchema, type CreatePollFormValues } from '@/lib/validation/poll-schemas';

interface CreatePollDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreatePollDialog({
  tripId,
  open,
  onOpenChange,
  onSuccess,
}: CreatePollDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreatePollFormValues>({
    resolver: zodResolver(createPollSchema),
    defaultValues: {
      trip_id: tripId,
      question: '',
      options: ['', ''],
      allow_multiple: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options' as any,
  });

  const onSubmit = async (data: CreatePollFormValues) => {
    const filteredOptions = data.options.filter((o) => o.trim().length > 0);
    if (filteredOptions.length < 2) {
      toast.error('Adicione pelo menos 2 opções');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createPoll({
        trip_id: tripId,
        question: data.question,
        options: filteredOptions,
        allow_multiple: data.allow_multiple,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Votação criada!');
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const options = form.watch('options');

  return (
    <ResponsiveFormContainer
      open={open}
      onOpenChange={onOpenChange}
      title="Nova votação"
      description="Crie uma enquete para o grupo decidir junto"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="question"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pergunta</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Jantar japonês ou italiano?"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Opções</Label>
            {options.map((_: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={`Opção ${index + 1}`}
                  {...form.register(`options.${index}`)}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const current = form.getValues('options');
                      form.setValue(
                        'options',
                        current.filter((_: any, i: number) => i !== index)
                      );
                    }}
                    aria-label="Remover opção"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const current = form.getValues('options');
                  form.setValue('options', [...current, '']);
                }}
              >
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                Adicionar opção
              </Button>
            )}
          </div>

          <FormField
            control={form.control}
            name="allow_multiple"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel className="text-sm">Permitir múltiplas respostas</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Cada pessoa pode votar em mais de uma opção
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Criando...' : 'Criar votação'}
          </Button>
        </form>
      </Form>
    </ResponsiveFormContainer>
  );
}
```

**Step 3: Run type check**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add src/components/polls/
git commit -m "feat(polls): add PollCard and CreatePollDialog components"
```

---

## Task 7: Voting/Polls - Wire Into Trip Page

**Files:**

- Modify: `src/app/(app)/trip/[id]/page.tsx` (or the trip dashboard)

**Step 1: Fetch polls in the server component**

Add to the trip overview page's `Promise.all`:

```typescript
import { getTripPolls } from '@/lib/supabase/polls';

// In the existing Promise.all:
const [trip, userRole, currentUser, dashboard, activityLog, polls] = await Promise.all([
  getTripById(id),
  getUserRoleInTrip(id),
  getUserProfile(),
  getDashboardData(id),
  getTripActivityLog(id, 10),
  getTripPolls(id),
]);
```

Pass `polls` to the client component.

**Step 2: Render polls section in the dashboard**

In the client content component, render polls between the stats and the activity feed:

```tsx
import { PollCard } from '@/components/polls/poll-card';
import { CreatePollDialog } from '@/components/polls/create-poll-dialog';

// State:
const [createPollOpen, setCreatePollOpen] = useState(false);

// Render:
{
  polls.length > 0 && (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Votações</h2>
        <Button variant="ghost" size="sm" onClick={() => setCreatePollOpen(true)}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          Nova
        </Button>
      </div>
      {polls.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          currentUserId={currentUserId}
          isOrganizer={isOrganizer}
          onUpdate={() => router.refresh()}
        />
      ))}
    </div>
  );
}

{
  polls.length === 0 && (
    <Button variant="outline" size="sm" onClick={() => setCreatePollOpen(true)} className="w-full">
      <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
      Criar votação
    </Button>
  );
}

<CreatePollDialog
  tripId={tripId}
  open={createPollOpen}
  onOpenChange={setCreatePollOpen}
  onSuccess={() => router.refresh()}
/>;
```

**Step 3: Add realtime subscription for polls**

In `src/hooks/use-trip-realtime.ts`, add:

```typescript
useRealtimeSubscription({
  table: 'poll_votes',
  onChange: () => {
    queryClient.invalidateQueries({ queryKey: ['polls', tripId] });
  },
});

useRealtimeSubscription({
  table: 'trip_polls',
  filter: `trip_id=eq.${tripId}`,
  onChange: () => {
    queryClient.invalidateQueries({ queryKey: ['polls', tripId] });
  },
});
```

**Step 4: Run the app and test**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm run dev`
Test: Create a poll, vote on options, see counts update. Open in another browser session to verify realtime.

**Step 5: Commit**

```bash
git add src/app/(app)/trip/ src/hooks/use-trip-realtime.ts
git commit -m "feat(polls): wire polls into trip dashboard with realtime vote updates"
```

---

## Task 8: Tests & Final Verification

**Step 1: Run full test suite**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm test`
Expected: All tests pass.

**Step 2: Run lint + type check**

Run: `cd /Users/mhbutzke/Documents/HalfTrip/half-trip && npm run lint && npx tsc --noEmit --pretty`
Expected: No errors.

**Step 3: Final commit if needed**

```bash
git add -A
git commit -m "chore: lint fixes for Sprint 2 features"
```

---

## Verification Checklist

- [ ] `qrcode` package installed, Pix EMV utility generates valid payloads
- [ ] Pix tests pass (CRC16, key validation, payload structure)
- [ ] PixQrDialog renders QR code from Pix key input
- [ ] "Pagar via Pix" button appears in settlement dialog and suggested settlements
- [ ] `trip_polls` and `poll_votes` tables exist with RLS
- [ ] Poll creation, voting, and deletion work via server actions
- [ ] PollCard shows live vote counts with progress bars
- [ ] Realtime updates when another user votes
- [ ] Toggle vote works (click again to remove vote)
- [ ] Single-choice polls replace previous vote
- [ ] Multiple-choice polls accumulate votes
- [ ] All existing tests still pass

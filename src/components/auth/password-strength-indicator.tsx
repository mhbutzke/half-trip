'use client';

import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordCriterion {
  label: string;
  met: boolean;
}

function evaluatePassword(password: string): {
  criteria: PasswordCriterion[];
  score: number;
  level: string;
} {
  const criteria: PasswordCriterion[] = [
    { label: 'Pelo menos 8 caracteres', met: password.length >= 8 },
    { label: 'Letra maiúscula', met: /[A-Z]/.test(password) },
    { label: 'Letra minúscula', met: /[a-z]/.test(password) },
    { label: 'Número', met: /[0-9]/.test(password) },
    { label: 'Caractere especial', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = criteria.filter((c) => c.met).length;

  let level: string;
  if (score <= 2) {
    level = 'Fraca';
  } else if (score <= 3) {
    level = 'Média';
  } else if (score <= 4) {
    level = 'Boa';
  } else {
    level = 'Forte';
  }

  return { criteria, score, level };
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { criteria, score, level } = useMemo(() => evaluatePassword(password), [password]);

  if (!password) return null;

  const percentage = (score / criteria.length) * 100;

  return (
    <div className="space-y-2 pt-1" role="status" aria-label={`Força da senha: ${level}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Força da senha</span>
        <span
          className={cn(
            'font-medium',
            score <= 2 && 'text-red-500',
            score === 3 && 'text-yellow-500',
            score === 4 && 'text-emerald-500',
            score === 5 && 'text-green-500'
          )}
        >
          {level}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            score <= 2 && 'bg-red-500',
            score === 3 && 'bg-yellow-500',
            score === 4 && 'bg-emerald-500',
            score === 5 && 'bg-green-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs" aria-label="Requisitos de senha">
        {criteria.map((criterion) => (
          <li key={criterion.label} className="flex items-center gap-1">
            {criterion.met ? (
              <Check className="h-3 w-3 shrink-0 text-green-500" aria-hidden="true" />
            ) : (
              <X className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden="true" />
            )}
            <span
              className={cn(
                'transition-colors',
                criterion.met ? 'text-foreground' : 'text-muted-foreground/70'
              )}
            >
              {criterion.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

'use client';

import { Hotel, UtensilsCrossed, Car, Ticket, ShoppingBag, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExpenseCategory } from '@/types/database';

export const categoryConfig: Record<
  ExpenseCategory,
  { icon: typeof Hotel; label: string; color: string }
> = {
  accommodation: {
    icon: Hotel,
    label: 'Hospedagem',
    color: 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20',
  },
  food: {
    icon: UtensilsCrossed,
    label: 'Alimentação',
    color: 'text-orange-500 bg-orange-500/10 hover:bg-orange-500/20',
  },
  transport: {
    icon: Car,
    label: 'Transporte',
    color: 'text-green-500 bg-green-500/10 hover:bg-green-500/20',
  },
  tickets: {
    icon: Ticket,
    label: 'Ingressos',
    color: 'text-purple-500 bg-purple-500/10 hover:bg-purple-500/20',
  },
  shopping: {
    icon: ShoppingBag,
    label: 'Compras',
    color: 'text-pink-500 bg-pink-500/10 hover:bg-pink-500/20',
  },
  other: {
    icon: MoreHorizontal,
    label: 'Outros',
    color: 'text-gray-500 bg-gray-500/10 hover:bg-gray-500/20',
  },
};

interface CategorySelectorProps {
  value: ExpenseCategory;
  onChange: (category: ExpenseCategory) => void;
  className?: string;
}

export function CategorySelector({ value, onChange, className }: CategorySelectorProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {(Object.entries(categoryConfig) as [ExpenseCategory, typeof categoryConfig[ExpenseCategory]][]).map(
        ([category, config]) => {
          const Icon = config.icon;
          const isSelected = value === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onChange(category)}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-muted/50 hover:bg-muted',
                config.color
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{config.label}</span>
            </button>
          );
        }
      )}
    </div>
  );
}

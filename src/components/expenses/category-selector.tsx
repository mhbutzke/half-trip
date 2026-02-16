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
    color:
      'text-category-accommodation bg-category-accommodation/10 hover:bg-category-accommodation/20',
  },
  food: {
    icon: UtensilsCrossed,
    label: 'Alimentação',
    color: 'text-category-food bg-category-food/10 hover:bg-category-food/20',
  },
  transport: {
    icon: Car,
    label: 'Transporte',
    color: 'text-category-transport bg-category-transport/10 hover:bg-category-transport/20',
  },
  tickets: {
    icon: Ticket,
    label: 'Ingressos',
    color: 'text-category-tickets bg-category-tickets/10 hover:bg-category-tickets/20',
  },
  shopping: {
    icon: ShoppingBag,
    label: 'Compras',
    color: 'text-category-shopping bg-category-shopping/10 hover:bg-category-shopping/20',
  },
  other: {
    icon: MoreHorizontal,
    label: 'Outros',
    color: 'text-category-other bg-category-other/10 hover:bg-category-other/20',
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
      {(
        Object.entries(categoryConfig) as [
          ExpenseCategory,
          (typeof categoryConfig)[ExpenseCategory],
        ][]
      ).map(([category, config]) => {
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
      })}
    </div>
  );
}

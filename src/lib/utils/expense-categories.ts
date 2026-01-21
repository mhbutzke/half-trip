import type { ExpenseCategory } from '@/types/database';
import {
  Home,
  Utensils,
  Car,
  Ticket,
  ShoppingBag,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';

export type ExpenseCategoryInfo = {
  value: ExpenseCategory;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
};

export const expenseCategoryMap: Record<ExpenseCategory, ExpenseCategoryInfo> = {
  accommodation: {
    value: 'accommodation',
    label: 'Hospedagem',
    icon: Home,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  food: {
    value: 'food',
    label: 'Alimentação',
    icon: Utensils,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  transport: {
    value: 'transport',
    label: 'Transporte',
    icon: Car,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  tickets: {
    value: 'tickets',
    label: 'Ingressos',
    icon: Ticket,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
  shopping: {
    value: 'shopping',
    label: 'Compras',
    icon: ShoppingBag,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  other: {
    value: 'other',
    label: 'Outros',
    icon: MoreHorizontal,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
};

export const expenseCategoryList: ExpenseCategoryInfo[] = Object.values(expenseCategoryMap);

export function getCategoryInfo(category: ExpenseCategory): ExpenseCategoryInfo {
  return expenseCategoryMap[category] || expenseCategoryMap.other;
}

export function getCategoryIcon(category: ExpenseCategory): LucideIcon {
  return getCategoryInfo(category).icon;
}

export function getCategoryLabel(category: ExpenseCategory): string {
  return getCategoryInfo(category).label;
}

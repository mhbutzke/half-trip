import {
  Backpack,
  CheckSquare,
  ShoppingCart,
  FileText,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import type { ChecklistCategory } from '@/types/checklist';

export type ChecklistCategoryInfo = {
  value: ChecklistCategory;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
};

export const checklistCategoryMap: Record<ChecklistCategory, ChecklistCategoryInfo> = {
  packing: {
    value: 'packing',
    label: 'Bagagem',
    icon: Backpack,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  todo: {
    value: 'todo',
    label: 'Tarefas',
    icon: CheckSquare,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  shopping: {
    value: 'shopping',
    label: 'Compras',
    icon: ShoppingCart,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  documents: {
    value: 'documents',
    label: 'Documentos',
    icon: FileText,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  other: {
    value: 'other',
    label: 'Outros',
    icon: MoreHorizontal,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
};

export function getChecklistCategoryInfo(category: ChecklistCategory): ChecklistCategoryInfo {
  return checklistCategoryMap[category] || checklistCategoryMap.other;
}

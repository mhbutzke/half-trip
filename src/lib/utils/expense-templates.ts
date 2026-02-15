import type { ExpenseCategory } from '@/types/database';

export interface ExpenseTemplate {
  id: string;
  description: string;
  category: ExpenseCategory;
  suggestedAmount?: number;
  emoji: string;
}

/**
 * Common expense templates for quick selection
 */
export const commonExpenseTemplates: ExpenseTemplate[] = [
  {
    id: 'breakfast',
    description: 'Café da manhã',
    category: 'food',
    emoji: '🥐',
  },
  {
    id: 'lunch',
    description: 'Almoço',
    category: 'food',
    emoji: '🍽️',
  },
  {
    id: 'dinner',
    description: 'Jantar',
    category: 'food',
    emoji: '🍴',
  },
  {
    id: 'uber',
    description: 'Uber',
    category: 'transport',
    emoji: '🚗',
  },
  {
    id: 'taxi',
    description: 'Táxi',
    category: 'transport',
    emoji: '🚕',
  },
  {
    id: 'gas',
    description: 'Combustível',
    category: 'transport',
    emoji: '⛽',
  },
  {
    id: 'parking',
    description: 'Estacionamento',
    category: 'transport',
    emoji: '🅿️',
  },
  {
    id: 'supermarket',
    description: 'Mercado',
    category: 'food',
    emoji: '🛒',
  },
  {
    id: 'snack',
    description: 'Lanche',
    category: 'food',
    emoji: '🍿',
  },
  {
    id: 'coffee',
    description: 'Café',
    category: 'food',
    emoji: '☕',
  },
];

/**
 * Get templates for a specific category
 */
export function getTemplatesByCategory(category: ExpenseCategory): ExpenseTemplate[] {
  return commonExpenseTemplates.filter((t) => t.category === category);
}

/**
 * Find template by ID
 */
export function getTemplateById(id: string): ExpenseTemplate | undefined {
  return commonExpenseTemplates.find((t) => t.id === id);
}

/**
 * Custom user templates (stored in localStorage)
 */
export class ExpenseTemplateManager {
  private static STORAGE_KEY = 'half-trip-expense-templates';

  static getUserTemplates(): ExpenseTemplate[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveTemplate(template: Omit<ExpenseTemplate, 'id'>): void {
    const templates = this.getUserTemplates();
    const newTemplate: ExpenseTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
    };
    templates.push(newTemplate);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
  }

  static deleteTemplate(id: string): void {
    const templates = this.getUserTemplates().filter((t) => t.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
  }

  static getAllTemplates(): ExpenseTemplate[] {
    return [...commonExpenseTemplates, ...this.getUserTemplates()];
  }
}

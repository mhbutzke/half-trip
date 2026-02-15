import type { ExpenseCategory } from '@/types/database';

/**
 * Smart Categories - Suggest category based on description
 * 
 * Uses keywords to automatically suggest the most appropriate category
 * for an expense based on its description.
 */

const categoryKeywords: Record<ExpenseCategory, string[]> = {
  accommodation: [
    'hotel',
    'hostel',
    'pousada',
    'airbnb',
    'aluguel',
    'hospedagem',
    'quarto',
    'resort',
    'estadia',
    'diária',
    'booking',
  ],
  food: [
    'restaurante',
    'lanche',
    'almoço',
    'jantar',
    'café',
    'padaria',
    'comida',
    'refeição',
    'mercado',
    'supermercado',
    'pizza',
    'hamburguer',
    'ifood',
    'delivery',
    'bar',
    'bebida',
    'açaí',
  ],
  transport: [
    'uber',
    '99',
    'taxi',
    'ônibus',
    'bus',
    'avião',
    'voo',
    'passagem',
    'transfer',
    'combustível',
    'gasolina',
    'estacionamento',
    'pedágio',
    'metrô',
    'trem',
    'carro',
    'aluguel de carro',
  ],
  tickets: [
    'ingresso',
    'ticket',
    'entrada',
    'museu',
    'parque',
    'show',
    'cinema',
    'teatro',
    'passeio',
    'tour',
    'guia',
  ],
  shopping: [
    'compra',
    'loja',
    'presente',
    'souvenir',
    'lembrança',
    'roupa',
    'shopping',
  ],
  other: [],
};

/**
 * Suggest a category based on the expense description
 * Returns the suggested category or null if no good match
 */
export function suggestCategory(description: string): ExpenseCategory | null {
  if (!description || description.trim().length < 2) {
    return null;
  }

  const normalized = description.toLowerCase().trim();

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (category === 'other') continue;

    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return category as ExpenseCategory;
      }
    }
  }

  return null;
}

/**
 * Get confidence score for a suggestion (0-100)
 * Higher score = more confident
 */
export function getCategorySuggestionConfidence(
  description: string,
  category: ExpenseCategory
): number {
  if (!description || description.trim().length < 2) {
    return 0;
  }

  const normalized = description.toLowerCase().trim();
  const keywords = categoryKeywords[category] || [];

  let matches = 0;
  let totalKeywordLength = 0;

  for (const keyword of keywords) {
    if (normalized.includes(keyword)) {
      matches++;
      totalKeywordLength += keyword.length;
    }
  }

  if (matches === 0) return 0;

  // Calculate confidence based on:
  // - Number of matching keywords
  // - Length of matching keywords relative to description
  const matchScore = (matches / keywords.length) * 100;
  const lengthScore = (totalKeywordLength / normalized.length) * 100;

  return Math.min(100, (matchScore + lengthScore) / 2);
}

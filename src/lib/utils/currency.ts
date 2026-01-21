/**
 * Currency formatting utilities
 */

/**
 * Formats a number as BRL currency
 */
export function formatCurrency(amount: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Formats a number as currency without the currency symbol (just the value)
 */
export function formatCurrencyValue(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parses a currency string to a number
 * Handles both comma and period as decimal separators
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and whitespace
  const cleaned = value.replace(/[R$\s]/g, '');

  // Replace comma with period for decimal
  const normalized = cleaned.replace(',', '.');

  return parseFloat(normalized) || 0;
}

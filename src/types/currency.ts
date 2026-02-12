export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP', 'ARS', 'CLP'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  BRL: 'Real (R$)',
  USD: 'Dólar (US$)',
  EUR: 'Euro (€)',
  GBP: 'Libra (£)',
  ARS: 'Peso Argentino (ARS)',
  CLP: 'Peso Chileno (CLP)',
};

export const DEFAULT_CURRENCY: SupportedCurrency = 'BRL';

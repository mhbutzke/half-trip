import { getCategoryLabel } from '@/lib/utils/expense-categories';
import type { ExpenseCategory } from '@/types/database';

export interface ExpenseExportRow {
  date: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  paid_by_name: string;
  notes: string | null;
}

export function generateExpensesCSV(expenses: ExpenseExportRow[]): string {
  const headers = ['Data', 'Descrição', 'Categoria', 'Valor', 'Moeda', 'Pago por', 'Observações'];

  const rows = expenses.map((e) => [
    e.date,
    e.description,
    getCategoryLabel(e.category),
    e.amount.toFixed(2).replace('.', ','),
    e.currency,
    e.paid_by_name,
    e.notes || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  // BOM for Excel UTF-8 compatibility
  return '\uFEFF' + csvContent;
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

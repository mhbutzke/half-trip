import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCategoryLabel } from '@/lib/utils/expense-categories';
import type { ExpenseExportRow } from './csv-expenses';

export interface PdfReportData {
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  expenses: ExpenseExportRow[];
  totalAmount: number;
  currency: string;
  participants: { name: string; paid: number; owes: number; balance: number }[];
}

function formatCurrencyPdf(amount: number): string {
  return `R$ ${amount.toFixed(2).replace('.', ',')}`;
}

function formatDatePdf(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function generateExpensePDF(data: PdfReportData): Blob {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Relatório de Despesas', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

  // Trip info
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Viagem: ${data.tripName}`, 14, 38);
  doc.text(`Destino: ${data.destination}`, 14, 45);
  doc.text(`Período: ${formatDatePdf(data.startDate)} - ${formatDatePdf(data.endDate)}`, 14, 52);
  doc.text(`Total: ${formatCurrencyPdf(data.totalAmount)}`, 14, 59);

  // Expenses table
  if (data.expenses.length > 0) {
    doc.setFontSize(14);
    doc.text('Despesas', 14, 72);

    autoTable(doc, {
      startY: 76,
      head: [['Data', 'Descrição', 'Categoria', 'Valor', 'Pago por']],
      body: data.expenses.map((e) => [
        formatDatePdf(e.date),
        e.description,
        getCategoryLabel(e.category),
        formatCurrencyPdf(e.amount),
        e.paid_by_name,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
  }

  // Participant summary
  if (data.participants.length > 0) {
    const finalY =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 80;
    const summaryY = finalY + 15;

    // Check if we need a new page
    if (summaryY > 250) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Resumo por Participante', 14, 20);

      autoTable(doc, {
        startY: 25,
        head: [['Participante', 'Pagou', 'Deve', 'Saldo']],
        body: data.participants.map((p) => [
          p.name,
          formatCurrencyPdf(p.paid),
          formatCurrencyPdf(p.owes),
          formatCurrencyPdf(p.balance),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129] },
      });
    } else {
      doc.setFontSize(14);
      doc.text('Resumo por Participante', 14, summaryY);

      autoTable(doc, {
        startY: summaryY + 5,
        head: [['Participante', 'Pagou', 'Deve', 'Saldo']],
        body: data.participants.map((p) => [
          p.name,
          formatCurrencyPdf(p.paid),
          formatCurrencyPdf(p.owes),
          formatCurrencyPdf(p.balance),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129] },
      });
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Half Trip - ${data.tripName}`, 14, 290);
    doc.text(`Página ${i} de ${pageCount}`, 180, 290);
  }

  return doc.output('blob');
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

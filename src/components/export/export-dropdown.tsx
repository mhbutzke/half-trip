'use client';

import { useState } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getTripExportData } from '@/lib/supabase/trip-export-data';
import { generateExpensePDF, downloadPDF } from '@/lib/export/pdf-expense-report';
import { generateExpensesCSV, downloadCSV } from '@/lib/export/csv-expenses';
import { toast } from 'sonner';

interface ExportDropdownProps {
  tripId: string;
  tripName: string;
}

export function ExportDropdown({ tripId, tripName }: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);

  const sanitizedName = tripName.replace(/[^a-zA-Z0-9\u00C0-\u017F\s-]/g, '').replace(/\s+/g, '-');

  async function handleExportPDF() {
    setIsExporting(true);
    try {
      const data = await getTripExportData(tripId);
      if (!data) {
        toast.error('Erro ao carregar dados para exportação');
        return;
      }
      if (data.expenses.length === 0) {
        toast.error('Nenhuma despesa para exportar');
        return;
      }
      const blob = generateExpensePDF(data);
      downloadPDF(blob, `despesas-${sanitizedName}.pdf`);
      toast.success('PDF gerado com sucesso');
    } catch {
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportCSV() {
    setIsExporting(true);
    try {
      const data = await getTripExportData(tripId);
      if (!data) {
        toast.error('Erro ao carregar dados para exportação');
        return;
      }
      if (data.expenses.length === 0) {
        toast.error('Nenhuma despesa para exportar');
        return;
      }
      const csv = generateExpensesCSV(data.expenses);
      downloadCSV(csv, `despesas-${sanitizedName}.csv`);
      toast.success('CSV gerado com sucesso');
    } catch {
      toast.error('Erro ao gerar CSV');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          {isExporting ? 'Exportando...' : 'Exportar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
          Relatório PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV}>
          <Table className="mr-2 h-4 w-4" aria-hidden="true" />
          Planilha CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

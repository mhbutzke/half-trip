'use client';

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import { getCategoryLabel, type TripRecapData } from '@/lib/utils/trip-recap';

interface TripRecapCardProps {
  recap: TripRecapData;
}

export function TripRecapCard({ recap }: TripRecapCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const formattedStart = new Date(recap.startDate + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
  const formattedEnd = new Date(recap.endDate + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const exportImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });

      // Try native share with file (mobile)
      if (navigator.share && typeof navigator.canShare === 'function') {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `recap-${recap.tripName}.png`, { type: 'image/png' });
          try {
            await navigator.share({
              title: `Trip Recap: ${recap.tripName}`,
              files: [file],
            });
          } catch {
            downloadCanvas(canvas);
          }
        }, 'image/png');
      } else {
        downloadCanvas(canvas);
      }
    } catch {
      toast.error('Erro ao exportar imagem');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCanvas = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `recap-${recap.tripName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Imagem salva!');
  };

  return (
    <div className="space-y-4">
      {/* The renderable card */}
      <div
        ref={cardRef}
        className="overflow-hidden rounded-2xl"
        style={{
          background: '#1E293B',
          padding: '32px',
          color: '#ffffff',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          width: '360px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <p
            style={{
              fontSize: '12px',
              opacity: 0.7,
              marginBottom: '4px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            Trip Recap
          </p>
          <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 4px', lineHeight: 1.2 }}>
            {recap.tripName}
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.8 }}>
            {recap.destination} &bull; {formattedStart} - {formattedEnd}
          </p>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <StatBlock
            label="Total gasto"
            value={formatCurrency(recap.totalSpent, recap.baseCurrency)}
          />
          <StatBlock label="Dias" value={String(recap.durationDays)} />
          <StatBlock label="Participantes" value={String(recap.participantCount)} />
          <StatBlock label="Despesas" value={String(recap.expenseCount)} />
          <StatBlock
            label="Por dia"
            value={formatCurrency(recap.averagePerDay, recap.baseCurrency)}
          />
          <StatBlock
            label="Por pessoa"
            value={formatCurrency(recap.averagePerPerson, recap.baseCurrency)}
          />
        </div>

        {/* Highlights */}
        <div
          style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>Destaques</p>
          <p style={{ fontSize: '14px', marginBottom: '4px' }}>
            Maior gasto: <strong>{getCategoryLabel(recap.topCategory)}</strong> (
            {formatCurrency(recap.topCategoryAmount, recap.baseCurrency)})
          </p>
          <p style={{ fontSize: '14px', marginBottom: '4px' }}>
            Quem mais pagou: <strong>{recap.biggestSpender}</strong> (
            {formatCurrency(recap.biggestSpenderAmount, recap.baseCurrency)})
          </p>
          {recap.activitiesCount > 0 && (
            <p style={{ fontSize: '14px' }}>
              {recap.activitiesCount} atividade{recap.activitiesCount !== 1 ? 's' : ''} no roteiro
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '11px' }}>halftrip.app</div>
      </div>

      {/* Export actions */}
      <div className="flex gap-2">
        <Button onClick={exportImage} disabled={isExporting} className="flex-1">
          {isExporting ? (
            'Exportando...'
          ) : (
            <>
              <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Compartilhar Recap
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: '11px', opacity: 0.6, marginBottom: '2px' }}>{label}</p>
      <p style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{value}</p>
    </div>
  );
}

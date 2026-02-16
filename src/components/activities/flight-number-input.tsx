'use client';

import { useState } from 'react';
import { Loader2, Search, Plane } from 'lucide-react';
import { format } from 'date-fns';
import { logError } from '@/lib/errors/logger';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { FlightData } from '@/types/database';

interface FlightNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  date: string;
  onFlightData: (data: FlightData | null) => void;
  flightData: FlightData | null;
  disabled?: boolean;
}

export function FlightNumberInput({
  value,
  onChange,
  date,
  onFlightData,
  flightData,
  disabled = false,
}: FlightNumberInputProps) {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!value || value.length < 2) {
      setError('Informe o número do voo (ex: LA3469)');
      return;
    }

    setSearching(true);
    setError(null);
    onFlightData(null);

    try {
      const supabase = createClient();
      const { data, error: fnError } = await supabase.functions.invoke('fetch-flight-data', {
        body: { flight_number: value, date: date || undefined },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao buscar voo');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.found === false) {
        setError('Voo não encontrado. Verifique o número e a data.');
      } else {
        onFlightData(data as FlightData);
      }
    } catch (err: unknown) {
      logError(err, { action: 'flight-number-search' });
      const message = err instanceof Error ? err.message : 'Erro ao buscar voo.';
      setError(message);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-2">
      <FormItem>
        <FormLabel>Número do voo</FormLabel>
        <div className="flex gap-2">
          <Input
            placeholder="LA3469"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (flightData) onFlightData(null);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled || searching}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSearch}
            disabled={disabled || searching || !value}
            aria-label="Buscar dados do voo"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        {error && <FormMessage>{error}</FormMessage>}
      </FormItem>

      {flightData && (
        <div className="rounded-lg border p-3 bg-muted/50 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>
              {flightData.carrier} {flightData.flight_number}
            </span>
            {flightData.status && (
              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                {flightData.status}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="text-center">
              <div className="text-lg font-bold">{flightData.departure.iata}</div>
              <div className="text-xs text-muted-foreground">
                {flightData.departure.scheduled
                  ? format(new Date(flightData.departure.scheduled), 'HH:mm')
                  : '--:--'}
              </div>
            </div>
            <div className="flex-1 px-3 flex flex-col items-center">
              <div className="h-[1px] bg-border w-full relative top-2" />
              <Plane
                className="h-3.5 w-3.5 rotate-90 relative bg-background px-0.5"
                aria-hidden="true"
              />
              {flightData.duration ? (
                <span className="text-xs text-muted-foreground mt-1">
                  {Math.floor(flightData.duration / 60)}h
                  {flightData.duration % 60 > 0 ? ` ${flightData.duration % 60}m` : ''}
                </span>
              ) : null}
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{flightData.arrival.iata}</div>
              <div className="text-xs text-muted-foreground">
                {flightData.arrival.scheduled
                  ? format(new Date(flightData.arrival.scheduled), 'HH:mm')
                  : '--:--'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

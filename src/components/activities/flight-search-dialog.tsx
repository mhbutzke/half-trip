'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Loader2, Plane, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { logError } from '@/lib/errors/logger';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { createActivity } from '@/lib/supabase/activities';
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { FlightData, Json } from '@/types/database';

const formSchema = z.object({
  flightNumber: z.string().min(2, {
    message: 'Número do voo obrigatório (ex: AA123)',
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Data deve ser AAAA-MM-DD',
  }),
});

interface FlightSearchDialogProps {
  tripId: string;
  defaultDate?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function FlightSearchDialog({
  tripId,
  defaultDate,
  trigger,
  open,
  onOpenChange,
  onSuccess,
}: FlightSearchDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      flightNumber: '',
      date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
    if (!newOpen) {
      form.reset();
      setFlightData(null);
      setError(null);
    }
  };

  const controlledOpen = open !== undefined ? open : isOpen;

  const onSearch = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError(null);
    setFlightData(null);

    try {
      const supabase = createClient();
      const { data, error: fnError } = await supabase.functions.invoke('fetch-flight-data', {
        body: { flight_number: values.flightNumber, date: values.date },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao chamar a função de busca de voo');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.found === false) {
        setError('Voo não encontrado. Verifique o número e a data.');
      } else {
        setFlightData(data as FlightData);
      }
    } catch (err: unknown) {
      logError(err, { action: 'flight-search' });
      const message = err instanceof Error ? err.message : 'Erro ao buscar informações do voo.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onAddFlight = async () => {
    if (!flightData) return;

    setLoading(true);
    try {
      // Create activity from flight data
      const departureTime = flightData.departure.scheduled
        ? new Date(flightData.departure.scheduled)
        : null;
      // Duration in minutes
      const duration = flightData.duration || 0;

      // Calculate Activity Title
      const title = `Voo ${flightData.carrier} ${flightData.flight_number}: ${flightData.departure.iata} → ${flightData.arrival.iata}`;

      const result = await createActivity({
        trip_id: tripId,
        title: title,
        date: form.getValues('date'),
        category: 'transport',
        start_time: departureTime ? format(departureTime, 'HH:mm') : undefined,
        duration_minutes: duration,
        description: `Voo de ${flightData.departure.airport} (${flightData.departure.iata}) para ${flightData.arrival.airport} (${flightData.arrival.iata}).`,
        location: `${flightData.departure.airport}`,
        metadata: flightData as Json,
      });

      if (result.error) {
        toast.error('Erro ao adicionar voo', { description: result.error });
      } else {
        toast.success('Voo adicionado ao roteiro');
        handleOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch {
      toast.error('Erro ao criar atividade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={controlledOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Buscar voo</DialogTitle>
          <DialogDescription>
            Busque um voo para adicioná-lo automaticamente ao roteiro.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSearch)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="flightNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do voo</FormLabel>
                    <FormControl>
                      <Input placeholder="AA100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!flightData && (
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plane className="mr-2 h-4 w-4" />
                )}
                Buscar voo
              </Button>
            )}
          </form>
        </Form>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {flightData && (
          <div className="rounded-lg border p-4 bg-muted/50 space-y-3">
            <div className="font-semibold text-lg flex items-center justify-between">
              <span>
                {flightData.carrier} {flightData.flight_number}
              </span>
              <span className="text-sm px-2 py-1 rounded bg-primary/10 text-primary">
                {flightData.status}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">{flightData.departure.iata}</div>
                <div className="text-muted-foreground">
                  {flightData.departure.scheduled
                    ? format(new Date(flightData.departure.scheduled), 'HH:mm')
                    : '--:--'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Terminal: {flightData.departure.terminal || '-'} Portão:{' '}
                  {flightData.departure.gate || '-'}
                </div>
              </div>
              <div className="flex-1 px-4 text-center">
                <div className="h-[1px] bg-border w-full relative top-3"></div>
                <Plane className="h-4 w-4 mx-auto rotate-90 relative bg-background px-1" />
                <div className="text-xs text-muted-foreground mt-2">
                  {flightData.duration
                    ? `${Math.floor(flightData.duration / 60)}h ${flightData.duration % 60}m`
                    : ''}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{flightData.arrival.iata}</div>
                <div className="text-muted-foreground">
                  {flightData.arrival.scheduled
                    ? format(new Date(flightData.arrival.scheduled), 'HH:mm')
                    : '--:--'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Terminal: {flightData.arrival.terminal || '-'} Portão:{' '}
                  {flightData.arrival.gate || '-'}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-between gap-2">
          {flightData && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setFlightData(null);
                  form.reset();
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button onClick={onAddFlight} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Adicionar ao roteiro'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

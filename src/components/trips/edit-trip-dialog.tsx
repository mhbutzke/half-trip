'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTripSchema, tripStyles, transportTypes } from '@/lib/validation/trip-schemas';
import { updateTrip } from '@/lib/supabase/trips';
import { LocationAutocomplete } from '@/components/activities/location-autocomplete';
import type { TripWithMembers } from '@/lib/supabase/trips';
import { SUPPORTED_CURRENCIES, CURRENCY_LABELS, type SupportedCurrency } from '@/types/currency';
import type { TransportType } from '@/types/database';
import { uploadTripCover } from '@/lib/supabase/storage';
import { resizeImage } from '@/lib/utils/image';
import { buildTripUpdatePayload } from './edit-trip-dialog.utils';

interface EditTripDialogProps {
  trip: TripWithMembers | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditTripDialog({ trip, open, onOpenChange, onSuccess }: EditTripDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  type CreateTripFormInput = z.input<typeof createTripSchema>;
  type CreateTripFormOutput = z.output<typeof createTripSchema>;

  const form = useForm<CreateTripFormInput, unknown, CreateTripFormOutput>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      name: '',
      destination: '',
      start_date: '',
      end_date: '',
      description: '',
      style: null,
      base_currency: 'BRL',
      transport_type: 'plane',
    },
  });

  // Reset form when trip changes
  useEffect(() => {
    if (trip) {
      form.reset({
        name: trip.name,
        destination: trip.destination,
        start_date: trip.start_date,
        end_date: trip.end_date,
        description: trip.description || '',
        style: trip.style,
        base_currency: (trip.base_currency as SupportedCurrency) || 'BRL',
        transport_type: (trip.transport_type as TransportType) || 'plane',
      });
      setCoverPreview(trip.cover_url || null);
    }
  }, [trip, form]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !trip) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const resized = await resizeImage(file);
      const formData = new FormData();
      formData.append('file', resized, 'cover.jpg');

      const result = await uploadTripCover(trip.id, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setCoverPreview(result.url || null);
      toast.success('Capa atualizada!');
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: CreateTripFormOutput) => {
    if (!trip) return;

    setIsSubmitting(true);

    try {
      const updatePayload = buildTripUpdatePayload(trip, data);

      if (Object.keys(updatePayload).length === 0) {
        toast.info('Nenhuma alteração para salvar');
        return;
      }

      const result = await updateTrip(trip.id, updatePayload);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Viagem atualizada com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error('Erro ao atualizar viagem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar viagem</DialogTitle>
          <DialogDescription>Atualize os dados da viagem.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da viagem</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Férias na praia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destino</FormLabel>
                  <FormControl>
                    <LocationAutocomplete
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Ex: Florianópolis, SC"
                      types={['(cities)']}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de término</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="style"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estilo da viagem</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o estilo (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tripStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="base_currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moeda base</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a moeda" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {CURRENCY_LABELS[currency]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transport_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de transporte</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o transporte" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Algum detalhe sobre a viagem..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cover image upload */}
            <div className="space-y-2">
              <FormLabel>Capa da viagem (opcional)</FormLabel>
              {coverPreview ? (
                <div className="relative h-32 w-full overflow-hidden rounded-lg">
                  <Image
                    src={coverPreview}
                    alt="Capa da viagem"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                    aria-label="Remover capa"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/50 transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-6 w-6" aria-hidden="true" />
                      <span className="text-sm">Escolher imagem</span>
                    </div>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

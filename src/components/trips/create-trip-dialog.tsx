'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveFormContainer } from '@/components/ui/responsive-form-container';
import { StepIndicator } from '@/components/ui/step-indicator';
import { RequiredMark } from '@/components/ui/required-mark';
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
import { createTrip } from '@/lib/supabase/trips';
import { SUPPORTED_CURRENCIES, CURRENCY_LABELS } from '@/types/currency';
import { LocationAutocomplete } from '@/components/activities/location-autocomplete';
import { useDialogState } from '@/hooks/use-dialog-state';

interface CreateTripDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateTripDialog({
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange,
}: CreateTripDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const router = useRouter();

  const {
    open,
    setOpen,
    handleOpenChange: baseHandleOpenChange,
  } = useDialogState({
    controlledOpen,
    controlledOnOpenChange: onOpenChange,
    onClose: () => {
      form.reset();
      setStep(1);
      setCompletedSteps(new Set());
    },
  });

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

  const onSubmit = async (data: CreateTripFormOutput) => {
    setIsSubmitting(true);

    try {
      const result = await createTrip({
        name: data.name,
        destination: data.destination,
        start_date: data.start_date,
        end_date: data.end_date,
        description: data.description || null,
        style: data.style || null,
        base_currency: data.base_currency,
        transport_type: data.transport_type,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Viagem criada com sucesso!');
      setOpen(false);
      form.reset();
      setStep(1);
      setCompletedSteps(new Set());
      onSuccess?.();

      if (result.tripId) {
        router.push(`/trip/${result.tripId}`);
      }
    } catch {
      toast.error('Erro ao criar viagem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      baseHandleOpenChange(newOpen);
    }
  };

  const handleNext = async () => {
    let valid = false;
    if (step === 1) valid = await form.trigger(['name', 'destination']);
    if (step === 2) valid = await form.trigger(['start_date', 'end_date']);
    if (valid) {
      setCompletedSteps((prev) => new Set(prev).add(step));
      setStep((s) => (s + 1) as 2 | 3);
    }
  };

  const stepTitles = {
    1: 'Sua viagem',
    2: 'Quando',
    3: 'Configurações',
  };

  const steps = [
    { label: 'Sua viagem', description: 'Nome e destino' },
    { label: 'Quando', description: 'Datas' },
    { label: 'Configurações', description: 'Moeda e transporte' },
  ];

  return (
    <>
      {controlledOpen === undefined &&
        (trigger ? (
          <button type="button" onClick={() => setOpen(true)} className="contents">
            {trigger}
          </button>
        ) : (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova viagem
          </Button>
        ))}

      <ResponsiveFormContainer
        open={open}
        onOpenChange={handleOpenChange}
        title={stepTitles[step]}
        description="Preencha os dados da viagem. Você poderá convidar participantes depois."
      >
        <StepIndicator
          steps={steps}
          currentStep={step}
          completedSteps={completedSteps}
          className="mb-6"
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Step 1: Name, Destination, Description */}
            {step === 1 && (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nome da viagem
                        <RequiredMark />
                      </FormLabel>
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
                      <FormLabel>
                        Destino
                        <RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <LocationAutocomplete
                          value={field.value}
                          onChange={field.onChange}
                          name={field.name}
                          onBlur={field.onBlur}
                          placeholder="Ex: Florianópolis, SC"
                          types={['(cities)']}
                        />
                      </FormControl>
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

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleNext}>
                    Próximo
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Dates, Style */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Data de início
                          <RequiredMark />
                        </FormLabel>
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
                        <FormLabel>
                          Data de término
                          <RequiredMark />
                        </FormLabel>
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

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                    Voltar
                  </Button>
                  <Button type="button" onClick={handleNext}>
                    Próximo
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Currency, Transport */}
            {step === 3 && (
              <>
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
                          {SUPPORTED_CURRENCIES.map((code) => (
                            <SelectItem key={code} value={code}>
                              {CURRENCY_LABELS[code]}
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

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                    Voltar
                  </Button>
                  <Button type="submit" loading={isSubmitting}>
                    Criar viagem
                  </Button>
                </div>
              </>
            )}
          </form>
        </Form>
      </ResponsiveFormContainer>
    </>
  );
}

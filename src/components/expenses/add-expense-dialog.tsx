'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveFormContainer } from '@/components/ui/responsive-form-container';
import { AvatarSelector } from '@/components/ui/avatar-selector';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  expenseFormSchema,
  type ExpenseFormValues,
  expenseCategories,
  splitTypes,
  type SplitType,
  parseAmount,
  calculateEqualSplits,
  calculateAmountSplits,
  calculatePercentageSplits,
  validateSplitsTotal,
  validatePercentagesTotal,
  formatAmount,
} from '@/lib/validation/expense-schemas';
import { createExpense } from '@/lib/supabase/expenses';
import { useCurrencyInput, formatCurrencyWithCursor } from '@/hooks/use-currency-input';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/types/currency';
import { cn } from '@/lib/utils';
import type { TripMemberWithUser } from '@/lib/supabase/trips';

interface AddExpenseDialogProps {
  tripId: string;
  members: TripMemberWithUser[];
  currentUserId: string;
  baseCurrency: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddExpenseDialog({
  tripId,
  members,
  currentUserId,
  baseCurrency,
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddExpenseDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const defaultValues: ExpenseFormValues = {
    description: '',
    amount: '',
    currency: (baseCurrency as SupportedCurrency) || 'BRL',
    exchange_rate: '',
    date: new Date().toISOString().split('T')[0],
    category: 'other',
    paid_by: currentUserId,
    notes: '',
    split_type: 'equal',
    selected_members: members.map((m) => m.user_id),
    custom_amounts: {},
    custom_percentages: {},
  };

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues,
  });

  const watchCurrency = form.watch('currency');
  const watchAmount = form.watch('amount');
  const watchSplitType = form.watch('split_type');
  const watchSelectedMembers = form.watch('selected_members');

  const isForeignCurrency = watchCurrency !== baseCurrency;
  const parsedAmount = parseAmount(watchAmount || '0');

  const amountInput = useCurrencyInput({
    value: watchAmount,
    onChange: (v) => form.setValue('amount', v),
  });

  const exchangeRateValue = form.watch('exchange_rate');
  const exchangeRateInput = useCurrencyInput({
    value: exchangeRateValue,
    onChange: (v) => form.setValue('exchange_rate', v),
  });

  const avatarParticipants = members.map((m) => ({
    id: m.user_id,
    name: m.users.name,
    avatar_url: m.users.avatar_url,
  }));

  const onSubmit = async (data: ExpenseFormValues) => {
    const amount = parseAmount(data.amount);
    if (amount <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    const exchangeRate =
      isForeignCurrency && data.exchange_rate ? parseAmount(data.exchange_rate) : 1;

    if (isForeignCurrency && exchangeRate <= 0) {
      toast.error('Taxa de câmbio deve ser maior que zero');
      return;
    }

    let splits;
    const splitType = data.split_type as SplitType;
    if (splitType === 'equal') {
      splits = calculateEqualSplits(amount, data.selected_members);
    } else if (splitType === 'by_amount') {
      splits = calculateAmountSplits(amount, data.custom_amounts || {}, data.selected_members);
      const validation = validateSplitsTotal(splits, amount);
      if (!validation.valid) {
        toast.error(
          `A soma das divisões difere do total em ${formatAmount(Math.abs(validation.difference), data.currency)}`
        );
        return;
      }
    } else {
      splits = calculatePercentageSplits(
        amount,
        data.custom_percentages || {},
        data.selected_members
      );
      const validation = validatePercentagesTotal(
        data.custom_percentages || {},
        data.selected_members
      );
      if (!validation.valid) {
        toast.error(`A soma dos percentuais difere de 100% em ${validation.difference}%`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const result = await createExpense({
        trip_id: tripId,
        description: data.description,
        amount,
        currency: data.currency,
        exchange_rate: exchangeRate,
        date: data.date,
        category: data.category,
        paid_by: data.paid_by,
        notes: data.notes || null,
        splits: splits.map((s) => ({
          user_id: s.user_id,
          amount: s.amount,
          percentage: s.percentage,
        })),
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Despesa adicionada com sucesso!');
      setOpen(false);
      form.reset(defaultValues);
      setStep(1);
      onSuccess?.();
    } catch {
      toast.error('Erro ao salvar despesa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      setOpen(newOpen);
      if (!newOpen) {
        form.reset(defaultValues);
        setStep(1);
      }
    }
  };

  const handleNext = () => {
    const amount = parseAmount(form.getValues('amount') || '0');
    if (amount <= 0) {
      toast.error('Informe um valor maior que zero');
      return;
    }
    if (!form.getValues('paid_by')) {
      toast.error('Selecione quem pagou');
      return;
    }
    setStep(2);
  };

  return (
    <>
      {!isControlled &&
        (trigger ? (
          <span onClick={() => setOpen(true)}>{trigger}</span>
        ) : (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar despesa
          </Button>
        ))}

      <ResponsiveFormContainer
        open={open}
        onOpenChange={handleOpenChange}
        title={step === 1 ? 'Quanto e quem pagou' : 'Como dividir'}
        description={
          step === 1 ? 'Informe o valor e quem pagou.' : 'Configure a divisão da despesa.'
        }
      >
        {/* Step indicator */}
        <div className="flex justify-center gap-2 py-2">
          <div className={cn('size-2 rounded-full', step === 1 ? 'bg-primary' : 'bg-muted')} />
          <div className={cn('size-2 rounded-full', step === 2 ? 'bg-primary' : 'bg-muted')} />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <>
                {/* Large amount input */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={() => (
                    <FormItem>
                      <FormControl>
                        <Input
                          className="text-center text-3xl font-bold h-16 border-none shadow-none focus-visible:ring-0"
                          {...amountInput}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Currency selector */}
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem className="flex justify-center">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SUPPORTED_CURRENCIES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Exchange rate */}
                {isForeignCurrency && (
                  <FormField
                    control={form.control}
                    name="exchange_rate"
                    render={() => (
                      <FormItem>
                        <FormLabel>Taxa de câmbio</FormLabel>
                        <FormControl>
                          <Input {...exchangeRateInput} placeholder="Ex: 5,78" />
                        </FormControl>
                        <FormDescription>
                          1 {watchCurrency} = ? {baseCurrency}
                        </FormDescription>
                        {parsedAmount > 0 &&
                          exchangeRateValue &&
                          parseAmount(exchangeRateValue) > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {formatAmount(parsedAmount, watchCurrency)} ={' '}
                              {formatAmount(
                                parsedAmount * parseAmount(exchangeRateValue),
                                baseCurrency
                              )}
                            </p>
                          )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Paid by - AvatarSelector */}
                <div className="space-y-2">
                  <FormLabel>Pago por</FormLabel>
                  <AvatarSelector
                    participants={avatarParticipants}
                    selected={form.watch('paid_by')}
                    onSelect={(id) => form.setValue('paid_by', id)}
                  />
                </div>

                {/* Next button */}
                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleNext}>
                    Próximo
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Jantar no restaurante" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date and Category */}
                <div className="grid grid-cols-2 gap-4">
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

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {expenseCategories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Detalhes adicionais..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Split type */}
                <FormField
                  control={form.control}
                  name="split_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de divisão</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {splitTypes.map((type) => (
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

                {/* Member selection */}
                <FormField
                  control={form.control}
                  name="selected_members"
                  render={() => (
                    <FormItem>
                      <FormLabel>Participantes da divisão</FormLabel>
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div key={member.user_id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`dialog-member-${member.user_id}`}
                              checked={watchSelectedMembers.includes(member.user_id)}
                              onCheckedChange={(checked) => {
                                const current = form.getValues('selected_members');
                                if (checked) {
                                  form.setValue('selected_members', [...current, member.user_id], {
                                    shouldValidate: true,
                                  });
                                } else {
                                  form.setValue(
                                    'selected_members',
                                    current.filter((id) => id !== member.user_id),
                                    { shouldValidate: true }
                                  );
                                }
                              }}
                            />
                            <Label
                              htmlFor={`dialog-member-${member.user_id}`}
                              className="text-sm font-normal"
                            >
                              {member.users.name}
                            </Label>

                            {watchSplitType === 'by_amount' &&
                              watchSelectedMembers.includes(member.user_id) && (
                                <Input
                                  className="ml-auto w-28"
                                  placeholder="0,00"
                                  inputMode="numeric"
                                  value={form.watch(`custom_amounts.${member.user_id}`) || ''}
                                  onChange={(e) => {
                                    const { value } = formatCurrencyWithCursor(
                                      e.target.value,
                                      e.target.selectionStart || 0
                                    );
                                    form.setValue(`custom_amounts.${member.user_id}`, value);
                                  }}
                                />
                              )}

                            {watchSplitType === 'by_percentage' &&
                              watchSelectedMembers.includes(member.user_id) && (
                                <div className="ml-auto flex items-center gap-1">
                                  <Input
                                    className="w-20"
                                    placeholder="0"
                                    inputMode="decimal"
                                    value={form.watch(`custom_percentages.${member.user_id}`) || ''}
                                    onChange={(e) =>
                                      form.setValue(
                                        `custom_percentages.${member.user_id}`,
                                        e.target.value
                                      )
                                    }
                                  />
                                  <span className="text-sm text-muted-foreground">%</span>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                      <FormMessage />

                      {watchSplitType === 'equal' &&
                        watchSelectedMembers.length > 0 &&
                        parsedAmount > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {formatAmount(
                              parsedAmount / watchSelectedMembers.length,
                              watchCurrency
                            )}{' '}
                            por pessoa
                          </p>
                        )}
                    </FormItem>
                  )}
                />

                {/* Back + Submit buttons */}
                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                    Voltar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
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

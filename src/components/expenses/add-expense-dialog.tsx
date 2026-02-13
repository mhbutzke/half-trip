'use client';

import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Loader2,
  Plus,
  ArrowRight,
  ArrowLeft,
  Camera,
  ImageIcon,
  Sparkles,
  X,
  Pencil,
} from 'lucide-react';
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
import { uploadReceipt } from '@/lib/supabase/receipts';
import { useCurrencyInput, formatCurrencyWithCursor } from '@/hooks/use-currency-input';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/types/currency';
import { cn } from '@/lib/utils';
import type { TripMemberWithUser } from '@/lib/supabase/trips';

type DialogStep = 'capture' | 'details' | 'split';

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
  const [step, setStep] = useState<DialogStep>('capture');

  // Receipt state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Receipt handlers
  const handleReceiptCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB.');
        return;
      }

      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error('Use imagens (JPEG, PNG, WebP) ou PDF.');
        return;
      }

      // Clean up previous preview
      if (receiptPreview) {
        URL.revokeObjectURL(receiptPreview);
      }

      setReceiptFile(file);
      if (file.type.startsWith('image/')) {
        setReceiptPreview(URL.createObjectURL(file));
      }

      // Simulate AI receipt analysis
      setIsAnalyzing(true);
      // TODO: Replace with actual AI receipt analysis API call
      // e.g., const result = await analyzeReceipt(file);
      setTimeout(() => {
        setIsAnalyzing(false);
        setStep('details');
        toast.info('Preencha os dados da despesa');
      }, 1200);

      // Reset input values
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [receiptPreview]
  );

  const clearReceipt = useCallback(() => {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(null);
    setReceiptPreview(null);
    setIsAnalyzing(false);
  }, [receiptPreview]);

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

      // Upload receipt if captured
      if (receiptFile && result.expenseId) {
        try {
          await uploadReceipt(tripId, result.expenseId, receiptFile);
        } catch {
          toast.warning('Despesa criada, mas erro ao enviar comprovante.');
        }
      }

      toast.success('Despesa adicionada com sucesso!');
      setOpen(false);
      resetDialog();
      onSuccess?.();
    } catch {
      toast.error('Erro ao salvar despesa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetDialog = () => {
    form.reset(defaultValues);
    setStep('capture');
    clearReceipt();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      setOpen(newOpen);
      if (!newOpen) {
        resetDialog();
      }
    }
  };

  const handleNextToSplit = () => {
    const amount = parseAmount(form.getValues('amount') || '0');
    if (amount <= 0) {
      toast.error('Informe um valor maior que zero');
      return;
    }
    const description = form.getValues('description');
    if (!description || description.length < 2) {
      toast.error('Informe a descrição da despesa');
      return;
    }
    if (!form.getValues('paid_by')) {
      toast.error('Selecione quem pagou');
      return;
    }
    setStep('split');
  };

  const stepTitles: Record<DialogStep, string> = {
    capture: 'Nova despesa',
    details: 'Item e valor',
    split: 'Como dividir',
  };

  const stepDescriptions: Record<DialogStep, string> = {
    capture: 'Fotografe um comprovante ou lance manualmente',
    details: 'Informe o item e o valor da despesa',
    split: 'Configure a divisão da despesa',
  };

  return (
    <>
      {!isControlled &&
        (trigger ? (
          <button type="button" onClick={() => setOpen(true)} className="contents">
            {trigger}
          </button>
        ) : (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar despesa
          </Button>
        ))}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleReceiptCapture}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleReceiptCapture}
      />

      <ResponsiveFormContainer
        open={open}
        onOpenChange={handleOpenChange}
        title={stepTitles[step]}
        description={stepDescriptions[step]}
      >
        {/* Step indicator */}
        <div className="flex justify-center gap-2 py-2">
          <div
            className={cn('size-2 rounded-full', step === 'capture' ? 'bg-primary' : 'bg-muted')}
          />
          <div
            className={cn('size-2 rounded-full', step === 'details' ? 'bg-primary' : 'bg-muted')}
          />
          <div
            className={cn('size-2 rounded-full', step === 'split' ? 'bg-primary' : 'bg-muted')}
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* ── Step 1: Capture ── */}
            {step === 'capture' && (
              <div className="flex flex-col gap-4 py-2">
                {receiptPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={receiptPreview}
                        alt="Comprovante"
                        className="max-h-52 rounded-xl border shadow-sm"
                      />
                      {!isAnalyzing && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -right-2 -top-2 h-7 w-7 rounded-full"
                          onClick={clearReceipt}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {isAnalyzing ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processando comprovante...
                      </div>
                    ) : (
                      <div className="flex w-full gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={clearReceipt}
                        >
                          Refazer
                        </Button>
                        <Button type="button" className="flex-1" onClick={() => setStep('details')}>
                          Continuar
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Camera CTA */}
                    <button
                      type="button"
                      className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 sm:p-8 transition-colors hover:border-primary/50 hover:bg-primary/10 active:bg-primary/15"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary/10">
                        <Camera className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm sm:text-base">Fotografar comprovante</p>
                        <p className="mt-0.5 text-xs text-muted-foreground flex items-center justify-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          IA identifica automaticamente
                        </p>
                      </div>
                    </button>

                    {/* Gallery/File picker */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Selecionar da galeria
                    </Button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 border-t" />
                      <span className="text-xs text-muted-foreground">ou</span>
                      <div className="flex-1 border-t" />
                    </div>

                    {/* Manual entry */}
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-muted-foreground"
                      onClick={() => setStep('details')}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Lançar manualmente
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* ── Step 2: Details ── */}
            {step === 'details' && (
              <>
                {/* Receipt thumbnail if captured */}
                {receiptPreview && (
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptPreview}
                      alt="Comprovante"
                      className="h-10 w-10 rounded object-cover"
                    />
                    <span className="text-sm text-muted-foreground flex-1">
                      Comprovante anexado
                    </span>
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                )}

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Jantar no restaurante" {...field} autoFocus />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Amount + Currency */}
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={() => (
                      <FormItem className="flex-1">
                        <FormLabel>Valor</FormLabel>
                        <FormControl>
                          <Input className="text-lg font-bold tabular-nums" {...amountInput} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel>Moeda</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                </div>

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

                {/* Date and Category */}
                <div className="grid grid-cols-2 gap-3">
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

                {/* Paid by - AvatarSelector */}
                <div className="space-y-2">
                  <FormLabel>Pago por</FormLabel>
                  <AvatarSelector
                    participants={avatarParticipants}
                    selected={form.watch('paid_by')}
                    onSelect={(id) => form.setValue('paid_by', id)}
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

                {/* Navigation buttons */}
                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep('capture')}>
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                    Voltar
                  </Button>
                  <Button type="button" onClick={handleNextToSplit}>
                    Próximo
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </>
            )}

            {/* ── Step 3: Split ── */}
            {step === 'split' && (
              <>
                {/* Amount summary */}
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {form.getValues('description')}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {parsedAmount > 0 ? formatAmount(parsedAmount, watchCurrency) : '—'}
                  </span>
                </div>

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
                                    const { value } = formatCurrencyWithCursor(e.target.value);
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
                  <Button type="button" variant="outline" onClick={() => setStep('details')}>
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

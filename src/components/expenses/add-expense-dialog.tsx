'use client';

import {
  cloneElement,
  isValidElement,
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEventHandler,
  type MouseEventHandler,
} from 'react';
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
import {
  expenseFormSchema,
  type ExpenseFormValues,
  splitTypes,
  parseAmount,
  formatAmountInput,
} from '@/lib/validation/expense-schemas';
import { CategorySelector } from './category-selector';
import { SplitPreview } from './split-preview';
import { suggestCategory } from '@/lib/utils/smart-categories';
import { createExpense, updateExpense } from '@/lib/supabase/expenses';
import { uploadReceipt } from '@/lib/supabase/receipts';
import { useDialogState } from '@/hooks/use-dialog-state';
import { useExpenseSplits } from '@/hooks/use-expense-splits';
import { CurrencyAmountInput } from '@/components/forms/currency-amount-input';
import { MemberSplitSelector } from '@/components/forms/member-split-selector';
import { cn } from '@/lib/utils';
import type { SupportedCurrency } from '@/types/currency';
import type { TripMemberWithUser } from '@/lib/supabase/trips';
import type { ExpenseWithDetails } from '@/types/expense';

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
  /** When provided, dialog operates in edit mode */
  expense?: ExpenseWithDetails | null;
}

type TriggerElementProps = {
  onClick?: MouseEventHandler<HTMLElement>;
};

export function AddExpenseDialog({
  tripId,
  members,
  currentUserId,
  baseCurrency,
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  expense,
}: AddExpenseDialogProps) {
  const isEditing = !!expense;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<DialogStep>(isEditing ? 'details' : 'capture');

  // Receipt state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultValues: ExpenseFormValues = useMemo(
    () => ({
      description: expense?.description || '',
      amount: expense ? formatAmountInput(expense.amount) : '',
      currency:
        (expense?.currency as SupportedCurrency) || (baseCurrency as SupportedCurrency) || 'BRL',
      exchange_rate:
        expense?.exchange_rate && expense.exchange_rate !== 1
          ? formatAmountInput(expense.exchange_rate)
          : '',
      date: expense?.date || new Date().toISOString().split('T')[0],
      category: expense?.category || 'other',
      paid_by: expense?.paid_by || currentUserId,
      notes: expense?.notes || '',
      split_type: 'equal',
      selected_members:
        expense?.expense_splits.map((s) => s.user_id) || members.map((m) => m.user_id),
      custom_amounts: {},
      custom_percentages: {},
    }),
    [expense, baseCurrency, currentUserId, members]
  );

  const { open, setOpen } = useDialogState({
    controlledOpen,
    controlledOnOpenChange,
  });

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues,
  });

  const watchSplitType = form.watch('split_type');
  const watchSelectedMembers = form.watch('selected_members');
  const watchAmount = form.watch('amount');
  const watchDescription = form.watch('description');
  const watchCategory = form.watch('category');

  const { calculateSplits } = useExpenseSplits(baseCurrency);

  // Auto-suggest category based on description (only if category is still 'other' and not editing)
  useEffect(() => {
    if (!isEditing && watchDescription && watchCategory === 'other') {
      const suggested = suggestCategory(watchDescription);
      if (suggested) {
        form.setValue('category', suggested);
      }
    }
  }, [watchDescription, watchCategory, isEditing, form]);

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
    const splitResult = calculateSplits(data);
    if (!splitResult) return;

    const { splits, amount, exchangeRate } = splitResult;

    setIsSubmitting(true);

    try {
      const payload = {
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
      };

      const result = isEditing
        ? await updateExpense(expense!.id, payload)
        : await createExpense({ ...payload, trip_id: tripId });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Upload receipt if captured (only for new expenses)
      if (!isEditing && receiptFile && result.expenseId) {
        try {
          await uploadReceipt(tripId, result.expenseId, receiptFile);
        } catch {
          toast.warning('Despesa criada, mas erro ao enviar comprovante.');
        }
      }

      toast.success(
        isEditing ? 'Despesa atualizada com sucesso!' : 'Despesa adicionada com sucesso!'
      );
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
    setStep(isEditing ? 'details' : 'capture');
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

  const handleTriggerKeyboard: KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
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
    capture: isEditing ? 'Editar despesa' : 'Nova despesa',
    details: isEditing ? 'Editar valor' : 'Item e valor',
    split: isEditing ? 'Editar divisão' : 'Como dividir',
  };

  const stepDescriptions: Record<DialogStep, string> = {
    capture: 'Fotografe um comprovante ou lance manualmente',
    details: 'Informe o item e o valor da despesa',
    split: 'Configure a divisão da despesa',
  };

  const uncontrolledTrigger =
    controlledOpen === undefined ? (
      trigger ? (
        isValidElement<TriggerElementProps>(trigger) ? (
          cloneElement(trigger, {
            onClick: (event) => {
              trigger.props.onClick?.(event);
              if (!event.defaultPrevented) {
                setOpen(true);
              }
            },
          })
        ) : (
          <span
            role="button"
            tabIndex={0}
            className="contents"
            onClick={() => setOpen(true)}
            onKeyDown={handleTriggerKeyboard}
          >
            {trigger}
          </span>
        )
      ) : (
        <Button size="sm" className="h-11 sm:h-9" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar despesa
        </Button>
      )
    ) : null;

  return (
    <>
      {uncontrolledTrigger}

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
                      <FormLabel>
                        Descrição<RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Jantar no restaurante" {...field} autoFocus />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Amount + Currency + Exchange Rate */}
                <CurrencyAmountInput form={form} baseCurrency={baseCurrency} variant="compact" />

                {/* Split Preview (if amount > 0) */}
                {parseAmount(watchAmount || '0') > 0 && watchSelectedMembers.length > 0 && (
                  <SplitPreview
                    splits={watchSelectedMembers.map((userId) => {
                      const member = members.find((m) => m.user_id === userId);
                      const amount = parseAmount(watchAmount || '0') / watchSelectedMembers.length;
                      return {
                        userId,
                        userName: member?.users.name || 'Desconhecido',
                        userAvatar: member?.users.avatar_url || null,
                        amount,
                        isPayer: userId === form.watch('paid_by'),
                      };
                    })}
                    currency={form.watch('currency')}
                    totalAmount={parseAmount(watchAmount || '0')}
                  />
                )}

                {/* Date and Category */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Data<RequiredMark />
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
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Categoria<RequiredMark />
                        </FormLabel>
                        <FormControl>
                          <CategorySelector value={field.value} onChange={field.onChange} />
                        </FormControl>
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
                  {!isEditing ? (
                    <Button type="button" variant="outline" onClick={() => setStep('capture')}>
                      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                      Voltar
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                      Cancelar
                    </Button>
                  )}
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
                    {parseAmount(watchAmount || '0') > 0
                      ? `${watchAmount} ${form.watch('currency')}`
                      : '—'}
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

                {/* Member selection with splits */}
                <FormField
                  control={form.control}
                  name="selected_members"
                  render={() => (
                    <FormItem>
                      <FormLabel>Participantes da divisão</FormLabel>
                      <MemberSplitSelector
                        members={members}
                        splitType={watchSplitType as 'equal' | 'by_amount' | 'by_percentage'}
                        selectedMembers={watchSelectedMembers}
                        onSelectedMembersChange={(ids) =>
                          form.setValue('selected_members', ids, { shouldValidate: true })
                        }
                        customAmounts={form.watch('custom_amounts')}
                        onCustomAmountsChange={(amounts) =>
                          form.setValue('custom_amounts', amounts)
                        }
                        customPercentages={form.watch('custom_percentages')}
                        onCustomPercentagesChange={(percentages) =>
                          form.setValue('custom_percentages', percentages)
                        }
                        currency={form.watch('currency')}
                        totalAmount={watchAmount}
                        idPrefix="dialog-member"
                      />
                      <FormMessage />
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
                    {isEditing ? 'Salvar alterações' : 'Salvar'}
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

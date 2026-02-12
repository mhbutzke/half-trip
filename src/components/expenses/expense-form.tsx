'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { createExpense, updateExpense } from '@/lib/supabase/expenses';
import { SUPPORTED_CURRENCIES, CURRENCY_LABELS, type SupportedCurrency } from '@/types/currency';
import type { TripMemberWithUser } from '@/lib/supabase/trips';
import type { ExpenseWithDetails } from '@/types/expense';
import Link from 'next/link';

interface ExpenseFormProps {
  tripId: string;
  members: TripMemberWithUser[];
  currentUserId: string;
  baseCurrency: string;
  expense?: ExpenseWithDetails | null;
}

export function ExpenseForm({
  tripId,
  members,
  currentUserId,
  baseCurrency,
  expense,
}: ExpenseFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!expense;

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: expense?.description || '',
      amount: expense ? String(expense.amount).replace('.', ',') : '',
      currency:
        (expense?.currency as SupportedCurrency) || (baseCurrency as SupportedCurrency) || 'BRL',
      exchange_rate:
        expense?.exchange_rate && expense.exchange_rate !== 1
          ? String(expense.exchange_rate).replace('.', ',')
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
    },
  });

  const watchCurrency = form.watch('currency');
  const watchAmount = form.watch('amount');
  const watchSplitType = form.watch('split_type');
  const watchSelectedMembers = form.watch('selected_members');

  const isForeignCurrency = watchCurrency !== baseCurrency;
  const parsedAmount = parseAmount(watchAmount || '0');

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

    // Calculate splits
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
      if (isEditing && expense) {
        const result = await updateExpense(expense.id, {
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

        toast.success('Despesa atualizada com sucesso!');
      } else {
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
      }

      router.push(`/trip/${tripId}/expenses`);
      router.refresh();
    } catch {
      toast.error('Erro ao salvar despesa');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/trip/${tripId}/expenses`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{isEditing ? 'Editar despesa' : 'Nova despesa'}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhes da despesa</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              {/* Amount + Currency row */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <Input placeholder="0,00" inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moeda</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
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

              {/* Exchange rate - only when currency differs from base */}
              {isForeignCurrency && (
                <FormField
                  control={form.control}
                  name="exchange_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taxa de câmbio</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 5,78" inputMode="decimal" {...field} />
                      </FormControl>
                      <FormDescription>
                        1 {watchCurrency} = ? {baseCurrency}
                      </FormDescription>
                      {parsedAmount > 0 && field.value && parseAmount(field.value) > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {formatAmount(parsedAmount, watchCurrency)} ={' '}
                          {formatAmount(parsedAmount * parseAmount(field.value), baseCurrency)}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Date and Category row */}
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

              {/* Paid by */}
              <FormField
                control={form.control}
                name="paid_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pago por</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Quem pagou?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.users.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                            id={`member-${member.user_id}`}
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
                            htmlFor={`member-${member.user_id}`}
                            className="text-sm font-normal"
                          >
                            {member.users.name}
                          </Label>

                          {/* Custom amount input */}
                          {watchSplitType === 'by_amount' &&
                            watchSelectedMembers.includes(member.user_id) && (
                              <Input
                                className="ml-auto w-28"
                                placeholder="0,00"
                                inputMode="decimal"
                                value={form.watch(`custom_amounts.${member.user_id}`) || ''}
                                onChange={(e) =>
                                  form.setValue(`custom_amounts.${member.user_id}`, e.target.value)
                                }
                              />
                            )}

                          {/* Custom percentage input */}
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

                    {/* Split summary for equal */}
                    {watchSplitType === 'equal' &&
                      watchSelectedMembers.length > 0 &&
                      parsedAmount > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {formatAmount(parsedAmount / watchSelectedMembers.length, watchCurrency)}{' '}
                          por pessoa
                        </p>
                      )}
                  </FormItem>
                )}
              />

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link href={`/trip/${tripId}/expenses`}>Cancelar</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Salvar alterações' : 'Adicionar despesa'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

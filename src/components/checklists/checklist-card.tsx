'use client';

import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { BudgetProgress } from '@/components/budget/budget-progress';
import { getChecklistCategoryInfo } from '@/lib/utils/checklist-categories';
import {
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from '@/lib/supabase/checklists';
import { toast } from 'sonner';
import type { ChecklistWithItems } from '@/types/checklist';

interface ChecklistCardProps {
  checklist: ChecklistWithItems;
  isOrganizer: boolean;
  currentUserId: string;
  onDelete: (checklist: ChecklistWithItems) => void;
  onRefresh: () => void;
}

export function ChecklistCard({
  checklist,
  isOrganizer,
  currentUserId,
  onDelete,
  onRefresh,
}: ChecklistCardProps) {
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const categoryInfo = getChecklistCategoryInfo(checklist.category);
  const Icon = categoryInfo.icon;
  const percentage =
    checklist.totalCount > 0 ? (checklist.completedCount / checklist.totalCount) * 100 : 0;
  const status = percentage >= 100 ? 'safe' : percentage >= 50 ? 'warning' : ('exceeded' as const);
  const canDelete = isOrganizer || checklist.created_by === currentUserId;

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    setIsAdding(true);
    try {
      const result = await addChecklistItem({
        checklist_id: checklist.id,
        title: newItemTitle.trim(),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setNewItemTitle('');
      onRefresh();
    } finally {
      setIsAdding(false);
    }
  }

  async function handleToggle(itemId: string) {
    const result = await toggleChecklistItem(itemId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    onRefresh();
  }

  async function handleDeleteItem(itemId: string) {
    const result = await deleteChecklistItem(itemId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    onRefresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${categoryInfo.bgColor}`}
            >
              <Icon className={`h-4 w-4 ${categoryInfo.color}`} aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base">{checklist.name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {checklist.completedCount}/{checklist.totalCount} itens
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline">{categoryInfo.label}</Badge>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => onDelete(checklist)}
                aria-label={`Excluir checklist ${checklist.name}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
        {checklist.totalCount > 0 && (
          <BudgetProgress percentage={percentage} status={status} className="mt-2" />
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {checklist.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
          >
            <Checkbox
              checked={item.is_completed}
              onCheckedChange={() => handleToggle(item.id)}
              aria-label={`Marcar "${item.title}" como ${item.is_completed ? 'não feito' : 'feito'}`}
            />
            <span
              className={`flex-1 text-sm ${
                item.is_completed ? 'text-muted-foreground line-through' : ''
              }`}
            >
              {item.title}
              {item.quantity > 1 && (
                <span className="ml-1 text-xs text-muted-foreground">x{item.quantity}</span>
              )}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
              onClick={() => handleDeleteItem(item.id)}
              aria-label={`Remover "${item.title}"`}
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        ))}

        <form onSubmit={handleAddItem} className="flex gap-2 pt-1">
          <Input
            placeholder="Adicionar item..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            className="h-8 text-sm"
            disabled={isAdding}
          />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={isAdding || !newItemTitle.trim()}
            aria-label="Adicionar item"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

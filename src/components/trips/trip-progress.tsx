'use client';

import { ProgressIndicator } from './progress-indicator';

export interface TripProgressData {
  checklist?: {
    completed: number;
    total: number;
  } | null;
  budget?: {
    used: number;
    total: number;
  } | null;
}

interface TripProgressProps {
  progress: TripProgressData;
}

export function TripProgress({ progress }: TripProgressProps) {
  const hasChecklist = progress.checklist && progress.checklist.total > 0;
  const hasBudget = progress.budget && progress.budget.total > 0;

  // Don't render anything if no progress data available
  if (!hasChecklist && !hasBudget) {
    return null;
  }

  const checklistPercentage = hasChecklist
    ? (progress.checklist!.completed / progress.checklist!.total) * 100
    : 0;

  const budgetPercentage = hasBudget ? (progress.budget!.used / progress.budget!.total) * 100 : 0;

  return (
    <div className="space-y-2 pt-3 border-t">
      {hasChecklist && (
        <ProgressIndicator value={checklistPercentage} label="Checklist" variant="auto" />
      )}
      {hasBudget && <ProgressIndicator value={budgetPercentage} label="Orçamento" variant="auto" />}
    </div>
  );
}

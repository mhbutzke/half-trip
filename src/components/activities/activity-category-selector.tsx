'use client';

import { cn } from '@/lib/utils';
import { activityCategoryList } from '@/lib/utils/activity-categories';
import type { ActivityCategory } from '@/types/database';

interface ActivityCategorySelectorProps {
  value: ActivityCategory | undefined;
  onChange: (category: ActivityCategory) => void;
  className?: string;
}

export function ActivityCategorySelector({
  value,
  onChange,
  className,
}: ActivityCategorySelectorProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {activityCategoryList.map((category) => {
        const Icon = category.icon;
        const isSelected = value === category.value;

        return (
          <button
            key={category.value}
            type="button"
            onClick={() => onChange(category.value)}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all',
              isSelected
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-transparent bg-muted/50 hover:bg-muted hover:border-muted-foreground/20'
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-all',
                isSelected ? category.bgColor : 'bg-background',
                category.color
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">
              {category.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

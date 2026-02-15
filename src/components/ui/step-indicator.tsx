'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: Set<number>;
  className?: string;
  showLabels?: boolean;
}

export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  className,
  showLabels = true,
}: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = completedSteps.has(stepNumber);
        const isCurrent = stepNumber === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div key={stepNumber} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2">
              {/* Circle indicator */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                  isCurrent
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted bg-background text-muted-foreground'
                )}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Step ${stepNumber}: ${step.label}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <span className="text-sm font-medium">{stepNumber}</span>
                )}
              </div>

              {/* Label */}
              {showLabels && (
                <div className="hidden sm:flex flex-col items-center">
                  <span className="text-xs text-muted-foreground text-center">{step.label}</span>
                  {step.description && (
                    <span className="text-[10px] text-muted-foreground/70 text-center max-w-20">
                      {step.description}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'mx-2 h-0.5 flex-1 transition-all',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

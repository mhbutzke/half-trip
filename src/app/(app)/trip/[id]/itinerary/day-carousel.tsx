'use client';

import { useRef, useCallback, useEffect } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DayCarouselProps {
  dates: string[];
  tripDays: string[];
  activitiesByDate: Record<string, { length: number }>;
  activeIndex: number;
  onDayChange: (index: number) => void;
  children: React.ReactNode[];
}

export function DayCarousel({
  dates,
  tripDays,
  activitiesByDate,
  activeIndex,
  onDayChange,
  children,
}: DayCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Scroll to a specific day in the carousel
  const scrollToDay = useCallback(
    (index: number) => {
      const container = scrollRef.current;
      if (!container) return;

      isScrollingRef.current = true;
      const slideWidth = container.offsetWidth;
      container.scrollTo({
        left: index * slideWidth,
        behavior: 'smooth',
      });

      // Reset the flag after scroll completes
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 500);

      onDayChange(index);
    },
    [onDayChange]
  );

  // Detect which slide is visible from scroll position
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const slideWidth = container.offsetWidth;
      if (slideWidth === 0) return;

      const newIndex = Math.round(container.scrollLeft / slideWidth);
      const clampedIndex = Math.max(0, Math.min(newIndex, dates.length - 1));

      if (clampedIndex !== activeIndex) {
        onDayChange(clampedIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, dates.length, onDayChange]);

  // Scroll active pill into view
  useEffect(() => {
    const pillsContainer = pillsRef.current;
    if (!pillsContainer) return;

    const activePill = pillsContainer.children[activeIndex] as HTMLElement | undefined;
    if (!activePill) return;

    const containerRect = pillsContainer.getBoundingClientRect();
    const pillRect = activePill.getBoundingClientRect();

    if (pillRect.left < containerRect.left || pillRect.right > containerRect.right) {
      activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeIndex]);

  // Set initial position without animation
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const slideWidth = container.offsetWidth;
    container.scrollLeft = activeIndex * slideWidth;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < dates.length - 1;

  return (
    <div className="space-y-3">
      {/* Pills Navigation */}
      <div className="relative flex items-center gap-1">
        {/* Previous arrow (desktop only) */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 flex-shrink-0 sm:flex"
          disabled={!canGoPrev}
          onClick={() => scrollToDay(activeIndex - 1)}
          aria-label="Dia anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Pills */}
        <div
          ref={pillsRef}
          className="flex flex-1 gap-1.5 overflow-x-auto scrollbar-none pb-0.5"
          role="tablist"
          aria-label="Navegação por dia"
        >
          {dates.map((date, index) => {
            const count = (activitiesByDate[date] || []).length;
            const dayNumber = tripDays.indexOf(date) + 1;
            const label = dayNumber > 0 ? `Dia ${dayNumber}` : format(parseISO(date), 'd/MM');
            const isActive = index === activeIndex;
            const isCurrent = isToday(parseISO(date));

            return (
              <button
                key={date}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`${label}, ${format(parseISO(date), "d 'de' MMMM", { locale: ptBR })}, ${count} ${count === 1 ? 'atividade' : 'atividades'}`}
                onClick={() => scrollToDay(index)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : isCurrent
                      ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                      : 'border-border bg-background text-foreground hover:bg-accent'
                )}
              >
                <span className="font-medium">{label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Next arrow (desktop only) */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 flex-shrink-0 sm:flex"
          disabled={!canGoNext}
          onClick={() => scrollToDay(activeIndex + 1)}
          aria-label="Próximo dia"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Carousel Content */}
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
        style={{ scrollBehavior: 'auto' }}
      >
        {children.map((child, index) => (
          <div key={dates[index]} className="w-full min-w-full snap-center px-1">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

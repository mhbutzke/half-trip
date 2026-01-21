'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ActivityCard } from './activity-card';
import type { ActivityWithCreator } from '@/lib/supabase/activities';

interface DraggableActivityCardProps {
  activity: ActivityWithCreator;
  onEdit: (activity: ActivityWithCreator) => void;
  onDelete: (activity: ActivityWithCreator) => void;
  isDragOverlay?: boolean;
}

export function DraggableActivityCard({
  activity,
  onEdit,
  onDelete,
  isDragOverlay = false,
}: DraggableActivityCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
    data: {
      type: 'activity',
      activity,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // For the drag overlay, render without the sortable wrapper
  if (isDragOverlay) {
    return (
      <div className="cursor-grabbing">
        <div className="relative">
          <div className="absolute -left-8 top-1/2 flex -translate-y-1/2 items-center">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <ActivityCard activity={activity} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="group/draggable relative touch-manipulation">
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-8 top-1/2 z-10 flex -translate-y-1/2 cursor-grab items-center rounded p-1 opacity-0 transition-opacity hover:bg-muted focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/draggable:opacity-100 active:cursor-grabbing sm:-left-10"
        aria-label="Arrastar atividade"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <ActivityCard activity={activity} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

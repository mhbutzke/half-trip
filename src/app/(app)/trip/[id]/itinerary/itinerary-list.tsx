'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DaySection } from './day-section';
import { DraggableActivityCard } from './draggable-activity-card';
import { reorderActivities } from '@/lib/supabase/activities';
import { useTripRealtime } from '@/hooks/use-trip-realtime';
import type { ActivityWithCreator } from '@/lib/supabase/activities';
import type { Activity } from '@/types/database';

// Lazy load activity dialogs - only needed when user interacts
const DeleteActivityDialog = dynamic(() =>
  import('./delete-activity-dialog').then((mod) => ({ default: mod.DeleteActivityDialog }))
);
const AddActivityDialog = dynamic(() =>
  import('@/components/activities/add-activity-dialog').then((mod) => ({
    default: mod.AddActivityDialog,
  }))
);
const EditActivityDialog = dynamic(() =>
  import('@/components/activities/edit-activity-dialog').then((mod) => ({
    default: mod.EditActivityDialog,
  }))
);

interface ItineraryListProps {
  tripId: string;
  startDate: string;
  endDate: string;
  initialActivities: ActivityWithCreator[];
  userRole: 'organizer' | 'participant' | null;
  currentUserId?: string;
}

export function ItineraryList({
  tripId,
  startDate,
  endDate,
  initialActivities,
}: ItineraryListProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityWithCreator[]>(initialActivities);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<ActivityWithCreator | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Enable real-time updates for this trip
  useTripRealtime({ tripId });

  // Sync activities when initialActivities changes (from real-time updates)
  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  // Generate all days in the trip range
  const tripDays = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return eachDayOfInterval({ start, end }).map((date) => format(date, 'yyyy-MM-dd'));
  }, [startDate, endDate]);

  // Group activities by date
  const activitiesByDate = useMemo(() => {
    const grouped: Record<string, ActivityWithCreator[]> = {};

    // Initialize all days with empty arrays
    tripDays.forEach((date) => {
      grouped[date] = [];
    });

    // Group activities into their respective days
    activities.forEach((activity) => {
      if (grouped[activity.date]) {
        grouped[activity.date].push(activity);
      } else {
        // Activity date is outside trip range
        grouped[activity.date] = [activity];
      }
    });

    // Sort activities within each day by sort_order, then by start_time
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        // First sort by sort_order
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        // Then by start_time if both have one
        if (a.start_time && b.start_time) {
          return a.start_time.localeCompare(b.start_time);
        }
        // Activities without start_time come after those with
        if (a.start_time) return -1;
        if (b.start_time) return 1;
        return 0;
      });
    });

    return grouped;
  }, [activities, tripDays]);

  // Get all dates that have activities or are within trip range
  const allDates = useMemo(() => {
    const dates = new Set<string>([...tripDays]);

    // Add any dates from activities that might be outside trip range
    activities.forEach((activity) => {
      dates.add(activity.date);
    });

    return Array.from(dates).sort();
  }, [tripDays, activities]);

  // Find the active activity for the drag overlay
  const activeActivity = useMemo(() => {
    if (!activeId) return null;
    return activities.find((a) => a.id === activeId) || null;
  }, [activeId, activities]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Find the activity being dragged
      const activeActivity = activities.find((a) => a.id === activeId);
      if (!activeActivity) return;

      // Check if we're over a day container (date string like 'yyyy-MM-dd')
      const isOverDay = allDates.includes(overId);

      if (isOverDay) {
        const overDate = overId;

        // If the activity is already on this day, no need to move it
        if (activeActivity.date === overDate) return;

        // Move activity to the new day (optimistic update)
        setActivities((prev) => {
          return prev.map((activity) => {
            if (activity.id === activeId) {
              return { ...activity, date: overDate };
            }
            return activity;
          });
        });
        return;
      }

      // Check if we're over another activity
      const overActivity = activities.find((a) => a.id === overId);
      if (!overActivity) return;

      // If the activities are on different days, move to that day
      if (activeActivity.date !== overActivity.date) {
        setActivities((prev) => {
          return prev.map((activity) => {
            if (activity.id === activeId) {
              return { ...activity, date: overActivity.date };
            }
            return activity;
          });
        });
      }
    },
    [activities, allDates]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Find the dragged activity (it may have been moved to a new day during drag)
      const draggedActivity = activities.find((a) => a.id === activeId);
      if (!draggedActivity) return;

      const currentDate = draggedActivity.date;

      // Get activities for the current day
      const dayActivities = activitiesByDate[currentDate] || [];
      const oldIndex = dayActivities.findIndex((a) => a.id === activeId);

      // Check if we dropped over another activity on the same day
      const overActivity = dayActivities.find((a) => a.id === overId);

      let newActivities = [...activities];

      if (overActivity && oldIndex !== -1) {
        const newIndex = dayActivities.findIndex((a) => a.id === overId);

        if (oldIndex !== newIndex) {
          // Reorder within the same day
          const reorderedDay = arrayMove(dayActivities, oldIndex, newIndex);

          // Update sort_order for all activities in the day
          const reorderedWithSortOrder = reorderedDay.map((activity, index) => ({
            ...activity,
            sort_order: index,
          }));

          // Replace the activities for this day
          newActivities = activities.filter((a) => a.date !== currentDate);
          newActivities = [...newActivities, ...reorderedWithSortOrder];

          // Sort by date, then sort_order
          newActivities.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.sort_order - b.sort_order;
          });

          setActivities(newActivities);
        }
      } else if (allDates.includes(overId)) {
        // Dropped on a day container - need to update sort orders
        const targetDate = overId;
        const targetDayActivities = activitiesByDate[targetDate] || [];

        // Recalculate sort orders for the target day
        const updatedTargetDay = targetDayActivities.map((activity, index) => ({
          ...activity,
          sort_order: index,
        }));

        newActivities = activities.filter((a) => a.date !== targetDate);
        newActivities = [...newActivities, ...updatedTargetDay];

        newActivities.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.sort_order - b.sort_order;
        });

        setActivities(newActivities);
      }

      // Prepare updates for the server
      const updates = newActivities.map((activity) => ({
        activityId: activity.id,
        date: activity.date,
        sort_order: activity.sort_order,
      }));

      // Persist changes to the database
      const result = await reorderActivities(tripId, updates);

      if (result.error) {
        toast.error('Erro ao reorganizar atividades', {
          description: result.error,
        });
        // Revert to initial activities on error
        setActivities(initialActivities);
      } else {
        toast.success('Atividades reorganizadas');
      }
    },
    [activities, activitiesByDate, allDates, tripId, initialActivities]
  );

  const handleAddActivity = (date: string) => {
    setSelectedDate(date);
    setIsAddDialogOpen(true);
  };

  const handleEditActivity = (activity: ActivityWithCreator) => {
    setEditingActivity(activity);
    setIsEditDialogOpen(true);
  };

  const handleDeleteActivity = (activity: ActivityWithCreator) => {
    setDeletingActivity(activity);
    setIsDeleteDialogOpen(true);
  };

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
    setSelectedDate(null);
    router.refresh();
  };

  const handleAddDialogChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setSelectedDate(null);
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingActivity(null);
    router.refresh();
  };

  const handleDeleteSuccess = () => {
    setIsDeleteDialogOpen(false);
    setDeletingActivity(null);
    router.refresh();
  };

  const totalActivities = activities.length;

  if (tripDays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <MapPin className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 font-semibold">Datas da viagem não definidas</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure as datas da viagem para começar a planejar o roteiro.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Summary */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
        <div>
          <p className="text-sm text-muted-foreground">Total de atividades</p>
          <p className="text-2xl font-bold">{totalActivities}</p>
        </div>
        <AddActivityDialog
          tripId={tripId}
          defaultDate={tripDays[0]}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova atividade
            </Button>
          }
          onSuccess={handleAddSuccess}
        />
      </div>

      {/* Day Sections with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-8">
          {allDates.map((date) => {
            const dayNumber = tripDays.indexOf(date) + 1;
            const isOutOfRange = !tripDays.includes(date);

            return (
              <DaySection
                key={date}
                date={date}
                dayNumber={isOutOfRange ? 0 : dayNumber}
                activities={activitiesByDate[date] || []}
                onAddActivity={handleAddActivity}
                onEditActivity={handleEditActivity}
                onDeleteActivity={handleDeleteActivity}
              />
            );
          })}
        </div>

        {/* Drag Overlay - Shows a preview of the dragged item */}
        <DragOverlay>
          {activeActivity ? (
            <div className="w-full max-w-md">
              <DraggableActivityCard
                activity={activeActivity}
                onEdit={() => {}}
                onDelete={() => {}}
                isDragOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Activity Dialog - Triggered by selecting a date */}
      <AddActivityDialog
        tripId={tripId}
        defaultDate={selectedDate || tripDays[0]}
        open={isAddDialogOpen}
        onOpenChange={handleAddDialogChange}
        onSuccess={handleAddSuccess}
      />

      {/* Edit Activity Dialog */}
      <EditActivityDialog
        activity={editingActivity}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Activity Dialog */}
      <DeleteActivityDialog
        activity={deletingActivity}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}

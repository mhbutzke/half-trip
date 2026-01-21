'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DaySection } from './day-section';
import { DeleteActivityDialog } from './delete-activity-dialog';
import { AddActivityDialog } from '@/components/activities/add-activity-dialog';
import { EditActivityDialog } from '@/components/activities/edit-activity-dialog';
import type { ActivityWithCreator } from '@/lib/supabase/activities';
import type { Activity } from '@/types/database';

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
  const [activities] = useState<ActivityWithCreator[]>(initialActivities);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<ActivityWithCreator | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

      {/* Day Sections */}
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

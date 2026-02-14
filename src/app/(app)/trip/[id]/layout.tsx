import { TripSidebar } from '@/components/layout/trip-sidebar';
import { TripContextSetter } from '@/components/layout/trip-context-setter';
import { createClient } from '@/lib/supabase/server';

interface TripLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function TripLayout({ children, params }: TripLayoutProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: trip } = await supabase.from('trips').select('name').eq('id', id).single();

  return (
    <div className="flex flex-1">
      <TripContextSetter tripName={trip?.name || ''} />
      <TripSidebar tripId={id} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

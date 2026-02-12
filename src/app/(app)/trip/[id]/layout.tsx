import { TripSidebar } from '@/components/layout/trip-sidebar';

interface TripLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function TripLayout({ children, params }: TripLayoutProps) {
  const { id } = await params;

  return (
    <div className="flex flex-1">
      <TripSidebar tripId={id} />
      <div className="flex-1">{children}</div>
    </div>
  );
}

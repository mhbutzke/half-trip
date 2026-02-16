import { PageContainer } from '@/components/layout/page-container';
import { ItinerarySkeleton } from './itinerary-skeleton';

export default function ItineraryLoading() {
  return (
    <PageContainer bottomNav>
      <ItinerarySkeleton />
    </PageContainer>
  );
}

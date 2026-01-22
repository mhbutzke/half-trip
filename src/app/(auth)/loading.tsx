import { FormSkeleton } from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthLoading() {
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-10 w-64" />
        <Skeleton className="mx-auto h-4 w-48" />
      </div>
      <div className="rounded-lg border bg-card p-6">
        <FormSkeleton fields={2} />
      </div>
      <div className="text-center">
        <Skeleton className="mx-auto h-4 w-56" />
      </div>
    </div>
  );
}

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export function BalanceSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Summary Card */}
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </Card>

      {/* Participant Balances */}
      <div>
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-7 w-24 mb-2" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Settlement Suggestions */}
      <div>
        <div className="flex items-start gap-2 mb-4">
          <div className="flex-1">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

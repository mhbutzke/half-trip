import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function BudgetLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </CardContent>
      </Card>

      {[1, 2, 3].map((item) => (
        <Card key={item}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="mt-3 h-2 w-full rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

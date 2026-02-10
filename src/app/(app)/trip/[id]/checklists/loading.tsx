import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChecklistsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      {[1, 2].map((item) => (
        <Card key={item}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="mt-2 h-2 w-full rounded-full" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3].map((sub) => (
              <div key={sub} className="flex items-center gap-3 px-2 py-1.5">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

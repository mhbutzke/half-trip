import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Plane } from 'lucide-react';

export default function TripsPage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Minhas Viagens</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova viagem
          </Button>
        </div>

        {/* Empty state - will be replaced with actual trips list in Step 1.7 */}
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Plane className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Nenhuma viagem ainda</CardTitle>
            <CardDescription>
              Crie sua primeira viagem para começar a planejar com seu grupo
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova viagem
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

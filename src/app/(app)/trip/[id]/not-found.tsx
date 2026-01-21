import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';

export default function TripNotFound() {
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <MapPin className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Viagem não encontrada</h1>
        <p className="mb-6 max-w-md text-muted-foreground">
          A viagem que você está procurando não existe ou você não tem permissão para acessá-la.
        </p>
        <Button asChild>
          <Link href="/trips">Voltar para minhas viagens</Link>
        </Button>
      </div>
    </PageContainer>
  );
}

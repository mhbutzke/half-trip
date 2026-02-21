import Link from 'next/link';
import { MapPin, ArrowLeft, Plus } from 'lucide-react';
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
        <p className="mb-2 max-w-md text-muted-foreground">
          Não conseguimos encontrar essa viagem. Ela pode ter sido removida ou o link pode estar
          incorreto.
        </p>
        <p className="mb-6 text-sm text-muted-foreground/70">
          Se você recebeu este link de alguém, peça para enviarem um novo convite.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/trips">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ver minhas viagens
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/trips">
              <Plus className="mr-2 h-4 w-4" />
              Criar nova viagem
            </Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

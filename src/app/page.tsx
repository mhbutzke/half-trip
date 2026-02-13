import Link from 'next/link';
import { Plane, Receipt, Users, MapPin, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { routes } from '@/lib/routes';

const features = [
  {
    icon: Plane,
    title: 'Crie a viagem',
    description: 'Defina destino, datas e o estilo da viagem.',
  },
  {
    icon: Users,
    title: 'Convide o grupo',
    description: 'Adicione amigos, casal, família ou qualquer grupo de viajantes.',
  },
  {
    icon: MapPin,
    title: 'Monte o roteiro',
    description: 'Organize dias, passeios, reservas e horários — todos veem a mesma versão.',
  },
  {
    icon: Receipt,
    title: 'Divida automaticamente',
    description: 'O Half Trip calcula quem deve pagar quem — de forma justa.',
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <PageContainer className="flex flex-1 flex-col">
        {/* Hero Section */}
        <section className="flex flex-1 flex-col items-center justify-center py-12 text-center md:py-24">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Planeje junto.{' '}
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Divida justo.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
            Viajar em grupo é incrível — organizar, nem tanto. O Half Trip resolve isso reunindo
            roteiro, despesas e pessoas em um único lugar.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href={routes.register()}>
                Começar agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={routes.login()}>Já tenho conta</Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t py-16 md:py-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Como funciona
            </h2>
            <p className="mt-4 text-muted-foreground">
              Em 4 passos simples, sua viagem em grupo fica organizada.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 text-7xl font-bold text-muted/20">
                    {index + 1}
                  </div>
                  <CardHeader>
                    <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t py-16 text-center md:py-24">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Sem planilhas. Sem confusão. Sem brigas.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Menos contas, mais histórias. Comece a planejar sua próxima viagem.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href={routes.register()}>
              Criar minha primeira viagem
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </PageContainer>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>A viagem é compartilhada. A organização também.</p>
      </footer>
    </div>
  );
}

import Link from 'next/link';
import { Plane, Receipt, Users, MapPin, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
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
      <main className="flex flex-1">
        <PageContainer className="flex flex-1 flex-col">
          {/* Hero Section */}
          <section className="relative flex flex-1 flex-col items-center justify-center py-12 text-center md:py-24">
            {/* Background dot grid */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
              style={{
                backgroundImage:
                  'radial-gradient(circle, var(--brand-deep-blue) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
              aria-hidden="true"
            />

            {/* Gradient glow */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/3 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15 blur-[100px] dark:opacity-10"
              style={{
                background:
                  'linear-gradient(135deg, var(--brand-ocean-cyan), var(--brand-sunset-coral))',
              }}
              aria-hidden="true"
            />

            <FadeIn direction="up" duration={600}>
              <h1 className="relative max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                Planeje junto.{' '}
                <span className="bg-gradient-to-r from-[var(--brand-sunset-coral)] to-[var(--brand-ocean-cyan)] bg-clip-text text-transparent">
                  Divida justo.
                </span>
              </h1>
            </FadeIn>

            <FadeIn direction="up" delay={150} duration={600}>
              <p className="relative mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
                Viajar em grupo é incrível — organizar, nem tanto. O Half Trip resolve isso reunindo
                roteiro, despesas e pessoas em um único lugar.
              </p>
            </FadeIn>

            <FadeIn direction="up" delay={300} duration={600}>
              <div className="relative mt-10 flex flex-col gap-4 sm:flex-row">
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
            </FadeIn>
          </section>

          {/* Features Section */}
          <section className="border-t py-16 md:py-24">
            <FadeIn direction="up">
              <div className="text-center">
                <p className="mb-3 text-label text-primary">Como funciona</p>
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Em 4 passos simples
                </h2>
                <p className="mt-4 text-muted-foreground">Sua viagem em grupo fica organizada.</p>
              </div>
            </FadeIn>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <FadeIn key={feature.title} direction="up" delay={index * 100}>
                    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:shadow-primary/10">
                      <div className="absolute -right-3 -top-3 text-7xl font-bold text-primary/[0.06] transition-colors group-hover:text-primary/[0.10]">
                        {index + 1}
                      </div>
                      <CardHeader>
                        <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/10 transition-all duration-300 group-hover:shadow-sm group-hover:shadow-primary/10 group-hover:ring-primary/25">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="leading-relaxed">
                          {feature.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </FadeIn>
                );
              })}
            </div>
          </section>

          {/* CTA Section */}
          <section className="relative overflow-hidden border-t py-16 text-center md:py-24">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent"
              aria-hidden="true"
            />
            <FadeIn direction="up">
              <h2 className="relative text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Sem planilhas. Sem confusão. Sem brigas.
              </h2>
              <p className="relative mt-4 text-muted-foreground">
                Menos contas, mais histórias. Comece a planejar sua próxima viagem.
              </p>
              <Button size="lg" className="relative mt-8" asChild>
                <Link href={routes.register()}>
                  Criar minha primeira viagem
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </FadeIn>
          </section>
        </PageContainer>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>A viagem é compartilhada. A organização também.</p>
      </footer>
    </div>
  );
}

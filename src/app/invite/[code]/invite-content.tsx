'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Loader2,
  MapPin,
  Calendar,
  Plane,
  CheckCircle,
  XCircle,
  Users,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { acceptInvite, type InviteDetailsResult } from '@/lib/supabase/invites';
import { parseDateOnly } from '@/lib/utils/date-only';
import { routes } from '@/lib/routes';

interface InviteContentProps {
  code: string;
  inviteDetails: InviteDetailsResult;
  isLoggedIn: boolean;
  currentUserName?: string;
}

export function InviteContent({
  code,
  inviteDetails,
  isLoggedIn,
  currentUserName,
}: InviteContentProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  // Invalid invite states
  if (!inviteDetails.valid) {
    return <InvalidInvite message={inviteDetails.error || 'Convite inválido'} />;
  }

  // Already a member
  if (inviteDetails.isAlreadyMember && inviteDetails.trip) {
    return <AlreadyMember tripId={inviteDetails.trip.id} tripName={inviteDetails.trip.name} />;
  }

  const { trip, invitedBy } = inviteDetails;

  if (!trip || !invitedBy) {
    return <InvalidInvite message="Dados do convite incompletos" />;
  }

  // Format dates
  const startDate = format(parseDateOnly(trip.start_date), "d 'de' MMMM", { locale: ptBR });
  const endDate = format(parseDateOnly(trip.end_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR });

  // Handle accept invite
  async function handleAccept() {
    setIsLoading(true);
    setError(null);

    const result = await acceptInvite(code);

    if (result.error) {
      // Special case: already a member
      if (result.tripId) {
        router.push(routes.trip.overview(result.tripId));
        return;
      }
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setAccepted(true);
    setIsLoading(false);

    // Redirect to trip after short delay
    setTimeout(() => {
      router.push(routes.trip.overview(result.tripId!));
    }, 1500);
  }

  // Success state
  if (accepted) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <CardTitle className="text-2xl">Pronto!</CardTitle>
          <CardDescription>Você agora faz parte da viagem</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">Redirecionando para a viagem...</p>
        </CardContent>
      </Card>
    );
  }

  // Logged in user - show accept button
  if (isLoggedIn) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Plane className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Convite para viagem</CardTitle>
          <CardDescription>
            {invitedBy.name} convidou você para participar de uma viagem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trip details card */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <h3 className="font-semibold">{trip.name}</h3>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{trip.destination}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {startDate} - {endDate}
                </span>
              </div>
            </div>
          </div>

          {/* Inviter info */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={invitedBy.avatar_url || undefined} alt={invitedBy.name} />
              <AvatarFallback>{invitedBy.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{invitedBy.name}</p>
              <p className="text-xs text-muted-foreground">enviou este convite</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button onClick={handleAccept} className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Users className="mr-2 h-4 w-4" />
            Participar da viagem
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Logado como <span className="font-medium">{currentUserName}</span>
          </p>
        </CardFooter>
      </Card>
    );
  }

  // Not logged in - show login/register options
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Plane className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Convite para viagem</CardTitle>
        <CardDescription>
          {invitedBy.name} convidou você para participar de uma viagem
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trip details card */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <h3 className="font-semibold">{trip.name}</h3>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{trip.destination}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {startDate} - {endDate}
              </span>
            </div>
          </div>
        </div>

        {/* Inviter info */}
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={invitedBy.avatar_url || undefined} alt={invitedBy.name} />
            <AvatarFallback>{invitedBy.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{invitedBy.name}</p>
            <p className="text-xs text-muted-foreground">enviou este convite</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-center text-sm text-muted-foreground">
            Entre ou crie uma conta para participar
          </p>
          <Link href={routes.login(routes.invite(code))}>
            <Button className="w-full">Entrar</Button>
          </Link>
          <Link href={routes.register(routes.invite(code))}>
            <Button variant="outline" className="w-full">
              Criar conta
            </Button>
          </Link>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href={routes.home()} className="text-sm text-muted-foreground hover:text-primary">
          Voltar para o início
        </Link>
      </CardFooter>
    </Card>
  );
}

function InvalidInvite({ message }: { message: string }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <CardTitle className="text-2xl">Convite inválido</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground">
          Verifique se o link está correto ou solicite um novo convite ao organizador da viagem.
        </p>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href={routes.home()}>
          <Button variant="outline">Ir para o início</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function AlreadyMember({ tripId, tripName }: { tripId: string; tripName: string }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Você já participa!</CardTitle>
        <CardDescription>Você já é membro da viagem &quot;{tripName}&quot;</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Link href={routes.trip.overview(tripId)}>
          <Button className="w-full">
            <Plane className="mr-2 h-4 w-4" />
            Ver viagem
          </Button>
        </Link>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href={routes.trips()} className="text-sm text-muted-foreground hover:text-primary">
          Ver todas as viagens
        </Link>
      </CardFooter>
    </Card>
  );
}

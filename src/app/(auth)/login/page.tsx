'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';

import { loginSchema, type LoginInput } from '@/lib/validation/auth-schemas';
import { signIn, resendConfirmation } from '@/lib/supabase/auth';
import { routes } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';

function LoginFormSkeleton() {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/95 shadow-lg shadow-primary/5 backdrop-blur-sm">
      <div
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/80 to-[var(--brand-sunset-coral)]"
        aria-hidden="true"
      />
      <CardHeader className="space-y-2 text-center">
        <Skeleton className="mx-auto h-8 w-24" />
        <Skeleton className="mx-auto h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
      <CardFooter className="justify-center">
        <Skeleton className="h-4 w-48" />
      </CardFooter>
    </Card>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || routes.trips();
  const authError = searchParams.get('error');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    authError === 'auth_error' ? 'Ocorreu um erro na autenticação. Tente novamente.' : null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // Build register link with redirect param if present
  const registerHref =
    redirectTo !== routes.trips() ? routes.register(redirectTo) : routes.register();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    setError(null);

    const result = await signIn(data.email, data.password);

    if (result.error) {
      setError(result.error);
      setNeedsConfirmation(result.requiresConfirmation ?? false);
      setIsLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/95 shadow-lg shadow-primary/5 backdrop-blur-sm">
      <div
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/80 to-[var(--brand-sunset-coral)]"
        aria-hidden="true"
      />
      <CardHeader className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold leading-none" data-slot="card-title">
          Entrar
        </h1>
        <CardDescription className="mx-auto max-w-[28ch] text-sm leading-relaxed text-foreground/70">
          Entre com sua conta para acessar suas viagens
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-1">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
                {needsConfirmation && (
                  <>
                    {' '}
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={async () => {
                        const email = form.getValues('email');
                        if (!email) return;
                        setIsResending(true);
                        await resendConfirmation(email);
                        setError('Email de confirmação reenviado! Verifique sua caixa de entrada.');
                        setNeedsConfirmation(false);
                        setIsResending(false);
                      }}
                      disabled={isResending}
                    >
                      {isResending ? 'Reenviando...' : 'Reenviar email de confirmação'}
                    </button>
                  </>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      autoComplete="email"
                      className="h-11"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Senha</FormLabel>
                    <Link
                      href={routes.forgotPassword()}
                      className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="********"
                        autoComplete="current-password"
                        className="h-11 pr-12"
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full min-w-[44px] px-3 text-muted-foreground hover:bg-transparent hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        ) : (
                          <Eye className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="h-11 w-full font-semibold shadow-sm"
              loading={isLoading}
            >
              Entrar
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border/60 pt-5">
        <p className="text-sm text-foreground/70">
          Ainda não tem conta?{' '}
          <Link
            href={registerHref}
            className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring"
            style={{ color: 'var(--brand-ocean-cyan)' }}
          >
            Criar conta
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

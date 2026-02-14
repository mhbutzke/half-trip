'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle } from 'lucide-react';

import { registerSchema, type RegisterInput } from '@/lib/validation/auth-schemas';
import { signUp, resendConfirmationEmail } from '@/lib/supabase/auth';
import { routes } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';

function RegisterFormSkeleton() {
  return (
    <Card>
      <CardHeader className="text-center">
        <Skeleton className="mx-auto h-8 w-32" />
        <Skeleton className="mx-auto h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-11 w-full" />
      </CardContent>
      <CardFooter className="justify-center">
        <Skeleton className="h-4 w-48" />
      </CardFooter>
    </Card>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredName, setRegisteredName] = useState('');

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(data: RegisterInput) {
    setIsLoading(true);
    setError(null);

    const result = await signUp(data.name, data.email, data.password, redirectTo || undefined);

    if (result.success) {
      setRegisteredEmail(data.email);
      setRegisteredName(data.name);
      if (result.emailError) {
        setEmailError(true);
      }
      setSuccess(true);
      setIsLoading(false);
      return;
    }

    if (result.error) {
      setError(result.error);
    }
    setIsLoading(false);
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    setResendSuccess(false);

    const result = await resendConfirmationEmail(registeredEmail, registeredName);

    if (result.success) {
      setResendSuccess(true);
      setEmailError(false);
    } else {
      setError(result.error || 'Erro ao reenviar email.');
    }
    setResending(false);
  }

  // Build login link with redirect param if present
  const loginHref = redirectTo ? routes.login(redirectTo) : routes.login();

  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Conta criada!</CardTitle>
          {emailError ? (
            <CardDescription>
              Sua conta foi criada, mas houve um erro ao enviar o email de confirmação. Clique
              abaixo para reenviar.
            </CardDescription>
          ) : resendSuccess ? (
            <CardDescription>
              Email de confirmação reenviado! Verifique sua caixa de entrada e clique no link para
              ativar sua conta.
            </CardDescription>
          ) : (
            <CardDescription>
              Enviamos um email de confirmação para você. Por favor, verifique sua caixa de entrada
              e clique no link para ativar sua conta.
            </CardDescription>
          )}
          {error && (
            <div className="mt-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardHeader>
        <CardFooter className="flex justify-center gap-2">
          {emailError && (
            <Button onClick={handleResend} loading={resending}>
              Reenviar email
            </Button>
          )}
          <Link href={loginHref}>
            <Button variant="outline">Voltar para o login</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Criar conta</CardTitle>
        <CardDescription>Crie sua conta para planejar viagens em grupo</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Seu nome"
                      autoComplete="name"
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      autoComplete="email"
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
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
                      autoComplete="new-password"
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
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
                      autoComplete="new-password"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" loading={isLoading}>
              Criar conta
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link href={loginHref} className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFormSkeleton />}>
      <RegisterForm />
    </Suspense>
  );
}

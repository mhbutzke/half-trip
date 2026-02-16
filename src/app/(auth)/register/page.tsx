'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      // If email already exists, scroll to error and suggest login
      if (result.error.includes('já está cadastrado')) {
        form.setError('email', {
          type: 'manual',
          message: 'Este email já possui uma conta',
        });
      }
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-in zoom-in duration-300">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Conta criada com sucesso! 🎉</CardTitle>
          {emailError ? (
            <CardDescription className="mt-2">
              Sua conta foi criada, mas houve um erro ao enviar o email de confirmação. Clique
              abaixo para tentar novamente.
            </CardDescription>
          ) : resendSuccess ? (
            <CardDescription className="mt-2">
              Email de confirmação reenviado! Verifique sua caixa de entrada (e a pasta de spam) e
              clique no link para ativar sua conta.
            </CardDescription>
          ) : (
            <CardDescription className="mt-2">
              Enviamos um email de confirmação para <strong>{registeredEmail}</strong>.
              <br />
              Verifique sua caixa de entrada (e a pasta de spam) e clique no link para ativar sua
              conta e começar a planejar suas viagens!
            </CardDescription>
          )}
          {error && (
            <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardHeader>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {emailError && (
            <Button onClick={handleResend} loading={resending}>
              Reenviar email
            </Button>
          )}
          <Link href={loginHref}>
            <Button variant={emailError ? 'outline' : 'default'}>
              {emailError ? 'Voltar para o login' : 'Ir para o login'}
            </Button>
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
                {error.includes('já está cadastrado') && (
                  <>
                    {' '}
                    <Link href={loginHref} className="font-medium underline">
                      Fazer login
                    </Link>
                    {' ou '}
                    <Link href={routes.forgotPassword()} className="font-medium underline">
                      recuperar senha
                    </Link>
                    .
                  </>
                )}
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
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="********"
                        autoComplete="new-password"
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full min-w-[44px] px-3 hover:bg-transparent"
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

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="********"
                        autoComplete="new-password"
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full min-w-[44px] px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={
                          showConfirmPassword
                            ? 'Ocultar confirmação de senha'
                            : 'Mostrar confirmação de senha'
                        }
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
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

            <Button type="submit" className="w-full" loading={isLoading}>
              Criar conta
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link
            href={loginHref}
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
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

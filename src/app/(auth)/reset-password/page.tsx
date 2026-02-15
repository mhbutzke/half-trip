'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';

import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validation/auth-schemas';
import { resetPassword } from '@/lib/supabase/auth';
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(data: ResetPasswordInput) {
    setIsLoading(true);
    setError(null);

    const result = await resetPassword(data.password);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-in zoom-in duration-300">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Senha atualizada! 🔐</CardTitle>
          <CardDescription className="mt-2">
            Sua senha foi redefinida com sucesso.
            <br />
            Agora você pode fazer login com sua nova senha e começar a planejar suas viagens!
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button onClick={() => router.push(routes.login())}>Ir para o login</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Redefinir senha</CardTitle>
        <CardDescription>Digite sua nova senha abaixo</CardDescription>
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova senha</FormLabel>
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
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
                  <FormLabel>Confirmar nova senha</FormLabel>
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
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" loading={isLoading}>
              Redefinir senha
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href={routes.login()} className="text-sm text-muted-foreground hover:text-primary">
          Voltar para o login
        </Link>
      </CardFooter>
    </Card>
  );
}

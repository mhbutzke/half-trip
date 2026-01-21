'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Loader2, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  profileSchema,
  type ProfileInput,
  validateAvatarFile,
} from '@/lib/validation/profile-schemas';
import { updateProfile, uploadAvatar, removeAvatar } from '@/lib/supabase/profile';
import type { User as UserType } from '@/types/database';

interface ProfileFormProps {
  user: UserType;
  onUpdate?: () => void;
}

export function ProfileForm({ user, onUpdate }: ProfileFormProps) {
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
    },
  });

  const onSubmit = async (data: ProfileInput) => {
    setIsUpdatingProfile(true);

    try {
      const result = await updateProfile(data.name);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Perfil atualizado com sucesso!');
      onUpdate?.();
    } catch {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateAvatarFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const result = await uploadAvatar(formData);

      if (result.error) {
        toast.error(result.error);
        setAvatarPreview(null);
        return;
      }

      toast.success('Avatar atualizado com sucesso!');
      onUpdate?.();
    } catch {
      toast.error('Erro ao enviar avatar');
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true);

    try {
      const result = await removeAvatar();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setAvatarPreview(null);
      toast.success('Avatar removido com sucesso!');
      onUpdate?.();
    } catch {
      toast.error('Erro ao remover avatar');
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const currentAvatarUrl = avatarPreview || user.avatar_url;
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage src={currentAvatarUrl || undefined} alt={user.name} />
            <AvatarFallback className="text-2xl">
              {initials || <User className="h-10 w-10" />}
            </AvatarFallback>
          </Avatar>

          {isUploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 sm:items-start">
          <p className="text-sm text-muted-foreground">JPEG, PNG, WebP ou GIF. Máximo 5MB.</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              <Camera className="mr-2 h-4 w-4" />
              {currentAvatarUrl ? 'Alterar' : 'Adicionar'}
            </Button>

            {currentAvatarUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={isRemovingAvatar || isUploadingAvatar}
                className="text-destructive hover:text-destructive"
              >
                {isRemovingAvatar ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Remover
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Profile Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Seu nome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={user.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
          </div>

          <Button type="submit" loading={isUpdatingProfile} disabled={!form.formState.isDirty}>
            Salvar alterações
          </Button>
        </form>
      </Form>
    </div>
  );
}

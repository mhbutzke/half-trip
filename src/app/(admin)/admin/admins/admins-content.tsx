'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Shield, ShieldCheck, Plus, MoreHorizontal, UserCog, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { addAdmin, removeAdmin, updateAdminRole } from '@/lib/supabase/admin-actions';
import type { AdminUser } from '@/types/admin';
import type { SystemAdminRole } from '@/types/database';

interface AdminsContentProps {
  admins: AdminUser[];
  adminRole: SystemAdminRole;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function AdminsContent({ admins, adminRole }: AdminsContentProps) {
  const router = useRouter();
  const isSuperAdmin = adminRole === 'super_admin';

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'super_admin'>('admin');
  const [adding, setAdding] = useState(false);

  // Remove dialog state
  const [removeTarget, setRemoveTarget] = useState<AdminUser | null>(null);
  const [removing, setRemoving] = useState(false);

  // Role change state
  const [roleChangeTarget, setRoleChangeTarget] = useState<AdminUser | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  async function handleAddAdmin() {
    if (!newEmail.trim()) {
      toast.error('Informe o email do usuário');
      return;
    }

    setAdding(true);
    try {
      const result = await addAdmin(newEmail, newRole);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Administrador adicionado com sucesso');
        setAddDialogOpen(false);
        setNewEmail('');
        setNewRole('admin');
        router.refresh();
      }
    } catch {
      toast.error('Erro ao adicionar administrador');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveAdmin() {
    if (!removeTarget) return;

    setRemoving(true);
    try {
      const result = await removeAdmin(removeTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Administrador removido com sucesso');
        router.refresh();
      }
    } catch {
      toast.error('Erro ao remover administrador');
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  }

  async function handleRoleChange(admin: AdminUser) {
    setChangingRole(true);
    setRoleChangeTarget(admin);
    const newAdminRole = admin.role === 'super_admin' ? 'admin' : 'super_admin';

    try {
      const result = await updateAdminRole(admin.id, newAdminRole);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Role atualizado com sucesso');
        router.refresh();
      }
    } catch {
      toast.error('Erro ao atualizar role');
    } finally {
      setChangingRole(false);
      setRoleChangeTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Administradores</h2>
          <p className="text-sm text-muted-foreground">Gerencie os administradores do sistema</p>
        </div>

        {isSuperAdmin && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Adicionar Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Administrador</DialogTitle>
                <DialogDescription>
                  Insira o email de um usuário existente para conceder acesso administrativo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email do Usuário</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-role">Role</Label>
                  <Select
                    value={newRole}
                    onValueChange={(val) => setNewRole(val as 'admin' | 'super_admin')}
                  >
                    <SelectTrigger id="admin-role">
                      <SelectValue placeholder="Selecione o role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={adding}>
                  Cancelar
                </Button>
                <Button onClick={handleAddAdmin} disabled={adding}>
                  {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Administradores</CardTitle>
          <CardDescription>
            {admins.length} administrador{admins.length !== 1 ? 'es' : ''} no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum administrador encontrado.
            </p>
          ) : (
            <div className="space-y-1">
              {/* Header - hidden on mobile */}
              <div className="hidden grid-cols-[auto_1fr_1fr_auto_1fr_auto_auto] items-center gap-4 border-b px-4 py-2 text-sm font-medium text-muted-foreground md:grid">
                <span className="w-10" />
                <span>Nome</span>
                <span>Email</span>
                <span>Role</span>
                <span>Concedido por</span>
                <span>Data</span>
                {isSuperAdmin && <span className="w-8" />}
              </div>

              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 md:grid md:grid-cols-[auto_1fr_1fr_auto_1fr_auto_auto] md:items-center md:gap-4 md:border-0 md:border-b md:rounded-none md:last:border-b-0"
                >
                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={admin.avatar_url ?? undefined} alt={admin.name} />
                    <AvatarFallback>{getInitials(admin.name)}</AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{admin.name}</p>
                    <p className="truncate text-sm text-muted-foreground md:hidden">
                      {admin.email}
                    </p>
                  </div>

                  {/* Email - desktop only */}
                  <p className="hidden truncate text-sm text-muted-foreground md:block">
                    {admin.email}
                  </p>

                  {/* Role badge */}
                  <div>
                    {admin.role === 'super_admin' ? (
                      <Badge variant="default" className="whitespace-nowrap">
                        <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
                        Super Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="whitespace-nowrap">
                        <Shield className="mr-1 h-3 w-3" aria-hidden="true" />
                        Admin
                      </Badge>
                    )}
                  </div>

                  {/* Granted by */}
                  <p className="text-sm text-muted-foreground">
                    <span className="md:hidden font-medium">Concedido por: </span>
                    {admin.grantedByName ?? 'Sistema'}
                  </p>

                  {/* Date */}
                  <p className="whitespace-nowrap text-sm text-muted-foreground">
                    <span className="md:hidden font-medium">Data: </span>
                    {formatDate(admin.granted_at)}
                  </p>

                  {/* Actions */}
                  {isSuperAdmin && (
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Ações para ${admin.name}`}
                            disabled={changingRole && roleChangeTarget?.id === admin.id}
                          >
                            {changingRole && roleChangeTarget?.id === admin.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRoleChange(admin)}>
                            <UserCog className="mr-2 h-4 w-4" aria-hidden="true" />
                            Alterar para {admin.role === 'super_admin' ? 'Admin' : 'Super Admin'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setRemoveTarget(admin)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Administrador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{removeTarget?.name}</strong> (
              {removeTarget?.email}) como administrador? Esta ação pode ser revertida adicionando
              novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAdmin}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
